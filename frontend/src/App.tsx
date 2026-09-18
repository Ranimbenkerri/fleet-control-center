import { useCallback, useEffect, useMemo, useState } from 'react';
import { FleetMap } from './components/FleetMap';
import { MapLegend } from './components/MapLegend';
import { ReplayBar } from './components/ReplayBar';
import { StatsPanel } from './components/StatsPanel';
import { TimeWindowPicker, WINDOW_PRESETS } from './components/TimeWindowPicker';
import type { TimeWindow, WindowPreset } from './components/TimeWindowPicker';
import { VariableChart } from './components/VariableChart';
import { VariableSelector } from './components/VariableSelector';
import { VesselSelector } from './components/VesselSelector';
import type { Basemap } from './constants/basemaps';
import { BASEMAPS, DEFAULT_BASEMAP } from './constants/basemaps';
import type { VariableKey } from './constants/variables';
import { getVariable } from './constants/variables';
import { fetchTrack, fetchVessels } from './services/api';
import type { TrackResponse, VesselSummary } from './types/telemetry';
import type { Ramp } from './utils/colourScale';
import { DEFAULT_RAMP } from './utils/colourScale';
import {
  apiTimestampToDate,
  dateToApiTimestamp,
  formatTimestamp,
} from './utils/format';
import {
  buildTimeAxis,
  computeFleetStats,
  computeValueRange,
} from './utils/stats';
import './App.css';

const DEFAULT_VARIABLES: VariableKey[] = ['speed', 'rpm'];
const MAX_POINTS = 1200;

function shiftWindowEnd(end: string, days: number): string {
  const start = apiTimestampToDate(end);
  start.setDate(start.getDate() - days);
  return dateToApiTimestamp(start);
}

export function App() {
  const [vessels, setVessels] = useState<VesselSummary[]>([]);
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [bounds, setBounds] = useState<TimeWindow | null>(null);
  const [window_, setWindow] = useState<TimeWindow | null>(null);

  const [variables, setVariables] = useState<VariableKey[]>(DEFAULT_VARIABLES);
  const [colourBy, setColourBy] = useState<VariableKey>('speed');

  const [track, setTrack] = useState<TrackResponse>({});
  const [cursorIndex, setCursorIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>(DEFAULT_BASEMAP);
  const [ramp, setRamp] = useState<Ramp>(DEFAULT_RAMP);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bootstrap: discover the fleet and derive the default 7-day window.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);

      try {
        const fleet = await fetchVessels();
        if (cancelled) return;

        setVessels(fleet);

        if (fleet.length === 0) {
          setError('The dataset contains no vessels.');
          return;
        }

        const first = fleet.reduce(
          (min, vessel) => (vessel.first_timestamp < min ? vessel.first_timestamp : min),
          fleet[0].first_timestamp,
        );
        const last = fleet.reduce(
          (max, vessel) => (vessel.last_timestamp > max ? vessel.last_timestamp : max),
          fleet[0].last_timestamp,
        );

        setBounds({ start: first, end: last });
        setWindow({ start: shiftWindowEnd(last, 7), end: last });
        setSelectedVessels([fleet[0].vessel_id]);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load the fleet inventory', err);
        setError(
          'Cannot reach the telemetry API on http://127.0.0.1:8000. Start the FastAPI backend and reload.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const windowInvalid = window_ !== null && window_.start >= window_.end;

  // Reload the track whenever the selection or the window changes.
  useEffect(() => {
    if (!window_ || windowInvalid || selectedVessels.length === 0) {
      setTrack({});
      return;
    }

    let cancelled = false;

    const loadTrack = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchTrack({
          vesselIds: selectedVessels,
          start: window_.start,
          end: window_.end,
          maxPoints: MAX_POINTS,
        });
        if (cancelled) return;

        setTrack(response);
        setPlaying(false);
        setCursorIndex(Math.max(buildTimeAxis(response).length - 1, 0));
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load telemetry', err);
        setError('Telemetry request failed. Check that the FastAPI backend is running.');
        setTrack({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadTrack();
    return () => {
      cancelled = true;
    };
  }, [selectedVessels, window_, windowInvalid]);

  const timeAxis = useMemo(() => buildTimeAxis(track), [track]);
  const currentTimestamp = timeAxis[Math.min(cursorIndex, timeAxis.length - 1)] ?? null;

  const colourVariable = useMemo(() => getVariable(colourBy), [colourBy]);
  const colourRange = useMemo(
    () => computeValueRange(track, colourVariable),
    [track, colourVariable],
  );

  const stats = useMemo(() => computeFleetStats(track), [track]);
  const selectedVariableDefs = useMemo(
    () => variables.map(getVariable),
    [variables],
  );

  const handleToggleVessel = useCallback((vesselId: string) => {
    setSelectedVessels((current) =>
      current.includes(vesselId)
        ? current.filter((id) => id !== vesselId)
        : [...current, vesselId].sort(),
    );
  }, []);

  const handleToggleVariable = useCallback((key: VariableKey) => {
    setVariables((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }, []);

  // Keep the gradient bound to a variable that is still selected and colourable.
  useEffect(() => {
    const active = getVariable(colourBy);
    if (variables.includes(colourBy) && active.colourable) return;

    const fallback = variables.map(getVariable).find((variable) => variable.colourable);
    if (fallback) setColourBy(fallback.key);
  }, [variables, colourBy]);

  const handlePreset = useCallback(
    (preset: WindowPreset) => {
      if (!bounds) return;
      setWindow(
        preset.days === 0
          ? { ...bounds }
          : { start: shiftWindowEnd(bounds.end, preset.days), end: bounds.end },
      );
    },
    [bounds],
  );

  const vesselIds = useMemo(() => Object.keys(track).sort(), [track]);
  const hasTrack = vesselIds.length > 0;

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <header className="sidebar-header">
          <span className="brand-badge">Fleet Control Center</span>
          <h1>Voyage Replay &amp; Analysis</h1>
          {bounds && (
            <p className="brand-subtitle">
              Dataset {formatTimestamp(bounds.start)} → {formatTimestamp(bounds.end)}
            </p>
          )}
        </header>

        <div className="sidebar-scroll">
          <VesselSelector
            vessels={vessels}
            selected={selectedVessels}
            onToggle={handleToggleVessel}
          />

          {window_ && bounds && (
            <TimeWindowPicker
              value={window_}
              bounds={bounds}
              onChange={setWindow}
              onPreset={handlePreset}
              invalid={windowInvalid}
            />
          )}

          <VariableSelector
            selected={variables}
            colourBy={colourBy}
            onToggle={handleToggleVariable}
            onColourByChange={setColourBy}
          />

          <StatsPanel stats={stats} />
        </div>

        <footer className="sidebar-footer">
          {WINDOW_PRESETS.length > 0 && (
            <span className="footer-note">
              {hasTrack
                ? `${timeAxis.length} time steps · ${vesselIds.length} vessel${vesselIds.length > 1 ? 's' : ''}`
                : 'No data in the current selection'}
            </span>
          )}
        </footer>
      </aside>

      <main className="workspace">
        <div className="map-region">
          {loading && <div className="status-pill">Loading telemetry…</div>}
          {error && <div className="status-pill status-error">{error}</div>}

          <div className="basemap-switch">
            {BASEMAPS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`basemap-chip ${option.id === basemap.id ? 'basemap-chip-active' : ''}`}
                onClick={() => setBasemap(option)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <MapLegend
            variable={colourVariable}
            range={colourRange}
            vesselIds={vesselIds}
            ramp={ramp}
            onRampChange={setRamp}
          />

          <FleetMap
            track={track}
            colourVariable={colourVariable}
            colourRange={colourRange}
            currentTimestamp={currentTimestamp}
            basemap={basemap}
            ramp={ramp}
          />

          <ReplayBar
            timeAxis={timeAxis}
            index={cursorIndex}
            playing={playing}
            track={track}
            onIndexChange={setCursorIndex}
            onPlayingChange={setPlaying}
          />
        </div>

        <section className="charts-region">
          {selectedVariableDefs.length === 0 ? (
            <p className="empty-state">
              Pick one or more variables in the sidebar to plot them over time.
            </p>
          ) : (
            selectedVariableDefs.map((variable) => (
              <VariableChart
                key={variable.key}
                variable={variable}
                track={track}
                timeAxis={timeAxis}
                cursorIndex={Math.min(cursorIndex, timeAxis.length - 1)}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
