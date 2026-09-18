import { useEffect, useRef } from 'react';
import { vesselColour } from '../constants/vessels';
import type { TrackResponse } from '../types/telemetry';
import { formatNumber, formatTimestamp } from '../utils/format';
import { pointAtTime } from '../utils/stats';

const PLAYBACK_INTERVAL_MS = 120;

interface ReplayBarProps {
  timeAxis: string[];
  index: number;
  playing: boolean;
  track: TrackResponse;
  onIndexChange: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
}

export function ReplayBar({
  timeAxis,
  index,
  playing,
  track,
  onIndexChange,
  onPlayingChange,
}: ReplayBarProps) {
  const maxIndex = Math.max(timeAxis.length - 1, 0);
  const currentTimestamp = timeAxis[Math.min(index, maxIndex)] ?? null;

  // Refs keep the interval stable while still reading the latest index.
  const indexRef = useRef(index);
  indexRef.current = index;
  const maxIndexRef = useRef(maxIndex);
  maxIndexRef.current = maxIndex;

  useEffect(() => {
    if (!playing || maxIndex === 0) return;

    const timer = window.setInterval(() => {
      const next = indexRef.current + 1;
      if (next > maxIndexRef.current) {
        onPlayingChange(false);
        return;
      }
      onIndexChange(next);
    }, PLAYBACK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [playing, maxIndex, onIndexChange, onPlayingChange]);

  const vesselIds = Object.keys(track).sort();
  const atEnd = index >= maxIndex;

  return (
    <div className="replay-bar">
      <div className="replay-controls">
        <button
          type="button"
          className="icon-btn"
          onClick={() => onIndexChange(0)}
          disabled={timeAxis.length === 0}
          aria-label="Jump to start"
        >
          ⏮
        </button>

        <button
          type="button"
          className="icon-btn icon-btn-primary"
          onClick={() => {
            if (atEnd) onIndexChange(0);
            onPlayingChange(!playing);
          }}
          disabled={timeAxis.length < 2}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
        >
          {playing ? '❚❚' : '▶'}
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => onIndexChange(maxIndex)}
          disabled={timeAxis.length === 0}
          aria-label="Jump to end"
        >
          ⏭
        </button>

        <span className="replay-timestamp">
          {currentTimestamp ? formatTimestamp(currentTimestamp) : '—'}
        </span>

        <span className="replay-progress">
          {timeAxis.length === 0 ? '0 / 0' : `${index + 1} / ${timeAxis.length}`}
        </span>
      </div>

      <input
        type="range"
        className="replay-slider"
        min={0}
        max={maxIndex}
        value={Math.min(index, maxIndex)}
        disabled={timeAxis.length === 0}
        onChange={(event) => {
          onPlayingChange(false);
          onIndexChange(Number(event.target.value));
        }}
      />

      <div className="replay-readouts">
        {vesselIds.map((vesselId) => {
          const point = currentTimestamp
            ? pointAtTime(track[vesselId], currentTimestamp)
            : null;

          return (
            <div key={vesselId} className="replay-readout">
              <span className="readout-dot" style={{ backgroundColor: vesselColour(vesselId) }} />
              <strong>{vesselId}</strong>
              {point ? (
                <span>
                  {formatNumber(point.speed)} kn · {formatNumber(point.rpm, 0)} rpm ·{' '}
                  {formatNumber(point.fuel_consumption, 2)} t/h
                </span>
              ) : (
                <span className="readout-idle">no data yet</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
