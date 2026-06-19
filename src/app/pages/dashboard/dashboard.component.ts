import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BluetoothService } from '../../services/bluetooth.service';
import { DataLoggerService } from '../../services/data-logger.service';
import { InfluxdbService } from '../../services/influxdb.service';
import { InfluxdbConfigService } from '../../services/influxdb-config.service';
import { SensorData, AppBluetoothDevice } from '../../models/sensor-data.interface';
import { Observable, Subscription } from 'rxjs';
import { InfluxdbConfigDialogComponent } from '../../components/influxdb-config-dialog/influxdb-config-dialog.component';

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
  isSendingToInflux = false;
  isInfluxConfigured = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private bluetoothService: BluetoothService,
    private dataLoggerService: DataLoggerService,
    private influxdbService: InfluxdbService,
    private influxdbConfigService: InfluxdbConfigService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.progress$ = this.bluetoothService.transferProgress$;
    this.transferCount$ = this.bluetoothService.transferCount$;
  }

  ngOnInit(): void {
    // Vérifier si InfluxDB est configuré
    this.isInfluxConfigured = this.influxdbConfigService.isConfigured();
    
    this.subscriptions.push(
      this.bluetoothService.isConnected$.subscribe(connected => {
        this.isConnected = connected;
        // Déconnexion inattendue (coupure BLE) → retour à l'accueil
        if (!connected) {
          this.router.navigate(['/']);
        }
      }),
      
      // Surveiller les changements de configuration InfluxDB
      this.influxdbConfigService.config$.subscribe(() => {
        this.isInfluxConfigured = this.influxdbConfigService.isConfigured();
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

  /**
   * Ouvrir le dialog de configuration InfluxDB
   */
  openInfluxConfig(): void {
    this.dialog.open(InfluxdbConfigDialogComponent, {
      width: '600px',
      disableClose: false
    });
  }

  /**
   * Envoyer les données vers InfluxDB
   */
  sendToInflux(): void {
    if (!this.isInfluxConfigured) {
      this.snackBar.open('Veuillez d\'abord configurer InfluxDB', 'Configurer', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.openInfluxConfig();
      });
      return;
    }

    if (this.sensorDataHistory.length === 0) {
      this.snackBar.open('Aucune donnée à envoyer', 'Fermer', {
        duration: 3000
      });
      return;
    }

    // Obtenir les statistiques avant envoi
    const stats = this.influxdbService.getSendStats(this.sensorDataHistory);
    
    if (stats.new === 0) {
      this.snackBar.open(
        `Aucune nouvelle donnée (dernier ID envoyé : ${stats.lastSentId})`,
        'Réinitialiser',
        { duration: 5000 }
      ).onAction().subscribe(() => {
        // Réinitialiser le checkpoint pour renvoyer toutes les données
        this.influxdbService.resetCheckpoint();
        this.sendToInflux();
      });
      return;
    }

    this.isSendingToInflux = true;
    this.influxdbService.sendData(this.sensorDataHistory).subscribe({
      next: () => {
        this.isSendingToInflux = false;
        
        // Mettre à jour le checkpoint après envoi réussi
        this.influxdbService.updateCheckpoint(
          this.sensorDataHistory.filter(d => 
            stats.lastSentId == null || d.id > stats.lastSentId
          )
        );
        
        this.snackBar.open(
          `✓ ${stats.new} nouvelle(s) mesure(s) envoyée(s) vers InfluxDB`,
          'Fermer',
          { duration: 4000, panelClass: ['success-snackbar'] }
        );
      },
      error: (error) => {
        this.isSendingToInflux = false;
        this.snackBar.open(
          `✗ Erreur: ${error.message}`,
          'Réessayer',
          { duration: 6000, panelClass: ['error-snackbar'] }
        ).onAction().subscribe(() => {
          this.sendToInflux();
        });
      }
    });
  }

  exportData(): void {
    try {
      this.dataLoggerService.exportToCsv(this.sensorDataHistory);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
    }
  }
}
