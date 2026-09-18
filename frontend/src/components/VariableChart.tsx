import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartOptions, Plugin } from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { THEME } from '../constants/theme';
import type { VariableDefinition } from '../constants/variables';
import { vesselColour } from '../constants/vessels';
import type { TrackResponse } from '../types/telemetry';
import { formatTimestamp } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const GRID_COLOUR = THEME.chartGrid;
const TICK_COLOUR = THEME.textMuted;

/** Vertical rule marking where the replay scrubber currently sits. */
const replayCursorPlugin: Plugin<'line'> = {
  id: 'replayCursor',
  afterDatasetsDraw(chart) {
    const cursorIndex = (chart.options as { cursorIndex?: number }).cursorIndex;
    if (cursorIndex === undefined || cursorIndex < 0) return;

    const x = chart.scales.x.getPixelForValue(cursorIndex);
    if (!Number.isFinite(x)) return;

    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.lineWidth = 1;
    ctx.strokeStyle = THEME.cursorLine;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(replayCursorPlugin);

interface VariableChartProps {
  variable: VariableDefinition;
  track: TrackResponse;
  timeAxis: string[];
  cursorIndex: number;
}

export function VariableChart({
  variable,
  track,
  timeAxis,
  cursorIndex,
}: VariableChartProps) {
  const vesselIds = useMemo(() => Object.keys(track).sort(), [track]);

  const data = useMemo(() => {
    // Align every vessel on the shared time axis so tooltips compare like for like.
    const datasets = vesselIds.map((vesselId) => {
      const byTimestamp = new Map(
        track[vesselId].map((point) => [point.timestamp, variable.accessor(point)]),
      );

      return {
        label: vesselId,
        data: timeAxis.map((timestamp) => byTimestamp.get(timestamp) ?? null),
        borderColor: vesselColour(vesselId),
        backgroundColor: `${vesselColour(vesselId)}22`,
        borderWidth: 1.6,
        pointRadius: 0,
        pointHitRadius: 8,
        spanGaps: true,
        tension: 0.25,
        fill: vesselIds.length === 1,
      };
    });

    return { labels: timeAxis, datasets };
  }, [vesselIds, track, timeAxis, variable]);

  const options = useMemo(
    () =>
      ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cursorIndex,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: vesselIds.length > 1,
            position: 'top',
            align: 'end',
            labels: {
              color: TICK_COLOUR,
              boxWidth: 8,
              boxHeight: 8,
              usePointStyle: true,
              font: { size: 10 },
            },
          },
          tooltip: {
            backgroundColor: THEME.tooltipBg,
            borderColor: THEME.tooltipBorder,
            borderWidth: 1,
            titleColor: THEME.textPrimary,
            bodyColor: THEME.textPrimary,
            callbacks: {
              title: (items) =>
                items.length > 0 ? formatTimestamp(String(items[0].label)) : '',
              label: (item) =>
                `${item.dataset.label}: ${Number(item.parsed.y).toFixed(variable.decimals)} ${variable.unit}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: GRID_COLOUR },
            border: { display: false },
            ticks: {
              color: TICK_COLOUR,
              font: { size: 9 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6,
              callback(_value: unknown, index: number) {
                const label = timeAxis[index];
                return label ? formatTimestamp(label).slice(0, 10) : '';
              },
            },
          },
          y: {
            grid: { color: GRID_COLOUR },
            border: { display: false },
            ticks: {
              color: TICK_COLOUR,
              font: { size: 9 },
              maxTicksLimit: 5,
              callback: (value: string | number) => Number(value).toFixed(variable.decimals),
            },
          },
        },
      }) as ChartOptions<'line'>,
    [vesselIds.length, timeAxis, variable, cursorIndex],
  );

  return (
    <article className="chart-card">
      <header className="chart-header">
        <h3>{variable.label}</h3>
        <span>{variable.unit}</span>
      </header>
      <div className="chart-body">
        <Line data={data} options={options} />
      </div>
    </article>
  );
}
