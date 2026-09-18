import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Basemap } from '../constants/basemaps';
import type { VariableDefinition } from '../constants/variables';
import { vesselColour } from '../constants/vessels';
import type { TelemetryPoint, TrackResponse } from '../types/telemetry';
import type { Ramp, ValueRange } from '../utils/colourScale';
import { normalise, rampColour } from '../utils/colourScale';
import { formatNumber, formatTimestamp } from '../utils/format';
import { pointAtTime } from '../utils/stats';

/**
 * Leaflet polylines carry a single colour, so a gradient track is drawn as one
 * short polyline per consecutive sample pair. Segments are capped to keep the
 * DOM manageable on long windows.
 */
const MAX_SEGMENTS_PER_VESSEL = 900;

interface Segment {
  positions: [number, number][];
  colour: string;
}

function buildSegments(
  points: TelemetryPoint[],
  variable: VariableDefinition,
  range: ValueRange,
  ramp: Ramp,
): Segment[] {
  if (points.length < 2) return [];

  const stride = Math.max(1, Math.ceil((points.length - 1) / MAX_SEGMENTS_PER_VESSEL));
  const segments: Segment[] = [];

  for (let index = stride; index < points.length; index += stride) {
    const from = points[index - stride];
    const to = points[index];
    const midValue = (variable.accessor(from) + variable.accessor(to)) / 2;

    segments.push({
      positions: [
        [from.latitude, from.longitude],
        [to.latitude, to.longitude],
      ],
      colour: rampColour(ramp, normalise(midValue, range)),
    });
  }

  return segments;
}

function vesselMarkerIcon(colour: string, heading: number): L.DivIcon {
  return L.divIcon({
    className: 'vessel-marker',
    html: `<div class="vessel-marker-inner" style="--marker-colour:${colour}; --marker-heading:${heading}deg"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

interface FitBoundsProps {
  /** Serialised bounds signature; refitting only when the extent really changes. */
  signature: string;
  positions: [number, number][];
}

function FitBounds({ signature, positions }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;
    map.fitBounds(L.latLngBounds(positions), { padding: [56, 56] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, map]);

  return null;
}

interface FleetMapProps {
  track: TrackResponse;
  colourVariable: VariableDefinition;
  colourRange: ValueRange;
  currentTimestamp: string | null;
  basemap: Basemap;
  ramp: Ramp;
}

export function FleetMap({
  track,
  colourVariable,
  colourRange,
  currentTimestamp,
  basemap,
  ramp,
}: FleetMapProps) {
  const vesselIds = useMemo(() => Object.keys(track).sort(), [track]);

  const segmentsByVessel = useMemo(
    () =>
      vesselIds.map((vesselId) => ({
        vesselId,
        segments: buildSegments(track[vesselId], colourVariable, colourRange, ramp),
      })),
    [vesselIds, track, colourVariable, colourRange, ramp],
  );

  const allPositions = useMemo(() => {
    const positions: [number, number][] = [];
    for (const vesselId of vesselIds) {
      for (const point of track[vesselId]) {
        positions.push([point.latitude, point.longitude]);
      }
    }
    return positions;
  }, [vesselIds, track]);

  const boundsSignature = useMemo(() => {
    if (allPositions.length === 0) return 'empty';
    const first = allPositions[0];
    const last = allPositions[allPositions.length - 1];
    return `${vesselIds.join(',')}|${allPositions.length}|${first[0]},${first[1]}|${last[0]},${last[1]}`;
  }, [allPositions, vesselIds]);

  return (
    <div className="fleet-map">
      <MapContainer
        center={[36, -20]}
        zoom={3}
        minZoom={2}
        worldCopyJump
        className="fleet-map-container"
        zoomControl={false}
      >
        <TileLayer
          key={basemap.id}
          url={basemap.url}
          attribution={basemap.attribution}
          maxZoom={basemap.maxZoom}
        />

        <FitBounds signature={boundsSignature} positions={allPositions} />

        {segmentsByVessel.map(({ vesselId, segments }) =>
          segments.map((segment, index) => (
            <Polyline
              key={`${vesselId}-${index}`}
              positions={segment.positions}
              pathOptions={{
                color: segment.colour,
                weight: 3,
                opacity: 0.9,
                lineCap: 'round',
              }}
            />
          )),
        )}

        {currentTimestamp &&
          vesselIds.map((vesselId) => {
            const point = pointAtTime(track[vesselId], currentTimestamp);
            if (!point) return null;

            return (
              <Marker
                key={`marker-${vesselId}`}
                position={[point.latitude, point.longitude]}
                icon={vesselMarkerIcon(vesselColour(vesselId), point.heading)}
                zIndexOffset={1000}
              >
                <Popup className="map-popup">
                  <strong>{vesselId}</strong>
                  <br />
                  {formatTimestamp(point.timestamp)}
                  <br />
                  SOG {formatNumber(point.speed)} kn · HDG {formatNumber(point.heading, 0)}°
                  <br />
                  RPM {formatNumber(point.rpm, 0)} · Fuel{' '}
                  {formatNumber(point.fuel_consumption, 2)} t/h
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
