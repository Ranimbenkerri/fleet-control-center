/**
 * Stable per-vessel accent colours, reused by the map, charts and legend.
 * Picked for separation against the Abyss Teal basemap and from each other.
 */
export const VESSEL_COLOURS: Record<string, string> = {
  IMO1: '#22D3EE',
  IMO2: '#FB7185',
  IMO3: '#A3E635',
};

const FALLBACK_COLOUR = '#C4B5FD';

export function vesselColour(vesselId: string): string {
  return VESSEL_COLOURS[vesselId] ?? FALLBACK_COLOUR;
}
