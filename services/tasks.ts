import type {
  Task,
  TaskAutomationTrigger,
  TaskTemplate,
} from '../types';
import {
  evaluateAutomationTriggers,
  instantiateTemplate,
  listAutomationTriggers,
  listTaskTemplates,
  type TaskAutomationEvent,
  type TemplateInstantiationResult,
} from './tasks/automation';

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
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await parseJson(response);
  if (!response.ok || data?.ok === false) {
    const message = data?.error?.message || fallbackMessage;
    throw new Error(message);
  }
  return data as T;
}

export async function createTask(input: {
  title: string;
  description?: string;
  assignee?: string;
  priority?: string;
  dueDate?: string;
}) {
  const response = await fetch(buildUrl('/api/automation/tasks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return handleResponse(response, 'Görev oluşturulamadı.');
}

export interface PersonalTaskInput {
  title: string;
  description?: string;
  assignee?: string;
  priority?: string;
  dueDate?: string;
  status?: Task['status'];
  personalNotes?: string;
  focusTags?: string[];
  reminders?: { id?: string; type?: string; minutesBefore?: number; scheduledAt?: string | null; createdAt?: string }[];
  schedule?: { start?: string | null; end?: string | null; allDay?: boolean; timezone?: string | null };
  calendarLinks?: {
    id?: string;
    provider?: string;
    integrationId?: string | null;
    calendarId?: string;
    eventId?: string | null;
    syncState?: string;
    lastSyncedAt?: string | null;
    lastError?: string | null;
  }[];
  color?: string | null;
  timezone?: string | null;
}

interface PersonalTaskResponse {
  ok: true;
  task: Task;
}

interface PersonalTaskListResponse {
  ok: true;
  tasks: Task[];
}

export async function fetchPersonalTasks() {
  const response = await fetch(buildUrl('/api/tasks/personal'), {
    method: 'GET',
    credentials: 'include',
  });
  const payload = await handleResponse<PersonalTaskListResponse>(response, 'Kişisel görevler alınamadı.');
  return payload.tasks;
}

export async function createPersonalTask(input: PersonalTaskInput) {
  const response = await fetch(buildUrl('/api/tasks/personal'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const payload = await handleResponse<PersonalTaskResponse>(response, 'Kişisel görev oluşturulamadı.');
  return payload.task;
}

export async function updatePersonalTask(
  taskId: string,
  changes: Partial<PersonalTaskInput>,
  expectedVersion?: number,
) {
  const response = await fetch(buildUrl(`/api/tasks/personal/${taskId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ changes, expectedVersion }),
  });
  const payload = await handleResponse<PersonalTaskResponse>(response, 'Görev güncellenemedi.');
  return payload.task;
}

export async function syncPersonalTask(taskId: string) {
  const response = await fetch(buildUrl(`/api/tasks/personal/${taskId}/sync`), {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response, 'Senkronizasyon başlatılamadı.');
}

export function getTaskTemplates(): TaskTemplate[] {
  return listTaskTemplates();
}

export function getTaskAutomationTriggers(): TaskAutomationTrigger[] {
  return listAutomationTriggers();
}

export function createTaskFromTemplate(
  templateId: string,
  options?: Parameters<typeof instantiateTemplate>[1],
): TemplateInstantiationResult {
  return instantiateTemplate(templateId, options);
}

export function evaluateTaskAutomation(event: TaskAutomationEvent) {
  return evaluateAutomationTriggers(event);
}
