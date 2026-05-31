import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AppBluetoothDevice, DeviceInfo, SensorData } from '../models/sensor-data.interface';

@Injectable({
  providedIn: 'root'
})
export class BluetoothService {
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private currentDeviceSubject = new BehaviorSubject<DeviceInfo | null>(null);
  private connectedDeviceSubject = new BehaviorSubject<AppBluetoothDevice | null>(null);
  private dataReceivedSubject = new Subject<SensorData>();
  private connectionErrorSubject = new Subject<string>();

  // Observables publics
  public isConnected$ = this.isConnectedSubject.asObservable();
  public currentDevice$ = this.currentDeviceSubject.asObservable();
  public connectedDevice$ = this.connectedDeviceSubject.asObservable();
  public dataReceived$ = this.dataReceivedSubject.asObservable();
  public connectionError$ = this.connectionErrorSubject.asObservable();

  // UUIDs GATT - doivent correspondre EXACTEMENT au firmware ESP32 (ble_manager.h)
  // Web Bluetooth exige des UUIDs en minuscules
  private serviceUuid = '12345678-1234-1234-1234-123456789abc';
  private characteristicDataUuid = '87654321-4321-4321-4321-cba987654321';
  // Note : la caractéristique STATUS n'existe pas encore dans le firmware ESP32 actuel

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private dataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnecting = false;

  constructor() { }

  /**
   * Vérifier si Web Bluetooth est disponible
   */
  isBluetoothAvailable(): boolean {
    return 'bluetooth' in navigator;
  }

  /**
   * Se connecter à un dispositif (alias pour scanAndConnect)
   */
  async connectToDevice(): Promise<void> {
    return this.scanAndConnect();
  }

  /**
   * Annuler la connexion en cours
   */
  cancelConnection(): void {
    this.isConnecting = false;
    if (this.device && this.server) {
      this.server.disconnect();
    }
  }

  /**
   * Scanner et se connecter à un dispositif
   */
  async scanAndConnect(): Promise<void> {
    if (!this.isBluetoothAvailable()) {
      const error = 'Web Bluetooth n\'est pas supporté sur ce navigateur';
      this.connectionErrorSubject.next(error);
      throw new Error(error);
    }

    if (this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      // Scanner les dispositifs.
      // Le filtre 'services' est retiré intentionnellement : l'ESP32 n'advertise
      // pas son UUID de service, ce qui causerait "No Services matching UUID found".
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'ChiroLogger' }
        ],
        optionalServices: [this.serviceUuid]
      });
    
      // Se connecter au dispositif
      if (this.device.gatt) {
        this.server = await this.device.gatt.connect();
        this.service = await this.server.getPrimaryService(this.serviceUuid);

        // Seule la caractéristique DATA existe dans le firmware ESP32 actuel
        this.dataCharacteristic = await this.service.getCharacteristic(this.characteristicDataUuid);

        // S'abonner aux notifications (NOTIFY) avant de déclencher le READ
        await this.dataCharacteristic.startNotifications();
        this.dataCharacteristic.addEventListener('characteristicvaluechanged',
          this.handleDataReceived.bind(this));

        // Déclencher ESP_GATTS_READ_EVT côté ESP32 :
        // c'est le READ qui provoque l'envoi des données via send_indicate()
        await this.dataCharacteristic.readValue();

        // Mettre à jour l'état
        const deviceInfo: DeviceInfo = {
          id: this.device.id,
          name: this.device.name || 'ChiroLogger',
          macAddress: 'Unknown',
          isConnected: true,
          lastSync: new Date()
        };

        const appDevice: AppBluetoothDevice = {
          id: this.device.id,
          name: this.device.name || 'ChiroLogger',
          rssi: undefined
        };
      
        this.currentDeviceSubject.next(deviceInfo);
        this.connectedDeviceSubject.next(appDevice);
        this.isConnectedSubject.next(true);
        this.isConnecting = false;

        console.log('Connecté au datalogger:', deviceInfo);
      }
    } catch (error) {
      this.isConnecting = false;
      const errorMessage = error instanceof Error ? error.message : 'Erreur de connexion inconnue';
      this.connectionErrorSubject.next(errorMessage);
      console.error('Erreur de connexion Bluetooth:', error);
      throw error;
    }
  }

  /**
   * Se déconnecter du dispositif
   */
  async disconnect(): Promise<void> {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }

    this.device = null;
    this.server = null;
    this.service = null;
    this.dataCharacteristic = null;
    this.isConnecting = false;

    this.isConnectedSubject.next(false);
    this.currentDeviceSubject.next(null);
    this.connectedDeviceSubject.next(null);
  }

  /**
   * Traiter les données reçues via NOTIFY (déclenchées par un READ).
   *
   * Format CSV envoyé par le firmware ESP32 (ble_manager.c) :
   * Bloc multi-lignes : "ID,DateTime,Temperature_C,Humidity_%\n1,1672531200,18.5,85.0\n..."
   *
   * La première ligne est le header (ignorée).
   * Colonnes : ID, DateTime (timestamp Unix ou ISO), Temperature_C, Humidity_%
   */
  private handleDataReceived(event: Event): void {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (!value) return;

    const decoder = new TextDecoder();
    const rawText = decoder.decode(value);
    console.log('Données BLE reçues brutes:', rawText);

    const lines = rawText.trim().split('\n');

    // Ignorer la ligne d'en-tête CSV
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Format : ID,DateTime,Temperature_C,Humidity_%[,Battery_%,Battery_V]
        const parts = line.split(',');
        if (parts.length < 4) {
          console.warn('Ligne CSV invalide (< 4 colonnes):', line);
          continue;
        }

        // DateTime peut être un timestamp Unix (secondes) ou une chaîne ISO
        const rawDate = parts[1].trim();
        const dateValue = /^\d+$/.test(rawDate)
          ? new Date(parseInt(rawDate, 10) * 1000)
          : new Date(rawDate);

        const sensorData: SensorData = {
          id: parseInt(parts[0]),
          timestamp: dateValue,
          temperature: parseFloat(parts[2]),
          humidity: parseFloat(parts[3]),
          batteryPercent: parts.length > 4 ? parseFloat(parts[4]) : undefined,
          batteryVoltage: parts.length > 5 ? parseFloat(parts[5]) : undefined
        };

        this.dataReceivedSubject.next(sensorData);
      } catch (error) {
        console.error('Erreur de parsing ligne CSV:', line, error);
      }
    }
  }

  /**
   * Déclencher manuellement un nouveau téléchargement de données.
   * Le firmware ESP32 envoie les données en réponse à un READ (ESP_GATTS_READ_EVT).
   */
  async requestDataDownload(): Promise<void> {
    if (!this.dataCharacteristic) {
      throw new Error('Pas de connexion active');
    }
    await this.dataCharacteristic.readValue();
  }
}