import { Component, OnInit, OnDestroy } from '@angular/core';
import { BluetoothService } from '../../services/bluetooth.service';
import { AppBluetoothDevice } from '../../models/sensor-data.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.scss']
})
export class ConnectionComponent implements OnInit, OnDestroy {
  isConnected = false;
  isConnecting = false;
  isBluetoothAvailable = false;
  connectedDevice: AppBluetoothDevice | null = null;
  errorMessage: string | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(private bluetoothService: BluetoothService) {}

  ngOnInit(): void {
    this.isBluetoothAvailable = this.bluetoothService.isBluetoothAvailable();
    
    this.subscriptions.push(
      this.bluetoothService.isConnected$.subscribe(connected => {
        this.isConnected = connected;
        this.isConnecting = false;
      }),
      
      this.bluetoothService.connectedDevice$.subscribe(device => {
        this.connectedDevice = device;
      }),
      
      this.bluetoothService.connectionError$.subscribe(error => {
        this.errorMessage = error;
        this.isConnecting = false;
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async connect(): Promise<void> {
    if (!this.isBluetoothAvailable) {
      this.errorMessage = 'Bluetooth non disponible sur ce navigateur';
      return;
    }

    this.isConnecting = true;
    this.errorMessage = null;

    try {
      await this.bluetoothService.connectToDevice();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Erreur de connexion';
      this.isConnecting = false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.bluetoothService.disconnect();
      this.errorMessage = null;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Erreur de déconnexion';
    }
  }

  cancelConnection(): void {
    this.isConnecting = false;
    this.bluetoothService.cancelConnection();
  }
}
