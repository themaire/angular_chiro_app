import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InfluxdbConfigService, InfluxDBConfig } from '../../services/influxdb-config.service';
import { InfluxdbService } from '../../services/influxdb.service';

@Component({
  selector: 'app-influxdb-config-dialog',
  templateUrl: './influxdb-config-dialog.component.html',
  styleUrls: ['./influxdb-config-dialog.component.scss']
})
export class InfluxdbConfigDialogComponent implements OnInit {
  configForm: FormGroup;
  isTesting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<InfluxdbConfigDialogComponent>,
    private configService: InfluxdbConfigService,
    private influxdbService: InfluxdbService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.configForm = this.fb.group({
      url: ['', [Validators.required]],
      token: ['', [Validators.required]],
      organization: ['', [Validators.required]],
      bucket: ['', [Validators.required]],
      deviceName: ['', [Validators.required]],
      enabled: [true]
    });
  }

  ngOnInit(): void {
    // Charger la configuration existante
    const existingConfig = this.configService.getConfig();
    if (existingConfig) {
      this.configForm.patchValue(existingConfig);
    } else {
      // Valeurs par défaut
      this.configForm.patchValue({
        url: 'http://localhost:8086',
        deviceName: 'logger1',
        enabled: true
      });
    }
  }

  /**
   * Tester la connexion à InfluxDB
   */
  testConnection(): void {
    if (this.configForm.invalid) {
      this.snackBar.open('Veuillez remplir tous les champs requis', 'Fermer', {
        duration: 3000
      });
      return;
    }

    this.isTesting = true;
    const config = this.configForm.value as InfluxDBConfig;

    this.influxdbService.testConnection(config).subscribe({
      next: () => {
        this.isTesting = false;
        this.snackBar.open('✓ Connexion réussie !', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        this.isTesting = false;
        this.snackBar.open(`✗ Échec de la connexion: ${error.message}`, 'Fermer', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Sauvegarder la configuration
   */
  save(): void {
    if (this.configForm.valid) {
      const config = this.configForm.value as InfluxDBConfig;
      this.configService.saveConfig(config);
      this.dialogRef.close(config);
      this.snackBar.open('Configuration sauvegardée', 'Fermer', {
        duration: 2000
      });
    }
  }

  /**
   * Annuler
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
