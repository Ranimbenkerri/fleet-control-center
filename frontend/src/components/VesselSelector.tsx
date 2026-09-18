import type { CSSProperties } from 'react';
import { vesselColour } from '../constants/vessels';
import type { VesselSummary } from '../types/telemetry';
import { formatCompact, formatDateOnly } from '../utils/format';

interface VesselSelectorProps {
  vessels: VesselSummary[];
  selected: string[];
  onToggle: (vesselId: string) => void;
}

export function VesselSelector({ vessels, selected, onToggle }: VesselSelectorProps) {
  return (
    <section className="control-block">
      <header className="control-block-header">
        <h2>Fleet</h2>
        <span className="control-hint">{selected.length} of {vessels.length} selected</span>
      </header>

      <div className="vessel-list">
        {vessels.map((vessel) => {
          const isSelected = selected.includes(vessel.vessel_id);

          return (
            <button
              key={vessel.vessel_id}
              type="button"
              className={`vessel-chip ${isSelected ? 'vessel-chip-active' : ''}`}
              style={{ '--vessel-colour': vesselColour(vessel.vessel_id) } as CSSProperties}
              onClick={() => onToggle(vessel.vessel_id)}
              aria-pressed={isSelected}
            >
              <span className="vessel-chip-dot" />
              <span className="vessel-chip-body">
                <strong>{vessel.vessel_id}</strong>
                <small>
                  {formatDateOnly(vessel.first_timestamp)} –{' '}
                  {formatDateOnly(vessel.last_timestamp)} ·{' '}
                  {formatCompact(vessel.sample_count)} pts
                </small>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
