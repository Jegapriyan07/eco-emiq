/**
 * Shared TypeScript types for EcoTronics platform
 * Used across edge devices, backend services, and frontend
 */

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export enum UserRole {
  VEHICLE_OWNER = 'vehicle_owner',
  GENERATOR_OWNER = 'generator_owner',
  INDUSTRY_OWNER = 'industry_owner',
  CITY_ADMIN = 'city_admin',
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  organizationId?: string; // For industry/city roles
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId?: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================================
// DEVICES
// ============================================================================

export enum DeviceType {
  VEHICLE = 'vehicle',
  GENERATOR = 'generator',
  INDUSTRIAL = 'industrial',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DECOMMISSIONED = 'decommissioned',
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// Vehicle-specific metadata
export interface VehicleMetadata {
  make: string;
  model: string;
  year: number;
  vin?: string;
  fuelType: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  engineSize?: number; // in liters
  odometer?: number; // in kilometers
}

// Generator-specific metadata
export interface GeneratorMetadata {
  capacity: number; // in kW
  fuelType: 'diesel' | 'natural_gas' | 'propane';
  manufacturer: string;
  model: string;
  installationDate?: Date;
  runtimeHours?: number;
}

// Industrial-specific metadata
export interface IndustrialMetadata {
  facilityType: string;
  location: GeoPoint;
  capacity?: number;
  industryCategory: string;
  regulatoryId?: string;
}

export type DeviceMetadata = VehicleMetadata | GeneratorMetadata | IndustrialMetadata;

export interface Device {
  id: string;
  type: DeviceType;
  ownerId: string;
  organizationId?: string;
  name: string;
  description?: string;
  status: DeviceStatus;
  metadata: DeviceMetadata;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EMISSION DATA
// ============================================================================

export interface EmissionData {
  co2: number;        // grams of CO2
  co: number;         // parts per million
  nox: number;        // parts per million (nitrogen oxides)
  pm25: number;       // μg/m³ (particulate matter 2.5)
  pm10?: number;      // μg/m³ (particulate matter 10)
  so2?: number;       // parts per million (sulfur dioxide)
  voc?: number;       // parts per million (volatile organic compounds)
}

export interface FuelConsumption {
  amount: number;     // liters or kWh
  type: 'gasoline' | 'diesel' | 'natural_gas' | 'propane' | 'electricity';
  cost?: number;      // in local currency
}

export interface EmissionReading {
  id: string;
  deviceId: string;
  timestamp: Date;
  data: EmissionData;
  fuelConsumed?: FuelConsumption;
  location?: GeoPoint;
  speed?: number;           // km/h (for vehicles)
  engineLoad?: number;      // percentage (for vehicles/generators)
  temperature?: number;     // Celsius
  humidity?: number;        // percentage
  calculatedLocally: boolean; // Was this calculated on edge device?
  syncedAt?: Date;          // When was this synced to cloud?
  metadata?: Record<string, any>; // Flexible field for device-specific data
}

// ============================================================================
// ANALYTICS & AGGREGATIONS
// ============================================================================

export interface EmissionSummary {
  deviceId: string;
  period: 'hour' | 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalCO2: number;
  totalFuelConsumed: number;
  averageCO2PerHour: number;
  peakCO2: number;
  peakCO2Timestamp: Date;
  readingCount: number;
  calculatedAt: Date;
}

export interface ComparisonData {
  deviceId: string;
  metric: 'co2' | 'fuel_efficiency' | 'cost';
  value: number;
  percentile: number; // 0-100, where they rank among similar devices
  average: number;    // Average for similar devices
  best: number;       // Best performer
  worst: number;      // Worst performer
}

// ============================================================================
// ALERTS & NOTIFICATIONS
// ============================================================================

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AlertType {
  HIGH_EMISSION = 'high_emission',
  MAINTENANCE_DUE = 'maintenance_due',
  DEVICE_OFFLINE = 'device_offline',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  ANOMALY_DETECTED = 'anomaly_detected',
}

export interface Alert {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  threshold?: number;
  actualValue?: number;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// REPORTS
// ============================================================================

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  COMPLIANCE = 'compliance',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
}

export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  format: ReportFormat;
  deviceIds: string[];
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  fileUrl: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ORGANIZATIONS (for Industry & City roles)
// ============================================================================

export enum OrganizationType {
  INDUSTRY = 'industry',
  CITY_AUTHORITY = 'city_authority',
}

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  contactEmail: string;
  contactPhone?: string;
  regulatoryId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    timestamp: Date;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}

// ============================================================================
// REAL-TIME EVENTS (WebSocket)
// ============================================================================

export enum WebSocketEventType {
  NEW_READING = 'new_reading',
  DEVICE_STATUS_CHANGE = 'device_status_change',
  NEW_ALERT = 'new_alert',
  ALERT_ACKNOWLEDGED = 'alert_acknowledged',
  DEVICE_CONNECTED = 'device_connected',
  DEVICE_DISCONNECTED = 'device_disconnected',
}

export interface WebSocketEvent<T = any> {
  type: WebSocketEventType;
  deviceId?: string;
  userId?: string;
  data: T;
  timestamp: Date;
}

// ============================================================================
// EDGE DEVICE SYNC
// ============================================================================

export interface SyncPayload {
  deviceId: string;
  readings: EmissionReading[];
  deviceStatus: DeviceStatus;
  lastSyncAt: Date;
  pendingAlerts?: Alert[];
}

export interface SyncResponse {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  nextSyncAt: Date;
  serverTime: Date;
}

// ============================================================================
// HEALTH & DIAGNOSTICS
// ============================================================================

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  dependencies: {
    name: string;
    status: 'up' | 'down';
    responseTime?: number;
  }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const EMISSION_THRESHOLDS = {
  VEHICLE: {
    CO2_HIGH: 200,      // g/km
    CO2_CRITICAL: 300,
    NOX_HIGH: 80,       // ppm
    NOX_CRITICAL: 120,
  },
  GENERATOR: {
    CO2_HIGH: 500,      // g/kWh
    CO2_CRITICAL: 800,
    NOX_HIGH: 100,
    NOX_CRITICAL: 150,
  },
  INDUSTRIAL: {
    CO2_HIGH: 1000,     // g/hour
    CO2_CRITICAL: 2000,
    NOX_HIGH: 200,
    NOX_CRITICAL: 400,
  },
} as const;

export const FUEL_CO2_FACTORS = {
  gasoline: 2.31,     // kg CO2 per liter
  diesel: 2.68,       // kg CO2 per liter
  natural_gas: 2.75,  // kg CO2 per m³
  propane: 1.51,      // kg CO2 per liter
  electricity: 0.92,  // kg CO2 per kWh (grid average)
} as const;
