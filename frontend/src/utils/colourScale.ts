interface Rgb {
  r: number;
  g: number;
  b: number;
}

export type RampId = 'abyss' | 'thermal' | 'viridis';

export interface Ramp {
  id: RampId;
  label: string;
  stops: Rgb[];
}

function rgb(r: number, g: number, b: number): Rgb {
  return { r, g, b };
}

export const RAMPS: Ramp[] = [
  {
    id: 'abyss',
    label: 'Abyss',
    // Harmonised with the teal theme: deep water -> shallow -> lime -> hot.
    stops: [
      rgb(4, 47, 46),
      rgb(13, 148, 136),
      rgb(45, 212, 191),
      rgb(163, 230, 53),
      rgb(250, 204, 21),
      rgb(251, 113, 133),
    ],
  },
  {
    id: 'thermal',
    label: 'Thermal',
    stops: [
      rgb(30, 64, 175),
      rgb(2, 132, 199),
      rgb(34, 211, 238),
      rgb(250, 204, 21),
      rgb(249, 115, 22),
      rgb(239, 68, 68),
    ],
  },
  {
    id: 'viridis',
    label: 'Viridis',
    // Perceptually uniform and colour-blind friendly.
    stops: [
      rgb(68, 1, 84),
      rgb(65, 68, 135),
      rgb(42, 120, 142),
      rgb(34, 168, 132),
      rgb(122, 209, 81),
      rgb(253, 231, 37),
    ],
  },
];

export const DEFAULT_RAMP = RAMPS[0];

function mix(from: Rgb, to: Rgb, ratio: number): Rgb {
  return {
    r: Math.round(from.r + (to.r - from.r) * ratio),
    g: Math.round(from.g + (to.g - from.g) * ratio),
    b: Math.round(from.b + (to.b - from.b) * ratio),
  };
}

/** Maps a 0..1 position to a CSS colour on the given ramp. */
export function rampColour(ramp: Ramp, position: number): string {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(position) ? position : 0));
  const scaled = clamped * (ramp.stops.length - 1);
  const lowIndex = Math.floor(scaled);
  const highIndex = Math.min(ramp.stops.length - 1, lowIndex + 1);
  const { r, g, b } = mix(ramp.stops[lowIndex], ramp.stops[highIndex], scaled - lowIndex);
  return `rgb(${r}, ${g}, ${b})`;
}

/** CSS gradient string mirroring `rampColour`, for legends and swatches. */
export function rampGradientCss(ramp: Ramp, direction = 'to right'): string {
  const stops = ramp.stops.map(
    ({ r, g, b }, index) =>
      `rgb(${r}, ${g}, ${b}) ${((index / (ramp.stops.length - 1)) * 100).toFixed(0)}%`,
  );
  return `linear-gradient(${direction}, ${stops.join(', ')})`;
}

export interface ValueRange {
  min: number;
  max: number;
}

export function normalise(value: number, { min, max }: ValueRange): number {
  if (!Number.isFinite(value)) return 0;
  if (max <= min) return 0.5;
  return (value - min) / (max - min);
}
