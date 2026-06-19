import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface InfluxDBConfig {
  url: string;
  token: string;
  organization: string;
  bucket: string;
  deviceName: string;  // Tag pour identifier la sonde (ex: logger1)
  enabled: boolean;
}

export interface InfluxDBState {
  lastSentId: number;  // Dernier ID envoyé (checkpoint anti-doublon)
}

@Iprivate readonly STATE_KEY = 'chiro-logger-influxdb-state';
  njectable({
  providedIn: 'root'
})
export class InfluxdbConfigService {
  private readonly STORAGE_KEY = 'chiro-logger-influxdb-config';
  
  private configSubject = new BehaviorSubject<InfluxDBConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor() {
    this.loadConfig();
  }

  /**
   * Charger la configuration depuis le localStorage
   */
  private loadConfig(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const config = JSON.parse(stored);
        this.configSubject.next(config);
      } catch (error) {
        console.error('Erreur lors du chargement de la config InfluxDB:', error);
      }
    }
  }

  /**
   * Sauvegarder la configuration dans le localStorage
   */
  saveConfig(config: InfluxDBConfig): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    this.configSubject.next(config);
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): InfluxDBConfig | null {
    return this.configSubject.value;
  }

  /**
   * Vérifier si la configuration est complète et valide
   */
  isConfigured(): boolean {
    const config = this.configSubject.value;
    return !!(
      config &&
      config.enabled &&
      config.url &&
      config.token &&
      config.organi &&
      config.deviceName
    );
  }

  /**
   * Supprimer la configuration
   */
  clearConfig(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.configSubject.next(null);
  }

  /**
   * Obtenir l'état du checkpoint (dernier ID envoyé)
   */
  getState(): InfluxDBState | null {
    const stored = localStorage.getItem(this.STATE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'état InfluxDB:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Sauvegarder l'état du checkpoint
   */
  saveState(state: InfluxDBState): void {
    localStorage.setItem(this.STATE_KEY, JSON.stringify(state));
  }

  /**
   * Réinitialiser le checkpoint (force le renvoi de toutes les données)
   */
  resetState(): void {
    localStorage.removeItem(this.STATE_KEY.STORAGE_KEY);
    this.configSubject.next(null);
  }
}
