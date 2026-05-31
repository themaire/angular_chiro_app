import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BluetoothService } from '../../services/bluetooth.service';
import { DataLoggerService } from '../../services/data-logger.service';
import { SensorData, AppBluetoothDevice } from '../../models/sensor-data.interface';
import { Observable, Subscription } from 'rxjs';

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
  progress$: Observable<number>;
  transferCount$: Observable<{received: number, total: number}>;
  isWaitingForData = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private bluetoothService: BluetoothService,
    private dataLoggerService: DataLoggerService,
    private router: Router
  ) {
    this.progress$ = this.bluetoothService.transferProgress$;
    this.transferCount$ = this.bluetoothService.transferCount$;
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.bluetoothService.isConnected$.subscribe(connected => {
        this.isConnected = connected;
        // Déconnexion inattendue (coupure BLE) → retour à l'accueil
        if (!connected) {
          this.router.navigate(['/']);
        }
      }),

      this.bluetoothService.connectedDevice$.subscribe(device => {
        this.connectedDevice = device;
      }),

      // Nouveau transfert détecté (###META###) → vider l'historique
      this.bluetoothService.transferStart$.subscribe(() => {
        this.isWaitingForData = false;
        this.sensorDataHistory = [];
        this.currentData = null;
      }),

      this.bluetoothService.dataReceived$.subscribe(data => {
        this.currentData = data;
        // Spread crée une nouvelle référence → déclenche ngOnChanges dans chart-view
        this.sensorDataHistory = [...this.sensorDataHistory, data];
        this.dataLoggerService.addSensorData(data);
      })
    );
    
    // Charger les données existantes
    this.updateDataHistory();

    // isConnected$ est un BehaviorSubject : la valeur est déjà synchronisée ci-dessus.
    // Si le dashboard s'ouvre APRÈS la connexion, les NOTIFY sont déjà passés
    // (Subject sans replay). On re-déclenche un READ pour forcer un nouvel envoi CSV.
    if (this.isConnected) {
      this.isWaitingForData = true;
      this.bluetoothService.requestDataDownload().catch(err => {
        this.isWaitingForData = false;
        console.error('Erreur re-download au chargement dashboard:', err);
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /** Texte résumé affiché après le transfert : "(N mesures entre le ... et le ...)" */
  getDateRangeSummary(): string {
    const data = this.sensorDataHistory;
    if (data.length === 0) return '';

    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // L'ESP32 envoie les enregistrements dans l'ordre chronologique (ID croissant).
    // On prend donc directement la première et la dernière entrée reçue.
    const first = data[0].timestamp;
    const last  = data[data.length - 1].timestamp;
    const n     = data.length;
    const label = `${n} mesure${n > 1 ? 's' : ''}`;

    return first.getTime() === last.getTime()
      ? `(${label} le ${fmt(first)})`
      : `(${label} entre le ${fmt(first)} et le ${fmt(last)})`;
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
