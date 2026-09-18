export interface Basemap {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const ESRI_ATTRIBUTION =
  '&copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, NOAA, USGS';

/**
 * Key-free tile sources only. CARTO's dark_all basemap now stamps
 * "API KEY REQUIRED" over the tiles, so Esri's canvases are used instead.
 */
export const BASEMAPS: Basemap[] = [
  {
    id: 'dark',
    label: 'Dark',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 16,
  },
  {
    id: 'ocean',
    label: 'Ocean',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: `${ESRI_ATTRIBUTION}, GEBCO`,
    maxZoom: 13,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: `${ESRI_ATTRIBUTION}, Maxar, Earthstar Geographics`,
    maxZoom: 18,
  },
];

export const DEFAULT_BASEMAP = BASEMAPS[0];
