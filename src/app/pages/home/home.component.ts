import { Component, OnInit } from '@angular/core';
import { BluetoothService } from '../../services/bluetooth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isConnected = false;

  constructor(private bluetoothService: BluetoothService) {}

  ngOnInit(): void {
    this.bluetoothService.isConnected$.subscribe(connected => {
      this.isConnected = connected;
    });
  }
}
