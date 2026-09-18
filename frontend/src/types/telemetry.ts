export interface TelemetryPoint {
  timestamp: string;
  vessel_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number;
  rpm: number;
  fuel_consumption: number;
  fuel_cost_usd: number;
}

export interface VesselKPIs {
  vessel_id: string;
  avg_speed: number;
  total_fuel: number;
  total_cost: number;
}

export interface VesselSummary {
  vessel_id: string;
  first_timestamp: string;
  last_timestamp: string;
  sample_count: number;
}

/** Telemetry grouped per vessel, as returned by `GET /api/track`. */
export type TrackResponse = Record<string, TelemetryPoint[]>;
