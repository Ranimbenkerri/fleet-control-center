import axios from 'axios';
import type {
  TelemetryPoint,
  TrackResponse,
  VesselKPIs,
  VesselSummary,
} from '../types/telemetry';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
});

export const fetchVessels = async (): Promise<VesselSummary[]> => {
  const response = await apiClient.get<VesselSummary[]>('/vessels');
  return response.data;
};

export interface TrackQuery {
  vesselIds: string[];
  start: string;
  end: string;
  maxPoints?: number;
}

export const fetchTrack = async ({
  vesselIds,
  start,
  end,
  maxPoints = 1200,
}: TrackQuery): Promise<TrackResponse> => {
  if (vesselIds.length === 0) return {};

  const response = await apiClient.get<TrackResponse>('/track', {
    params: {
      vessel_ids: vesselIds.join(','),
      start,
      end,
      max_points: maxPoints,
    },
  });
  return response.data;
};

export const fetchTelemetry = async (
  vesselId: string,
  limit = 500,
): Promise<TelemetryPoint[]> => {
  const response = await apiClient.get<TelemetryPoint[]>('/telemetry', {
    params: { vessel_id: vesselId, limit },
  });
  return response.data;
};

export const fetchVesselKPIs = async (vesselId: string): Promise<VesselKPIs> => {
  const response = await apiClient.get<VesselKPIs>(`/kpis/${vesselId}`);
  return response.data;
};
