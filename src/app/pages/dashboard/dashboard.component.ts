import { Component, OnInit, OnDestroy } from '@angular/core';
import { BluetoothService } from '../../services/bluetooth.service';
import { DataLoggerService } from '../../services/data-logger.service';
import { SensorData, AppBluetoothDevice } from '../../models/sensor-data.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  isConnected = false;
  connectedDevice: AppBluetoothDevice | null = null;
  currentData: SensorData | null = null;
  sensorDataHistory: SensorData[] = [];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private bluetoothService: BluetoothService,
    private dataLoggerService: DataLoggerService
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.bluetoothService.isConnected$.subscribe(connected => {
        this.isConnected = connected;
      }),
      
      this.bluetoothService.connectedDevice$.subscribe(device => {
        this.connectedDevice = device;
      }),
      
      this.bluetoothService.dataReceived$.subscribe(data => {
        this.currentData = data;
        this.dataLoggerService.addSensorData(data);
        this.updateDataHistory();
      })
    );
    
    // Charger les données existantes
    this.updateDataHistory();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateDataHistory(): void {
    this.sensorDataHistory = this.dataLoggerService.getAllSensorData();
  }

  exportData(): void {
    try {
      this.dataLoggerService.exportToCsv();
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  }

  clearData(): void {
    if (confirm('Êtes-vous sûr de vouloir effacer toutes les données ?')) {
      this.dataLoggerService.clearAllData();
      this.updateDataHistory();
    }
  }
}
