import type { VariableKey } from '../constants/variables';
import { VARIABLES } from '../constants/variables';

interface VariableSelectorProps {
  selected: VariableKey[];
  colourBy: VariableKey;
  onToggle: (key: VariableKey) => void;
  onColourByChange: (key: VariableKey) => void;
}

export function VariableSelector({
  selected,
  colourBy,
  onToggle,
  onColourByChange,
}: VariableSelectorProps) {
  const colourableSelected = VARIABLES.filter(
    (variable) => variable.colourable && selected.includes(variable.key),
  );

  return (
    <section className="control-block">
      <header className="control-block-header">
        <h2>Variables</h2>
        <span className="control-hint">{selected.length} plotted</span>
      </header>

      <div className="variable-grid">
        {VARIABLES.map((variable) => {
          const isSelected = selected.includes(variable.key);

          return (
            <button
              key={variable.key}
              type="button"
              className={`variable-chip ${isSelected ? 'variable-chip-active' : ''}`}
              onClick={() => onToggle(variable.key)}
              aria-pressed={isSelected}
            >
              <strong>{variable.shortLabel}</strong>
              <small>{variable.unit}</small>
            </button>
          );
        })}
      </div>

      <label className="field">
        <span>Colour trajectory by</span>
        <select
          value={colourBy}
          onChange={(event) => onColourByChange(event.target.value as VariableKey)}
        >
          {colourableSelected.length === 0 ? (
            <option value={colourBy}>Select a numeric variable</option>
          ) : (
            colourableSelected.map((variable) => (
              <option key={variable.key} value={variable.key}>
                {variable.label} ({variable.unit})
              </option>
            ))
          )}
        </select>
      </label>
    </section>
  );
}
