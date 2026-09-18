import type { TelemetryPoint } from '../types/telemetry';

export type VariableKey =
  | 'speed'
  | 'rpm'
  | 'fuel_consumption'
  | 'fuel_cost_usd'
  | 'heading'
  | 'course';

export interface VariableDefinition {
  key: VariableKey;
  label: string;
  shortLabel: string;
  unit: string;
  decimals: number;
  /** Angular variables wrap at 360°, so a linear gradient is misleading for them. */
  colourable: boolean;
  accessor: (point: TelemetryPoint) => number;
}

export const VARIABLES: VariableDefinition[] = [
  {
    key: 'speed',
    label: 'Speed over ground',
    shortLabel: 'SOG',
    unit: 'kn',
    decimals: 1,
    colourable: true,
    accessor: (point) => point.speed,
  },
  {
    key: 'rpm',
    label: 'Propeller RPM',
    shortLabel: 'RPM',
    unit: 'rpm',
    decimals: 0,
    colourable: true,
    accessor: (point) => point.rpm,
  },
  {
    key: 'fuel_consumption',
    label: 'Fuel consumption',
    shortLabel: 'Fuel rate',
    unit: 't/h',
    decimals: 2,
    colourable: true,
    accessor: (point) => point.fuel_consumption,
  },
  {
    key: 'fuel_cost_usd',
    label: 'Fuel cost rate',
    shortLabel: 'Cost rate',
    unit: '$/h',
    decimals: 0,
    colourable: true,
    accessor: (point) => point.fuel_cost_usd,
  },
  {
    key: 'heading',
    label: 'Heading (gyro)',
    shortLabel: 'HDG',
    unit: '°',
    decimals: 0,
    colourable: false,
    accessor: (point) => point.heading,
  },
  {
    key: 'course',
    label: 'Course over ground',
    shortLabel: 'COG',
    unit: '°',
    decimals: 0,
    colourable: false,
    accessor: (point) => point.course,
  },
];

export const VARIABLES_BY_KEY = new Map<VariableKey, VariableDefinition>(
  VARIABLES.map((variable) => [variable.key, variable]),
);

export function getVariable(key: VariableKey): VariableDefinition {
  const variable = VARIABLES_BY_KEY.get(key);
  if (!variable) throw new Error(`Unknown variable: ${key}`);
  return variable;
}
