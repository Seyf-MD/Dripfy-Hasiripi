import type { PlannerSyncStatus, PlannerSyncSummary, ScheduleEvent } from '../../types';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string) {
  if (!API_BASE) {
    return path;
  }
  return `${API_BASE}${path}`;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('[planning/sync] JSON parse failed', error);
    return {};
  }
}

async function handleResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const payload = await parseJson(response);
  if (!response.ok || payload?.ok === false) {
    const errorMessage = payload?.error?.message || fallbackMessage;
    throw new Error(errorMessage);
  }
  return payload as T;
}

export interface PlannerSyncOptions {
  range?: { start?: string; end?: string };
  includePersonalCalendar?: boolean;
  teamIds?: string[];
  events?: ScheduleEvent[];
}

export interface PlannerTaskSyncOptions {
  assignMissingTasks?: boolean;
  autoCreatePlaceholders?: boolean;
  teamId?: string;
}

export async function syncPlanningCalendar(options: PlannerSyncOptions = {}): Promise<PlannerSyncSummary> {
  const response = await fetch(buildUrl('/api/planning/sync/calendar'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      range: options.range,
      includePersonalCalendar: options.includePersonalCalendar,
      teamIds: options.teamIds,
      events: options.events,
    }),
  });
  return handleResponse<PlannerSyncSummary>(response, 'Planlama takvimi senkronize edilemedi.');
}

export async function syncPlanningTasks(options: PlannerTaskSyncOptions = {}): Promise<PlannerSyncSummary> {
  const response = await fetch(buildUrl('/api/planning/sync/tasks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      assignMissingTasks: options.assignMissingTasks,
      autoCreatePlaceholders: options.autoCreatePlaceholders,
      teamId: options.teamId,
    }),
  });
  return handleResponse<PlannerSyncSummary>(response, 'Görev planlaması senkronize edilemedi.');
}

export async function fetchPlanningSyncStatus(): Promise<PlannerSyncStatus> {
  const response = await fetch(buildUrl('/api/planning/sync/status'), {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse<PlannerSyncStatus>(response, 'Senkronizasyon durumu alınamadı.');
}

