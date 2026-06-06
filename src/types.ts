export interface Coordinates {
  x: number;
  y: number;
  label: string;
}

export interface MapOverlayToggle {
  streetlights: boolean;
  footTraffic: boolean;
  chillChaos: boolean;
  disturbances: boolean;
  rideshareSurge: boolean;
}

export interface Contact {
  name: string;
  phone: string;
  isDefault?: boolean;
}

export interface DistressTimerState {
  isActive: boolean;
  destination: string;
  etaMinutes: number;
  remainingSeconds: number;
  passwordHash: string; // Plain password for visual simplicity
  phoneNumbers: string[]; // Keep raw list or string list for timer state, or we can handle it
  isDistressed: boolean;
  checkInRequired: boolean;
}

export interface UserSettings {
  userName: string;
  emergencyContacts: Contact[]; // List of contacts with metadata
  customAlertMessage: string;
  safeArrivalPin: string;
  safetyWeightFactor: 'balanced' | 'max-safety' | 'well-lit-only';
}

export interface ActiveDisturbance {
  id: string;
  type: '311 log' | 'crime alert' | 'bar crowd' | 'protest';
  severity: 'low' | 'medium' | 'high';
  description: string;
  x: number;
  y: number;
}

export interface Streetlight {
  id: string;
  x: number;
  y: number;
  intensity: 'low' | 'medium' | 'high';
}

export interface FootTrafficCluster {
  id: string;
  x: number;
  y: number;
  radius: number;
  intensity: number; // 0.0 to 1.0
}
