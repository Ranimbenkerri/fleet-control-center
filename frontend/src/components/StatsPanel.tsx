import { vesselColour } from '../constants/vessels';
import { formatDuration, formatNumber } from '../utils/format';
import type { VesselStats } from '../utils/stats';

interface StatsPanelProps {
  stats: VesselStats[];
}

export function StatsPanel({ stats }: StatsPanelProps) {
  if (stats.length === 0) {
    return (
      <section className="control-block">
        <header className="control-block-header">
          <h2>Window KPIs</h2>
        </header>
        <p className="empty-state">
          Select at least one vessel and a valid time window to compute KPIs.
        </p>
      </section>
    );
  }

  return (
    <section className="control-block">
      <header className="control-block-header">
        <h2>Window KPIs</h2>
        <span className="control-hint">integrated over the selection</span>
      </header>

      <div className="stats-list">
        {stats.map((stat) => (
          <article key={stat.vesselId} className="stats-card">
            <header>
              <span className="stats-dot" style={{ backgroundColor: vesselColour(stat.vesselId) }} />
              <strong>{stat.vesselId}</strong>
              <small>{formatDuration(stat.elapsedHours)}</small>
            </header>

            <dl className="stats-grid">
              <div>
                <dt>Avg SOG</dt>
                <dd>{formatNumber(stat.avgSpeedKn)} kn</dd>
              </div>
              <div>
                <dt>Max SOG</dt>
                <dd>{formatNumber(stat.maxSpeedKn)} kn</dd>
              </div>
              <div>
                <dt>Distance</dt>
                <dd>{formatNumber(stat.distanceNm, 0)} nm</dd>
              </div>
              <div>
                <dt>Fuel</dt>
                <dd>{formatNumber(stat.fuelTonnes, 1)} t</dd>
              </div>
              <div>
                <dt>Fuel cost</dt>
                <dd>${formatNumber(stat.fuelCostUsd, 0)}</dd>
              </div>
              <div>
                <dt>Samples</dt>
                <dd>{formatNumber(stat.sampleCount, 0)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
