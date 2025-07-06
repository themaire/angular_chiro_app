import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SensorData, DataLoggerSession, DeviceInfo } from '../models/sensor-data.interface';

@Injectable({
  providedIn: 'root'
})
export class DataLoggerService {
  private sessionsSubject = new BehaviorSubject<DataLoggerSession[]>([]);
  private currentSessionSubject = new BehaviorSubject<DataLoggerSession | null>(null);

  public sessions$ = this.sessionsSubject.asObservable();
  public currentSession$ = this.currentSessionSubject.asObservable();

  private storageKey = 'chiro-logger-sessions';

  constructor() {
    this.loadSessionsFromStorage();
  }

  /**
   * Créer une nouvelle session de datalog
   */
  startNewSession(deviceInfo: DeviceInfo): DataLoggerSession {
    const session: DataLoggerSession = {
      deviceInfo,
      startTime: new Date(),
      dataCount: 0,
      data: []
    };

    this.currentSessionSubject.next(session);
    return session;
  }

  /**
   * Ajouter des données à la session courante
   */
  addDataToCurrentSession(sensorData: SensorData): void {
    const currentSession = this.currentSessionSubject.value;
    if (currentSession) {
      currentSession.data.push(sensorData);
      currentSession.dataCount = currentSession.data.length;
      this.currentSessionSubject.next({ ...currentSession });
    }
  }

  /**
   * Terminer la session courante
   */
  endCurrentSession(): void {
    const currentSession = this.currentSessionSubject.value;
    if (currentSession) {
      currentSession.endTime = new Date();
      
      // Ajouter à la liste des sessions
      const sessions = this.sessionsSubject.value;
      sessions.push(currentSession);
      this.sessionsSubject.next([...sessions]);
      
      // Sauvegarder en localStorage
      this.saveSessionsToStorage();
      
      // Réinitialiser la session courante
      this.currentSessionSubject.next(null);
    }
  }

  /**
   * Exporter les données d'une session en CSV
   */
  exportSessionToCsv(session: DataLoggerSession): string {
    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Pressure (hPa)', 'Battery (V)'];
    const csvLines = [headers.join(',')];

    session.data.forEach(data => {
      const line = [
        data.timestamp.toISOString(),
        data.temperature.toFixed(2),
        data.humidity.toFixed(1),
        data.pressure.toFixed(1),
        data.batteryVoltage.toFixed(2)
      ];
      csvLines.push(line.join(','));
    });

    return csvLines.join('\n');
  }

  /**
   * Télécharger un fichier CSV
   */
  downloadCsv(session: DataLoggerSession): void {
    const csvContent = this.exportSessionToCsv(session);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const fileName = `chiro-logger-${session.deviceInfo.name}-${session.startTime.toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Supprimer une session
   */
  deleteSession(sessionIndex: number): void {
    const sessions = this.sessionsSubject.value;
    sessions.splice(sessionIndex, 1);
    this.sessionsSubject.next([...sessions]);
    this.saveSessionsToStorage();
  }

  /**
   * Obtenir les statistiques d'une session
   */
  getSessionStats(session: DataLoggerSession) {
    if (session.data.length === 0) {
      return null;
    }

    const temperatures = session.data.map(d => d.temperature);
    const humidities = session.data.map(d => d.humidity);
    const pressures = session.data.map(d => d.pressure);

    return {
      temperatureMin: Math.min(...temperatures),
      temperatureMax: Math.max(...temperatures),
      temperatureAvg: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      humidityMin: Math.min(...humidities),
      humidityMax: Math.max(...humidities),
      humidityAvg: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      pressureMin: Math.min(...pressures),
      pressureMax: Math.max(...pressures),
      pressureAvg: pressures.reduce((a, b) => a + b, 0) / pressures.length,
      duration: session.endTime ? 
        session.endTime.getTime() - session.startTime.getTime() : 
        Date.now() - session.startTime.getTime(),
      dataPoints: session.data.length
    };
  }

  /**
   * Ajouter une donnée capteur à la session active ou créer une nouvelle session
   */
  addSensorData(sensorData: SensorData): void {
    this.addDataToCurrentSession(sensorData);
  }

  /**
   * Obtenir toutes les données capteur de toutes les sessions
   */
  getAllSensorData(): SensorData[] {
    const allData: SensorData[] = [];
    const sessions = this.sessionsSubject.value;
    const currentSession = this.currentSessionSubject.value;

    // Ajouter les données de toutes les sessions terminées
    sessions.forEach(session => {
      allData.push(...session.data);
    });

    // Ajouter les données de la session courante
    if (currentSession) {
      allData.push(...currentSession.data);
    }

    // Trier par timestamp décroissant (plus récent en premier)
    return allData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Exporter toutes les données en CSV
   */
  exportToCsv(): void {
    const allData = this.getAllSensorData();
    
    if (allData.length === 0) {
      alert('Aucune donnée à exporter');
      return;
    }

    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Pressure (hPa)', 'Battery (V)'];
    const csvLines = [headers.join(',')];

    allData.forEach(data => {
      const line = [
        data.timestamp.toISOString(),
        data.temperature.toFixed(2),
        data.humidity.toFixed(1),
        data.pressure.toFixed(1),
        data.batteryVoltage.toFixed(2)
      ];
      csvLines.push(line.join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const fileName = `chiro-logger-all-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Effacer toutes les données
   */
  clearAllData(): void {
    this.sessionsSubject.next([]);
    this.currentSessionSubject.next(null);
    this.saveSessionsToStorage();
  }

  /**
   * Charger les sessions depuis localStorage
   */
  private loadSessionsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const sessions: DataLoggerSession[] = JSON.parse(stored);
        // Convertir les timestamps en objets Date
        sessions.forEach(session => {
          session.startTime = new Date(session.startTime);
          if (session.endTime) {
            session.endTime = new Date(session.endTime);
          }
          session.data.forEach(data => {
            data.timestamp = new Date(data.timestamp);
          });
        });
        this.sessionsSubject.next(sessions);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
    }
  }

  /**
   * Sauvegarder les sessions en localStorage
   */
  private saveSessionsToStorage(): void {
    try {
      const sessions = this.sessionsSubject.value;
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des sessions:', error);
    }
  }
}
