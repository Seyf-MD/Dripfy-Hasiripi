import type { CalendarIntegrationAccount, PlannerCalendarEvent } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response, fallback: string): Promise<T> {
  const data = await parseJson(response);
  if (!response.ok || data?.ok === false) {
    const message = data?.error?.message || fallback;
    throw new Error(message);
  }
  return data as T;
}

export async function fetchIntegrationAccounts(): Promise<CalendarIntegrationAccount[]> {
  const response = await fetch(buildUrl('/api/integrations/accounts'), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await handleResponse<{ ok: true; accounts: CalendarIntegrationAccount[] }>(
    response,
    'Bağlı hesaplar alınamadı.',
  );
  return payload.accounts;
}

export async function startOAuthConnection(
  provider: string,
  redirectUri: string,
  scopes?: string[],
) {
  const response = await fetch(buildUrl('/api/integrations/oauth/start'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, redirectUri, scopes }),
  });
  return handleResponse<{ ok: true; authUrl: string; state: string }>(response, 'OAuth başlatılamadı.');
}

export async function completeOAuthConnection(
  provider: string,
  code: string,
  state: string,
  redirectUri?: string,
) {
  const response = await fetch(buildUrl('/api/integrations/oauth/complete'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ provider, code, state, redirectUri }),
  });
  const payload = await handleResponse<{ ok: true; integration: CalendarIntegrationAccount }>(
    response,
    'OAuth tamamlanamadı.',
  );
  return payload.integration;
}

export async function updateIntegrationPreferencesApi(
  integrationId: string,
  preferences: Partial<CalendarIntegrationAccount['preferences']>,
) {
  const response = await fetch(buildUrl(`/api/integrations/accounts/${integrationId}/preferences`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ preferences }),
  });
  const payload = await handleResponse<{ ok: true; account: CalendarIntegrationAccount }>(
    response,
    'Tercihler kaydedilemedi.',
  );
  return payload.account;
}

export async function revokeIntegrationAccount(integrationId: string) {
  const response = await fetch(buildUrl(`/api/integrations/accounts/${integrationId}`), {
    method: 'DELETE',
    credentials: 'include',
  });
  const payload = await handleResponse<{ ok: true; account: CalendarIntegrationAccount }>(
    response,
    'Bağlantı kaldırılamadı.',
  );
  return payload.account;
}

export async function triggerIntegrationSync(integrationId: string) {
  const response = await fetch(buildUrl(`/api/integrations/accounts/${integrationId}/sync`), {
    method: 'POST',
    credentials: 'include',
  });
  const payload = await handleResponse<{ ok: true; account: CalendarIntegrationAccount }>(
    response,
    'Senkronizasyon başlatılamadı.',
  );
  return payload.account;
}

export interface CalendarEventsResponse {
  ok: true;
  events: PlannerCalendarEvent[];
}

export async function fetchPlannerEvents(range?: { start?: string; end?: string }) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const url = new URL(buildUrl('/api/integrations/calendar/events'), base);
  if (range?.start) {
    url.searchParams.set('rangeStart', range.start);
  }
  if (range?.end) {
    url.searchParams.set('rangeEnd', range.end);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await handleResponse<CalendarEventsResponse>(response, 'Takvim verileri alınamadı.');
  return payload.events;
}
