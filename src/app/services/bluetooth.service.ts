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
  private transferProgressSubject = new BehaviorSubject<number>(0);
  private transferStartSubject = new Subject<void>();
  private transferCountSubject = new BehaviorSubject<{received: number, total: number}>({received: 0, total: 0});

  // Observables publics
  public isConnected$ = this.isConnectedSubject.asObservable();
  public currentDevice$ = this.currentDeviceSubject.asObservable();
  public connectedDevice$ = this.connectedDeviceSubject.asObservable();
  public dataReceived$ = this.dataReceivedSubject.asObservable();
  public connectionError$ = this.connectionErrorSubject.asObservable();
  /** Progression du transfert CSV : 0–100. Émet 0 sur META, 100 sur EOF. */
  public transferProgress$ = this.transferProgressSubject.asObservable();
  /** Émet une fois au début de chaque transfert (réception de ###META###). */
  public transferStart$ = this.transferStartSubject.asObservable();
  /** Compteur en temps réel : lignes reçues et total attendu. */
  public transferCount$ = this.transferCountSubject.asObservable();

  // UUIDs GATT - correspondent EXACTEMENT au firmware ESP32 (ble_manager.h)
  // Web Bluetooth exige des UUIDs en minuscules
  private serviceUuid            = '12345678-1234-1234-1234-123456789abc';
  private characteristicDataUuid = '87654321-4321-4321-4321-cba987654321'; // READ + NOTIFY
  private characteristicStatusUuid = '11111111-2222-3333-4444-555555555555'; // READ + WRITE

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private dataCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private statusCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnecting = false;
  private totalLines = 0;
  private receivedLines = 0;

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
        // Gérer la déconnexion inattendue (perte de signal, ESP32 éteint, etc.)
        this.device.addEventListener('gattserverdisconnected', () => {
          console.warn('Déconnexion BLE inattendue');
          this.device = null;
          this.server = null;
          this.service = null;
          this.dataCharacteristic = null;
          this.statusCharacteristic = null;
          this.isConnecting = false;
          this.isConnectedSubject.next(false);
          this.currentDeviceSubject.next(null);
          this.connectedDeviceSubject.next(null);
        });

        this.server = await this.device.gatt.connect();
        this.service = await this.server.getPrimaryService(this.serviceUuid);

        // Caractéristique DATA : READ + NOTIFY
        this.dataCharacteristic = await this.service.getCharacteristic(this.characteristicDataUuid);

        // Caractéristique STATUS : READ + WRITE
        this.statusCharacteristic = await this.service.getCharacteristic(this.characteristicStatusUuid);

        // Lire le statut initial — l'ESP32 répond "READY"
        const statusValue = await this.statusCharacteristic.readValue();
        console.log('Statut ESP32:', new TextDecoder().decode(statusValue));

        // S'abonner aux notifications NOTIFY avant de déclencher le READ
        await this.dataCharacteristic.startNotifications();
        this.dataCharacteristic.addEventListener('characteristicvaluechanged',
          this.handleDataReceived.bind(this));

        // Déclencher ESP_GATTS_READ_EVT côté ESP32 :
        // c'est le READ qui provoque l'envoi des données via send_indicate()
        // ⚠️ NE PAS appeler readValue() ici — le dashboard le fera à l'ouverture.
        // Un appel ici + un appel dans ngOnInit() provoque un double téléchargement.

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
    this.statusCharacteristic = null;
    this.isConnecting = false;

    this.isConnectedSubject.next(false);
    this.currentDeviceSubject.next(null);
    this.connectedDeviceSubject.next(null);
  }

  /**
   * Traiter les paquets NOTIFY du firmware ESP32.
   *
   * Nouveau protocole (un paquet par NOTIFY) :
   *   ###META:lines=N###   → début de transfert, N lignes attendues
   *   ID,DateTime,...      → en-tête CSV (ignoré)
   *   1,2024-01-15,...     → ligne de données
   *   ###EOF###            → fin de transfert
   */
  private handleDataReceived(event: Event): void {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    const rawText = new TextDecoder().decode(target.value).trim();
    if (!rawText) return;

    console.log('BLE NOTIFY:', rawText);

    // --- Métadonnées : début d'un nouveau transfert ---
    if (rawText.startsWith('###META:lines=')) {
      this.totalLines = parseInt(rawText.replace('###META:lines=', '').replace('###', ''), 10);
      this.receivedLines = 0;
      this.transferProgressSubject.next(0);
      this.transferCountSubject.next({received: 0, total: this.totalLines});
      this.transferStartSubject.next(); // le dashboard réinitialise son tableau
      return;
    }

    // --- En-tête CSV ---
    if (rawText.startsWith('ID,')) return;

    // --- Marqueur de fin ---
    if (rawText.startsWith('###EOF###')) {
      this.transferProgressSubject.next(100);
      return;
    }

    // --- Ligne de données CSV ---
    try {
      const parts = rawText.split(',');
      if (parts.length < 4) {
        console.warn('Ligne CSV invalide (< 4 colonnes):', rawText);
        return;
      }

      const sensorData: SensorData = {
        id:             parseInt(parts[0].trim(), 10),
        timestamp:      new Date(parts[1].trim()),
        temperature:    parseFloat(parts[2].trim()),
        humidity:       parseFloat(parts[3].trim()),
        batteryPercent: parts.length > 4 ? parseFloat(parts[4].trim()) : undefined,
        batteryVoltage: parts.length > 5 ? parseFloat(parts[5].trim()) : undefined
      };

      this.receivedLines++;
      if (this.totalLines > 0) {
        this.transferProgressSubject.next(
          Math.min(99, Math.round((this.receivedLines / this.totalLines) * 100))
        );
      }
      this.transferCountSubject.next({received: this.receivedLines, total: this.totalLines});

      this.dataReceivedSubject.next(sensorData);
    } catch (error) {
      console.error('Erreur parsing CSV:', rawText, error);
    }
  }

  /**
   * Envoyer une commande à l'ESP32 via la caractéristique STATUS (WRITE).
   * Ex. : sendCommand('DOWNLOAD_ALL'), sendCommand('CLEAR_DATA')
   */
  async sendCommand(command: string): Promise<void> {
    if (!this.statusCharacteristic) {
      throw new Error('Pas de connexion active');
    }
    const data = new TextEncoder().encode(command);
    await this.statusCharacteristic.writeValue(data);
    console.log('Commande envoyée:', command);
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