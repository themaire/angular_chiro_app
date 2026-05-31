// Format CSV ESP32 : ID,DateTime,Temperature_C,Humidity_%[,Battery_%,Battery_V]
export interface SensorData {
  id: number;
  timestamp: Date;
  temperature: number;
  humidity: number;
  batteryPercent?: number;
  batteryVoltage?: number;
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
