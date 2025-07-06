export interface SensorData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  pressure: number;
  batteryVoltage: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  macAddress: string;
  isConnected: boolean;
  lastSync?: Date;
  batteryLevel?: number;
}

export interface DataLoggerSession {
  deviceInfo: DeviceInfo;
  startTime: Date;
  endTime?: Date;
  dataCount: number;
  data: SensorData[];
}

export interface AppBluetoothDevice {
  id: string;
  name?: string;
  rssi?: number;
}
