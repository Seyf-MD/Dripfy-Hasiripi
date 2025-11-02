import * as React from 'react';
import type { ForecastScenario, ForecastPoint } from '../../types';

interface ForecastChartProps {
  history: { date: string; value: number }[];
  baseline: ForecastPoint[];
  activeScenario: ForecastScenario;
  comparisonScenarios: ForecastScenario[];
  onScenarioChange?: (scenario: string) => void;
}

const CHART_HEIGHT = 320;
const CHART_WIDTH = 640;
const MARGINS = { top: 32, right: 24, bottom: 32, left: 56 };

function toDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildLinePath(points: { date: string; value: number }[], getY: (point: { date: string; value: number }) => number, getX: (date: string) => number) {
  if (!points.length) return '';
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${getX(point.date)} ${getY(point)}`;
    })
    .join(' ');
}

function buildScenarioArea(series: ForecastPoint[], getX: (date: string) => number, getYValue: (value: number) => number) {
  if (!series.length) return '';
  const upperPath = series.map(point => `L ${getX(point.date)} ${getYValue(point.upper)}`);
  const lowerPath = [...series]
    .reverse()
    .map(point => `L ${getX(point.date)} ${getYValue(point.lower)}`);
  const first = series[0];
  const start = `M ${getX(first.date)} ${getYValue(first.lower)}`;
  return `${start} ${upperPath.join(' ')} ${lowerPath.join(' ')} Z`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

function formatDateLabel(value: string) {
  const date = toDate(value);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  history,
  baseline,
  activeScenario,
  comparisonScenarios,
  onScenarioChange,
}) => {
  const allPoints = React.useMemo(() => {
    const combined = [
      ...history.map((point) => ({ ...point, source: 'history' as const })),
      ...baseline.map((point) => ({ date: point.date, value: point.value, source: 'baseline' as const })),
      ...activeScenario.series.map((point) => ({ date: point.date, value: point.value, source: 'scenario' as const })),
    ];
    return combined;
  }, [history, baseline, activeScenario.series]);

  const [minDate, maxDate] = React.useMemo(() => {
    if (!allPoints.length) {
      const now = new Date();
      return [now, now];
    }
    const sorted = allPoints.map(point => toDate(point.date)).sort((a, b) => a.getTime() - b.getTime());
    return [sorted[0], sorted[sorted.length - 1]];
  }, [allPoints]);

  const [minValue, maxValue] = React.useMemo(() => {
    if (!allPoints.length) return [-1000, 1000];
    const values = [
      ...history.map(point => point.value),
      ...baseline.flatMap(point => [point.lower, point.upper]),
      ...activeScenario.series.flatMap(point => [point.lower, point.upper, point.value]),
    ];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return [min - 100, max + 100];
    }
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [allPoints, history, baseline, activeScenario.series]);

  const innerWidth = CHART_WIDTH - MARGINS.left - MARGINS.right;
  const innerHeight = CHART_HEIGHT - MARGINS.top - MARGINS.bottom;

  const getX = React.useCallback(
    (date: string) => {
      const dateMs = toDate(date).getTime();
      const minMs = minDate.getTime();
      const maxMs = maxDate.getTime();
      const span = maxMs - minMs || 1;
      const ratio = (dateMs - minMs) / span;
      return MARGINS.left + ratio * innerWidth;
    },
    [innerWidth, minDate, maxDate],
  );

  const getYValue = React.useCallback(
    (value: number) => {
      const span = maxValue - minValue || 1;
      const ratio = (value - minValue) / span;
      return CHART_HEIGHT - MARGINS.bottom - ratio * innerHeight;
    },
    [innerHeight, maxValue, minValue],
  );

  const historyPath = React.useMemo(() => buildLinePath(history, point => getYValue(point.value), getX), [history, getYValue, getX]);
  const baselinePath = React.useMemo(() => buildLinePath(baseline.map(point => ({ date: point.date, value: point.value })), point => getYValue(point.value), getX), [baseline, getYValue, getX]);
  const scenarioPath = React.useMemo(() => buildLinePath(activeScenario.series.map(point => ({ date: point.date, value: point.value })), point => getYValue(point.value), getX), [activeScenario.series, getYValue, getX]);
  const scenarioAreaPath = React.useMemo(() => buildScenarioArea(activeScenario.series, getX, getYValue), [activeScenario.series, getX, getYValue]);

  const ticks = React.useMemo(() => {
    const tickCount = 4;
    const span = maxDate.getTime() - minDate.getTime();
    if (span <= 0) {
      return [minDate];
    }
    return Array.from({ length: tickCount + 1 }, (_, index) => new Date(minDate.getTime() + (span * index) / tickCount));
  }, [minDate, maxDate]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">Senaryo Tahminleri</h3>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">Seçili senaryoya göre 14 günlük nakit akışı projeksiyonu.</p>
        </div>
        {([activeScenario, ...comparisonScenarios]).length > 0 && (
          <div className="flex items-center gap-2 bg-white/60 dark:bg-neutral-800/70 border border-slate-200 dark:border-neutral-700 rounded-lg px-3 py-2">
            {[activeScenario, ...comparisonScenarios].map((scenario) => {
              const isActive = scenario.name === activeScenario.name;
              return (
                <button
                  key={scenario.name}
                  onClick={() => onScenarioChange?.(scenario.name)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-[var(--drip-primary)] text-white shadow-sm'
                      : 'text-[var(--drip-text)] dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-700'
                  }`}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-6 shadow-sm">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-full">
          <defs>
            <linearGradient id="forecastArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--drip-primary)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--drip-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <g className="grid" stroke="currentColor" strokeOpacity={0.06}>
            {ticks.map((tick, index) => {
              const x = getX(tick.toISOString());
              return <line key={`v-${index}`} x1={x} x2={x} y1={MARGINS.top} y2={CHART_HEIGHT - MARGINS.bottom} />;
            })}
          </g>

          <path d={scenarioAreaPath} fill="url(#forecastArea)" stroke="none" />
          <path d={baselinePath} stroke="var(--drip-muted)" strokeWidth={1.5} fill="none" strokeDasharray="4 4" />
          <path d={historyPath} stroke="var(--drip-primary-dark, #2563eb)" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={scenarioPath} stroke="var(--drip-primary)" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />

          <g className="axis">
            {ticks.map((tick, index) => {
              const x = getX(tick.toISOString());
              const label = formatDateLabel(tick.toISOString());
              return (
                <g key={index} transform={`translate(${x}, ${CHART_HEIGHT - MARGINS.bottom + 16})`}>
                  <text textAnchor="middle" className="text-[10px] fill-[var(--drip-muted)] dark:fill-neutral-400">
                    {label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 dark:bg-neutral-800/60 p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--drip-muted)] dark:text-neutral-400">Senaryo Özeti</p>
            <p className="mt-2 text-2xl font-semibold text-[var(--drip-text)] dark:text-white">{formatCurrency(activeScenario.summary.lastValue)}</p>
            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
              Ortalama günlük akış {formatCurrency(activeScenario.summary.averageDaily)} ve dönem sonunda {formatCurrency(activeScenario.summary.change)} değişim bekleniyor.
            </p>
          </div>
          {comparisonScenarios.map((scenario) => (
            <div key={scenario.name} className="rounded-lg border border-slate-200 dark:border-neutral-700 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--drip-muted)] dark:text-neutral-400">{scenario.label}</p>
              <p className="mt-2 text-lg font-semibold text-[var(--drip-text)] dark:text-white">{formatCurrency(scenario.summary.lastValue)}</p>
              <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
                Δ {formatCurrency(scenario.summary.change)} · Günlük {formatCurrency(scenario.summary.averageDaily)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ForecastChart;
