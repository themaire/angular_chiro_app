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

  // Service UUID pour le datalogger ESP32
  private serviceUuid = '12345678-1234-1234-1234-123456789abc';
  private characteristicUuid = '87654321-4321-4321-4321-cba987654321';

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
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
      // Scanner les dispositifs
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'ChiroLogger' },
          { services: [this.serviceUuid] }
        ],
        optionalServices: [this.serviceUuid]
      });

      // Se connecter au dispositif
      if (this.device.gatt) {
        this.server = await this.device.gatt.connect();
        this.service = await this.server.getPrimaryService(this.serviceUuid);
        this.characteristic = await this.service.getCharacteristic(this.characteristicUuid);

        // Écouter les notifications
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', 
          this.handleDataReceived.bind(this));

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
          rssi: undefined // Non disponible via Web Bluetooth
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
    this.characteristic = null;
    this.isConnecting = false;

    this.isConnectedSubject.next(false);
    this.currentDeviceSubject.next(null);
    this.connectedDeviceSubject.next(null);
  }

  /**
   * Envoyer une commande au datalogger
   */
  async sendCommand(command: string): Promise<void> {
    if (!this.characteristic) {
      throw new Error('Pas de connexion active');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(command);
    await this.characteristic.writeValue(data);
  }

  /**
   * Traiter les données reçues
   */
  private handleDataReceived(event: Event): void {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    if (value) {
      const decoder = new TextDecoder();
      const csvLine = decoder.decode(value);
      
      try {
        // Parser une ligne CSV: timestamp,temperature,humidity,pressure,battery
        const parts = csvLine.trim().split(',');
        if (parts.length >= 5) {
          const sensorData: SensorData = {
            timestamp: new Date(parts[0]),
            temperature: parseFloat(parts[1]),
            humidity: parseFloat(parts[2]),
            pressure: parseFloat(parts[3]),
            batteryVoltage: parseFloat(parts[4])
          };

          this.dataReceivedSubject.next(sensorData);
        }
      } catch (error) {
        console.error('Erreur de parsing des données:', error);
      }
    }
  }

  /**
   * Demander le téléchargement de toutes les données
   */
  async requestDataDownload(): Promise<void> {
    await this.sendCommand('DOWNLOAD_ALL');
  }

  /**
   * Demander l'état de la batterie
   */
  async requestBatteryStatus(): Promise<void> {
    await this.sendCommand('BATTERY_STATUS');
  }

  /**
   * Effacer les données du datalogger
   */
  async clearData(): Promise<void> {
    await this.sendCommand('CLEAR_DATA');
  }
}
