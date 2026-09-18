import { apiToInputValue, inputToApiValue } from '../utils/format';

export interface TimeWindow {
  start: string;
  end: string;
}

export interface WindowPreset {
  id: string;
  label: string;
  days: number;
}

export const WINDOW_PRESETS: WindowPreset[] = [
  { id: '24h', label: '24 h', days: 1 },
  { id: '7d', label: '7 d', days: 7 },
  { id: '30d', label: '30 d', days: 30 },
  { id: 'all', label: 'All', days: 0 },
];

interface TimeWindowPickerProps {
  value: TimeWindow;
  bounds: TimeWindow;
  onChange: (value: TimeWindow) => void;
  onPreset: (preset: WindowPreset) => void;
  invalid: boolean;
}

export function TimeWindowPicker({
  value,
  bounds,
  onChange,
  onPreset,
  invalid,
}: TimeWindowPickerProps) {
  return (
    <section className="control-block">
      <header className="control-block-header">
        <h2>Time window</h2>
        <div className="preset-row">
          {WINDOW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset-chip"
              onClick={() => onPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </header>

      <div className="field-grid">
        <label className="field">
          <span>Start</span>
          <input
            type="datetime-local"
            value={apiToInputValue(value.start)}
            min={apiToInputValue(bounds.start)}
            max={apiToInputValue(bounds.end)}
            onChange={(event) =>
              onChange({ ...value, start: inputToApiValue(event.target.value) })
            }
          />
        </label>

        <label className="field">
          <span>End</span>
          <input
            type="datetime-local"
            value={apiToInputValue(value.end)}
            min={apiToInputValue(bounds.start)}
            max={apiToInputValue(bounds.end)}
            onChange={(event) =>
              onChange({ ...value, end: inputToApiValue(event.target.value) })
            }
          />
        </label>
      </div>

      {invalid && (
        <p className="field-error">End date must be after the start date.</p>
      )}
    </section>
  );
}
