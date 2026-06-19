import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InfluxdbConfigService, InfluxDBConfig } from './influxdb-config.service';
import { SensorData } from '../models/sensor-data.interface';

@Injectable({
  providedIn: 'root'
})
export class InfluxdbService {

  constructor(
    private http: HttpClient,
    private configService: InfluxdbConfigService
  ) { }

  /**
   * Convertir les données du capteur au format InfluxDB Line Protocol
   * Format compatible avec chiro_influx_loader :
   * env,device=logger1 temperature=19.05,hygro=59.63,vbat=60,bat=3.72 1713332628
   */
  private convertToLineProtocol(data: SensorData[], deviceName: string): string {
    return data.map(d => {
      // Timestamp en secondes Unix (comme le script Python)
      const timestamp = Math.floor(d.timestamp.getTime() / 1000);
      
      // Tag device (compatible avec le format existant)
      const tags = `device=${deviceName}`;
      
      // Fields : utiliser les mêmes noms que le script Python
      // temperature, hygro, vbat (battery percent), bat (battery voltage)
      const fields = [
        `temperature=${d.temperature}`,
        `hygro=${d.humidity}`,
        d.batteryPercent != null ? `vbat=${d.batteryPercent}` : null,
        d.batteryVoltage != null ? `bat=${d.batteryVoltage}` : null
      ].filter(f => f !== null).join(',');
      
      // Measurement : 'env' (compatible avec le format existant)
      return `env,${tags} ${fields} ${timestamp}`;
    }).join('\n');
  }

  /**
   * Envoyer des données vers InfluxDB v2
   * Gère automatiquement les doublons via un checkpoint (comme chiro_influx_loader)
   */
  sendData(data: SensorData[]): Observable<any> {
    const config = this.configService.getConfig();
    
    if (!config || !this.configService.isConfigured()) {
      return throwError(() => new Error('Configuration InfluxDB manquante ou incomplète'));
    }

    if (data.length === 0) {
      return throwError(() => new Error('Aucune donnée à envoyer'));
    }

    // Trier les données par ID (ordre croissant)
    const sortedData = [...data].sort((a, b) => a.id - b.id);

    // Gestion des doublons : filtrer les données selon le checkpoint
    const state = this.configService.getState();
    let dataToSend: SensorData[];
    
    if (state && state.lastSentId != null) {
      // Envoyer uniquement les données avec ID > dernier ID envoyé
      dataToSend = sortedData.filter(d => d.id > state.lastSentId);
      
      if (dataToSend.length === 0) {
        return throwError(() => new Error(
          `Aucune nouvelle donnée à envoyer (dernier ID envoyé : ${state.lastSentId})`
        ));
      }
    } else {
      // Premier envoi : envoyer toutes les données
      dataToSend = sortedData;
    }

    const url = `${config.url}/api/v2/write?org=${encodeURIComponent(config.organization)}&bucket=${encodeURIComponent(config.bucket)}&precision=s`;
    
    const headers = new HttpHeaders({
      'Authorization': `Token ${config.token}`,
      'Content-Type': 'text/plain; charset=utf-8'
    });

    const lineProtocol = this.convertToLineProtocol(dataToSend, config.deviceName);

    return this.http.post(url, lineProtocol, { headers, responseType: 'text' })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de l\'envoi vers InfluxDB:', error);
          let errorMessage = 'Erreur lors de l\'envoi vers InfluxDB';
          
          if (error.status === 401 || error.status === 403) {
            errorMessage = 'Erreur d\'authentification - Vérifiez votre token';
          } else if (error.status === 404) {
            errorMessage = 'Bucket ou organization introuvable';
          } else if (error.status === 0) {
            errorMessage = 'Impossible de joindre le serveur InfluxDB - Vérifiez l\'URL et CORS';
          } else if (error.error) {
            errorMessage = `Erreur InfluxDB: ${error.error}`;
          }
          
          return throwError(() => new Error(errorMessage));

  /**
   * Obtenir les statistiques d'envoi
   */
  getSendStats(data: SensorData[]): { total: number, new: number, lastSentId: number | null } {
    const state = this.configService.getState();
    const lastSentId = state?.lastSentId ?? null;
    const total = data.length;
    const newCount = lastSentId != null 
      ? data.filter(d => d.id > lastSentId).length 
      : total;
    
    return { total, new: newCount, lastSentId };
  }

  /**
   * Mettre à jour le checkpoint après envoi réussi
   */
  updateCheckpoint(data: SensorData[]): void {
    if (data.length === 0) return;
    
    // Trouver l'ID maximum dans les données envoyées
    const maxId = Math.max(...data.map(d => d.id));
    
    // Sauvegarder le checkpoint
    this.configService.saveState({ lastSentId: maxId });
  }

  /**
   * Réinitialiser le checkpoint (force le renvoi de toutes les données)
   */
  resetCheckpoint(): void {
    this.configService.resetState();
  }
        })
      );
  }

  /**
   * Tester la connexion à InfluxDB
   */
  testConnection(config: InfluxDBConfig): Observable<any> {
    const url = `${config.url}/api/v2/buckets?org=${encodeURIComponent(config.organization)}`;
    
    const headers = new HttpHeaders({
      'Authorization': `Token ${config.token}`
    });

    return this.http.get(url, { headers })
      .pipe(
        catchError(error => {
          console.error('Erreur de test de connexion InfluxDB:', error);
          return throwError(() => error);
        })
      );
  }
}
