import type { VariableDefinition } from '../constants/variables';
import type { TelemetryPoint, TrackResponse } from '../types/telemetry';
import type { ValueRange } from './colourScale';
import { haversineNm } from './geo';

export interface VesselStats {
  vesselId: string;
  sampleCount: number;
  avgSpeedKn: number;
  maxSpeedKn: number;
  distanceNm: number;
  elapsedHours: number;
  fuelTonnes: number;
  fuelCostUsd: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

function hoursBetween(from: string, to: string): number {
  const start = Date.parse(from.replace(' ', 'T'));
  const end = Date.parse(to.replace(' ', 'T'));
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, (end - start) / 3_600_000);
}

/**
 * Fuel columns are *rates* (t/h and $/h), so totals are integrated over the
 * real time delta between consecutive samples using the trapezoidal rule.
 * This stays correct even after the backend downsamples the track.
 */
export function computeVesselStats(
  vesselId: string,
  points: TelemetryPoint[],
): VesselStats {
  const empty: VesselStats = {
    vesselId,
    sampleCount: 0,
    avgSpeedKn: 0,
    maxSpeedKn: 0,
    distanceNm: 0,
    elapsedHours: 0,
    fuelTonnes: 0,
    fuelCostUsd: 0,
    firstTimestamp: '',
    lastTimestamp: '',
  };

  if (points.length === 0) return empty;

  let speedSum = 0;
  let maxSpeed = 0;
  let distanceNm = 0;
  let fuelTonnes = 0;
  let fuelCostUsd = 0;

  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    speedSum += point.speed;
    maxSpeed = Math.max(maxSpeed, point.speed);

    if (index === 0) continue;

    const previous = points[index - 1];
    distanceNm += haversineNm(
      previous.latitude,
      previous.longitude,
      point.latitude,
      point.longitude,
    );

    const dtHours = hoursBetween(previous.timestamp, point.timestamp);
    fuelTonnes += ((previous.fuel_consumption + point.fuel_consumption) / 2) * dtHours;
    fuelCostUsd += ((previous.fuel_cost_usd + point.fuel_cost_usd) / 2) * dtHours;
  }

  const firstTimestamp = points[0].timestamp;
  const lastTimestamp = points[points.length - 1].timestamp;

  return {
    vesselId,
    sampleCount: points.length,
    avgSpeedKn: speedSum / points.length,
    maxSpeedKn: maxSpeed,
    distanceNm,
    elapsedHours: hoursBetween(firstTimestamp, lastTimestamp),
    fuelTonnes,
    fuelCostUsd,
    firstTimestamp,
    lastTimestamp,
  };
}

export function computeFleetStats(track: TrackResponse): VesselStats[] {
  return Object.entries(track).map(([vesselId, points]) =>
    computeVesselStats(vesselId, points),
  );
}

/** Shared min/max across all selected vessels so the gradient is comparable. */
export function computeValueRange(
  track: TrackResponse,
  variable: VariableDefinition,
): ValueRange {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const points of Object.values(track)) {
    for (const point of points) {
      const value = variable.accessor(point);
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  return { min, max };
}

/** Union of all timestamps across vessels, ascending — drives the replay scrubber. */
export function buildTimeAxis(track: TrackResponse): string[] {
  const unique = new Set<string>();
  for (const points of Object.values(track)) {
    for (const point of points) unique.add(point.timestamp);
  }
  return [...unique].sort();
}

/** Last sample at or before `timestamp`, or null when the vessel has not sailed yet. */
export function pointAtTime(
  points: TelemetryPoint[],
  timestamp: string,
): TelemetryPoint | null {
  let candidate: TelemetryPoint | null = null;
  for (const point of points) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate;
}
