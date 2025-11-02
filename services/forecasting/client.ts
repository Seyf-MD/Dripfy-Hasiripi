import { FinanceForecastData, FinanceForecastResponse } from '../../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.warn('[forecast-service] Failed to parse JSON response', error);
    return {};
  }
}

export interface FetchForecastOptions {
  scenario?: 'optimistic' | 'pessimistic';
  horizon?: number;
  signal?: AbortSignal;
}

export async function fetchFinanceForecast({ scenario, horizon, signal }: FetchForecastOptions = {}): Promise<FinanceForecastData> {
  const search = new URLSearchParams();
  if (scenario) {
    search.set('scenario', scenario);
  }
  if (horizon) {
    search.set('horizon', String(horizon));
  }

  const query = search.toString();
  const url = buildUrl(`/api/finance/forecast${query ? `?${query}` : ''}`);

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    signal,
  });

  const payload = (await parseJson(response)) as FinanceForecastResponse;
  if (!response.ok || !payload?.ok) {
    const message = payload?.error?.message || 'Tahmin verileri alınamadı.';
    throw new Error(message);
  }

  return payload.data as FinanceForecastData;
}

export async function fetchForecastScenarios(): Promise<{ name: string; label: string }[]> {
  const response = await fetch(buildUrl('/api/finance/forecast/scenarios'), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await parseJson(response);
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error?.message || 'Senaryolar alınamadı.');
  }
  return Array.isArray(payload?.scenarios) ? payload.scenarios : [];
}
