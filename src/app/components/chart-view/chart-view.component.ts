import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { SensorData } from '../../models/sensor-data.interface';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  timestamp: Date;
}

interface ChartStats {
  min: number;
  max: number;
  avg: number;
}

@Component({
  selector: 'app-chart-view',
  templateUrl: './chart-view.component.html',
  styleUrls: ['./chart-view.component.scss']
})
export class ChartViewComponent implements OnInit, OnChanges {
  @Input() data: SensorData[] = [];
  
  selectedMetric: keyof SensorData = 'temperature';
  chartData: ChartPoint[] = [];
  currentStats: ChartStats = { min: 0, max: 0, avg: 0 };
  currentUnit = '°C';

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.updateChart();
    }
  }

  setMetric(metric: keyof SensorData): void {
    if (metric === 'timestamp') return;
    
    this.selectedMetric = metric;
    this.updateChart();
  }

  getCurrentMetricName(): string {
    switch (this.selectedMetric) {
      case 'temperature': return 'Température';
      case 'humidity': return 'Humidité';
      case 'pressure': return 'Pression';
      case 'batteryVoltage': return 'Batterie';
      default: return 'Valeur';
    }
  }

  private updateChart(): void {
    if (this.data.length === 0) {
      this.chartData = [];
      this.currentStats = { min: 0, max: 0, avg: 0 };
      return;
    }

    // Prendre les 50 derniers points pour optimiser l'affichage
    const recentData = this.data.slice(-50);
    
    // Extraire les valeurs de la métrique sélectionnée
    const values = recentData.map(d => d[this.selectedMetric] as number);
    
    // Calculer les statistiques
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    this.currentStats = { min, max, avg };
    
    // Générer les points du graphique
    this.chartData = recentData.map((data, index) => {
      const value = data[this.selectedMetric] as number;
      return {
        x: (index / (recentData.length - 1)) * 100,
        y: max > min ? ((value - min) / (max - min)) * 100 : 50,
        value,
        timestamp: data.timestamp
      };
    });
    
    // Mettre à jour l'unité
    this.updateUnit();
  }

  private updateUnit(): void {
    switch (this.selectedMetric) {
      case 'temperature': 
        this.currentUnit = '°C';
        break;
      case 'humidity': 
        this.currentUnit = '%';
        break;
      case 'pressure': 
        this.currentUnit = ' hPa';
        break;
      case 'batteryVoltage': 
        this.currentUnit = 'V';
        break;
      default: 
        this.currentUnit = '';
    }
  }

  getPointColor(value: number): string {
    // Gradient de couleur basé sur la valeur relative
    const percent = this.currentStats.max > this.currentStats.min 
      ? (value - this.currentStats.min) / (this.currentStats.max - this.currentStats.min)
      : 0.5;
    
    if (percent < 0.33) return '#4caf50'; // Vert
    if (percent < 0.66) return '#ff9800'; // Orange
    return '#f44336'; // Rouge
  }

  getPointTitle(point: ChartPoint): string {
    return `${point.timestamp.toLocaleString()}: ${point.value.toFixed(2)}${this.currentUnit}`;
  }
}
