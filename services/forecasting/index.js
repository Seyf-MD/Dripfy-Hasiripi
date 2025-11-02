import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readCollection } from '../../server/services/storageService.js';
import { getCacheValue, setCacheValue } from '../../server/services/cacheService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PYTHON_EXECUTABLE = process.env.FORECAST_PYTHON || 'python3';
const DEFAULT_HORIZON = Number(process.env.FORECAST_HORIZON || 14);
const BASELINE_CACHE_KEY = 'finance-forecast:baseline';
const CACHE_TTL_SECONDS = Number(process.env.FORECAST_CACHE_TTL || 60 * 60 * 6);

const SCENARIO_CONFIG = {
  optimistic: {
    name: 'optimistic',
    label: 'Optimistic',
    growthBias: 0.12,
    volatilityFactor: 0.75,
  },
  pessimistic: {
    name: 'pessimistic',
    label: 'Pessimistic',
    growthBias: -0.08,
    volatilityFactor: 1.35,
  },
};

function normaliseAmount(record) {
  const rawAmount = typeof record.amount === 'number' ? record.amount : Number(record.amount || 0);
  if (!Number.isFinite(rawAmount)) {
    return 0;
  }

  if (record.type === 'Outgoing' && rawAmount > 0) {
    return -Math.abs(rawAmount);
  }

  return rawAmount;
}

function formatDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function buildDateRange(startDate, endDate) {
  const range = [];
  const current = new Date(startDate);
  const finalDate = new Date(endDate);
  while (current <= finalDate) {
    range.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }
  return range;
}

function buildFallbackSeries(days = 90) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  const series = [];
  let base = 2500;

  for (let i = 0; i < days; i += 1) {
    const current = new Date(start);
    current.setDate(current.getDate() + i);
    const seasonal = Math.sin((i / 7) * Math.PI) * 1200;
    const drift = i * 8;
    const noise = Math.sin((i / 3) * Math.PI) * 150;
    base = base + drift * 0.01;
    series.push({
      date: current.toISOString().slice(0, 10),
      value: base + seasonal + noise,
    });
  }

  return series;
}

function aggregateFinancialRecords(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return buildFallbackSeries();
  }

  const grouped = new Map();
  let minDate = null;
  let maxDate = null;

  records.forEach((record) => {
    const dateKey = formatDate(record.dueDate || record.date || record.createdAt);
    const amount = normaliseAmount(record);

    const currentTotal = grouped.get(dateKey) || 0;
    grouped.set(dateKey, currentTotal + amount);

    const currentDate = new Date(dateKey);
    if (!minDate || currentDate < minDate) {
      minDate = currentDate;
    }
    if (!maxDate || currentDate > maxDate) {
      maxDate = currentDate;
    }
  });

  if (!minDate || !maxDate) {
    return buildFallbackSeries();
  }

  // Extend range to include a small look-back period for stability
  const lookback = new Date(minDate);
  lookback.setDate(lookback.getDate() - 14);
  const dateRange = buildDateRange(lookback, maxDate);

  return dateRange.map((dateKey) => ({
    date: dateKey,
    value: grouped.get(dateKey) || 0,
  }));
}

function runForecastEngine({ series, horizon = DEFAULT_HORIZON }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ series, horizon, seasonality: 7 });
    const scriptPath = path.join(__dirname, 'forecast_engine.py');

    const python = spawn(PYTHON_EXECUTABLE, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    python.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    python.on('error', (error) => {
      reject(new Error(`Forecast engine failed to start: ${error.message}`));
    });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Forecast engine exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout || '{}');
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse forecast output: ${error.message} :: ${stdout}`));
      }
    });

    python.stdin.write(payload);
    python.stdin.end();
  });
}

function ensureNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function applyScenarioToBaseline(baseline, scenario) {
  const result = [];
  if (!Array.isArray(baseline) || baseline.length === 0) {
    return result;
  }

  const length = baseline.length;
  const maxMagnitude = Math.max(...baseline.map((point) => Math.abs(point.value || 0)), 1);

  baseline.forEach((point, index) => {
    const progress = length > 1 ? index / (length - 1) : 0;
    const growthDelta = point.value * scenario.growthBias * progress;
    const scenarioValue = point.value + growthDelta;

    const lowerGap = Math.abs(point.value - point.lower);
    const upperGap = Math.abs(point.upper - point.value);

    const adjustedLowerGap = lowerGap * scenario.volatilityFactor;
    const adjustedUpperGap = upperGap * scenario.volatilityFactor;

    const seasonalWiggle = Math.sin(progress * Math.PI * 2) * maxMagnitude * 0.02 * scenario.growthBias;

    result.push({
      date: point.date,
      value: scenarioValue + seasonalWiggle,
      lower: scenarioValue - adjustedLowerGap,
      upper: scenarioValue + adjustedUpperGap,
      baseline: point.value,
    });
  });

  return result;
}

function summariseScenario(series) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      total: 0,
      averageDaily: 0,
      change: 0,
      lastValue: 0,
    };
  }

  const total = series.reduce((sum, point) => sum + ensureNumeric(point.value), 0);
  const averageDaily = total / series.length;
  const first = ensureNumeric(series[0].value);
  const last = ensureNumeric(series[series.length - 1].value);

  return {
    total,
    averageDaily,
    change: last - first,
    lastValue: last,
  };
}

function buildRecommendationCards({ scenarioName, scenarioSummary, anomalies, stats }) {
  const cards = [];

  if (scenarioSummary.change > 0) {
    cards.push({
      title: 'Pozitif Trend',
      severity: 'positive',
      description: `Seçilen senaryoda dönem sonuna kadar ${scenarioSummary.change.toFixed(0)} € tutarında iyileşme bekleniyor. Erken faturalandırma ve tahsilat hızlandırma aksiyonları trendi güçlendirebilir.`,
    });
  } else if (scenarioSummary.change < 0) {
    cards.push({
      title: 'Negatif Trend Riski',
      severity: 'warning',
      description: `Projeksiyon, dönem sonunda ${Math.abs(scenarioSummary.change).toFixed(0)} € düşüşe işaret ediyor. Maliyet kalemlerini gözden geçirip gider erteleme senaryoları çalıştırın.`,
    });
  }

  if (stats?.volatilityIndex && stats.volatilityIndex > 1.2) {
    cards.push({
      title: 'Artan Dalgalanma',
      severity: 'warning',
      description: 'Nakit akışında normalden yüksek oynaklık tespit edildi. Kısa vadeli nakit rezervini güçlendirmek ve vadeli sözleşmeleri gözden geçirmek önerilir.',
    });
  }

  if (stats?.trendSlope && stats.trendSlope < 0) {
    cards.push({
      title: 'Trend Aşağı Yönlü',
      severity: 'critical',
      description: 'Geçmiş verilere göre net nakit akışında aşağı yönlü trend mevcut. Yeni gelir kalemleri eklemek ve tahsilatları hızlandırmak kritik görünüyor.',
    });
  }

  if (Array.isArray(anomalies) && anomalies.length > 0) {
    const severe = anomalies.find((item) => item.severity === 'high');
    if (severe) {
      cards.push({
        title: 'Anomali Alarmı',
        severity: 'critical',
        description: `${severe.date} tarihinde ${severe.value.toFixed(0)} € tutarında olağan dışı hareket görüldü. Kaydın doğruluğunu ve ilgili faturaları kontrol edin.`,
      });
    } else {
      cards.push({
        title: 'Hassas Günler',
        severity: 'info',
        description: 'Son dönemde normal sapma sınırını aşan hareketler mevcut. Bu tarihler için manuel doğrulama ve müşteri iletişimi önerilir.',
      });
    }
  }

  if (cards.length === 0) {
    cards.push({
      title: 'İstikrarlı Görünüm',
      severity: 'info',
      description: 'Mevcut veri seti ciddi bir risk sinyali üretmedi. Senaryoları takip etmeye ve aylık planı güncel tutmaya devam edin.',
    });
  }

  return cards;
}

function normaliseAnomalies(anomalies) {
  if (!Array.isArray(anomalies)) {
    return [];
  }

  return anomalies.map((item) => ({
    date: item.date,
    value: ensureNumeric(item.value),
    score: ensureNumeric(item.score),
    severity: item.severity || (Math.abs(item.score) > 2 ? 'high' : 'info'),
    description: item.description || 'Olağan dışı hareket algılandı.',
  }));
}

async function getBaselineForecast(series) {
  const cached = await getCacheValue(BASELINE_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const pythonResult = await runForecastEngine({ series, horizon: DEFAULT_HORIZON });

  const baseline = Array.isArray(pythonResult?.baseline) ? pythonResult.baseline : [];
  const history = Array.isArray(pythonResult?.history) ? pythonResult.history : series;
  const stats = pythonResult?.stats || {};
  const anomalies = normaliseAnomalies(pythonResult?.anomalies);

  const result = {
    baseline,
    history,
    stats,
    anomalies,
    generatedAt: new Date().toISOString(),
  };

  await setCacheValue(BASELINE_CACHE_KEY, result, CACHE_TTL_SECONDS);
  return result;
}

export async function getForecast({ scenario = 'optimistic', horizon = DEFAULT_HORIZON } = {}) {
  const scenarioKey = scenario in SCENARIO_CONFIG ? scenario : 'optimistic';
  const financialRecords = await readCollection('financials');
  const trainingSeries = aggregateFinancialRecords(financialRecords);

  const baselineResult = await getBaselineForecast(trainingSeries);
  const baselineSlice = baselineResult.baseline.slice(0, horizon);

  const scenarioConfig = SCENARIO_CONFIG[scenarioKey];
  const scenarioSeries = applyScenarioToBaseline(baselineSlice, scenarioConfig);
  const summary = summariseScenario(scenarioSeries);
  const anomalies = baselineResult.anomalies;

  const cards = buildRecommendationCards({
    scenarioName: scenarioKey,
    scenarioSummary: summary,
    anomalies,
    stats: baselineResult.stats,
  });

  const otherScenarios = Object.keys(SCENARIO_CONFIG)
    .filter((name) => name !== scenarioKey)
    .reduce((acc, name) => {
      const altSeries = applyScenarioToBaseline(baselineSlice, SCENARIO_CONFIG[name]);
      acc[name] = {
        name,
        label: SCENARIO_CONFIG[name].label,
        series: altSeries,
        summary: summariseScenario(altSeries),
      };
      return acc;
    }, {});

  return {
    generatedAt: baselineResult.generatedAt,
    scenario: {
      name: scenarioKey,
      label: scenarioConfig.label,
      series: scenarioSeries,
      summary,
    },
    baseline: baselineSlice,
    history: baselineResult.history,
    stats: baselineResult.stats,
    anomalies,
    recommendations: cards,
    scenarios: {
      [scenarioKey]: {
        name: scenarioKey,
        label: scenarioConfig.label,
        series: scenarioSeries,
        summary,
      },
      ...otherScenarios,
    },
  };
}

export function listForecastScenarios() {
  return Object.values(SCENARIO_CONFIG).map((scenario) => ({
    name: scenario.name,
    label: scenario.label,
  }));
}
