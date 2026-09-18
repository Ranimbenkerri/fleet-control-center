import type { VariableDefinition } from '../constants/variables';
import { vesselColour } from '../constants/vessels';
import type { Ramp, ValueRange } from '../utils/colourScale';
import { RAMPS, rampGradientCss } from '../utils/colourScale';
import { formatNumber } from '../utils/format';

interface MapLegendProps {
  variable: VariableDefinition;
  range: ValueRange;
  vesselIds: string[];
  ramp: Ramp;
  onRampChange: (ramp: Ramp) => void;
}

export function MapLegend({
  variable,
  range,
  vesselIds,
  ramp,
  onRampChange,
}: MapLegendProps) {
  const midpoint = (range.min + range.max) / 2;

  return (
    <div className="map-legend">
      <div className="legend-title">
        {variable.label} <span>({variable.unit})</span>
      </div>

      <div className="legend-ramp" style={{ background: rampGradientCss(ramp) }} />

      <div className="legend-scale">
        <span>{formatNumber(range.min, variable.decimals)}</span>
        <span>{formatNumber(midpoint, variable.decimals)}</span>
        <span>{formatNumber(range.max, variable.decimals)}</span>
      </div>

      <div className="legend-ramp-picker">
        {RAMPS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`ramp-chip ${option.id === ramp.id ? 'ramp-chip-active' : ''}`}
            onClick={() => onRampChange(option)}
            title={`${option.label} colour ramp`}
          >
            <i style={{ background: rampGradientCss(option) }} />
            {option.label}
          </button>
        ))}
      </div>

      {vesselIds.length > 0 && (
        <div className="legend-vessels">
          {vesselIds.map((vesselId) => (
            <span key={vesselId} className="legend-vessel">
              <i style={{ backgroundColor: vesselColour(vesselId) }} />
              {vesselId}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
