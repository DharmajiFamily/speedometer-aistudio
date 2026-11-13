export type DriveMode = 'street' | 'sport' | 'track';
export type SpeedUnit = 'mph' | 'kmh';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface VehicleTelemetry {
  ownerId: string;
  vehicleName: string;
  driveMode: DriveMode;
  unit: SpeedUnit;
  speedMph: number;
  rpm: number;
  latitude: number;
  longitude: number;
  heading: number;
  altitudeMeters: number;
  accuracyMeters: number;
  peakSpeedMph: number;
  tripDistanceMiles: number;
  isTracking: boolean;
  sourceDevice: string;
  updatedAt?: Date | null;
  createdAt?: Date | null;
}

export interface TripLog {
  id: string;
  ownerId: string;
  vehicleId: string;
  label: string;
  driveMode: DriveMode;
  maxSpeedMph: number;
  avgSpeedMph: number;
  distanceMiles: number;
  durationSeconds: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  routePoints: RoutePoint[];
  createdAt?: Date | null;
}
