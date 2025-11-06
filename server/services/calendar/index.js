import { randomUUID } from 'node:crypto';
import { readCollection, writeCollection } from '../storageService.js';
import * as googleProvider from './providers/google.js';
import * as outlookProvider from './providers/outlook.js';
import { createState, consumeState } from './stateStore.js';

const PROVIDERS = {
  google: googleProvider,
  outlook: outlookProvider,
};

const DEFAULT_PREFERENCES = {
  autoSync: true,
  syncWindowDays: 30,
  reminderMinutesBefore: 30,
  allowWebhookFallback: true,
};

let schedulerHandle = null;

function getProvider(provider) {
  const key = typeof provider === 'string' ? provider.toLowerCase() : '';
  const implementation = PROVIDERS[key];
  if (!implementation) {
    throw new Error(`Unsupported calendar provider: ${provider}`);
  }
  return implementation;
}

async function readIntegrationsRaw() {
  const integrations = await readCollection('calendarIntegrations');
  return Array.isArray(integrations) ? integrations : [];
}

async function writeIntegrationsRaw(integrations) {
  await writeCollection('calendarIntegrations', integrations);
}

function sanitizeIntegration(entry) {
  const { credentials, ...rest } = entry;
  return {
    ...rest,
    expiresAt: credentials?.expiresAt ?? null,
    hasRefreshToken: Boolean(credentials?.refreshToken),
  };
}

function mergePreferences(current, updates) {
  return {
    ...DEFAULT_PREFERENCES,
    ...(current || {}),
    ...(updates || {}),
  };
}

export function createOAuthState({ userId, provider, redirectUri }) {
  return createState({ userId, provider, redirectUri });
}

export function consumeOAuthState(state) {
  return consumeState(state);
}

export async function buildAuthUrl({ provider, state, redirectUri, scopes, prompt }) {
  const impl = getProvider(provider);
  return impl.buildAuthUrl({ state, redirectUri, scopes, prompt });
}

export async function completeOAuth({ userId, provider, code, redirectUri }) {
  const impl = getProvider(provider);
  const token = await impl.exchangeCode({ code, redirectUri });
  const profile = await impl.fetchProfile(token);
  const integrations = await readIntegrationsRaw();
  const now = new Date().toISOString();

  const baseIntegration = {
    id: randomUUID(),
    provider,
    userId,
    accountId: profile.id || randomUUID(),
    accountEmail: profile.email,
    accountName: profile.name || profile.email,
    scopes: token.scope || [],
    redirectUri,
    credentials: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt || null,
      tokenType: token.tokenType || 'Bearer',
      obtainedAt: token.obtainedAt || now,
    },
    preferences: mergePreferences(null, null),
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: null,
    syncStatus: 'idle',
    webhook: null,
  };

  const existingIndex = integrations.findIndex((entry) =>
    entry.userId === userId && entry.provider === provider && entry.accountEmail === baseIntegration.accountEmail,
  );

  let integration;
  if (existingIndex >= 0) {
    integration = {
      ...integrations[existingIndex],
      ...baseIntegration,
      preferences: mergePreferences(integrations[existingIndex].preferences, null),
      id: integrations[existingIndex].id,
      createdAt: integrations[existingIndex].createdAt,
      updatedAt: now,
    };
    integrations[existingIndex] = integration;
  } else {
    integration = baseIntegration;
    integrations.push(integration);
  }

  await writeIntegrationsRaw(integrations);
  return sanitizeIntegration(integration);
}

export async function listIntegrations(userId) {
  const integrations = await readIntegrationsRaw();
  return integrations
    .filter((entry) => entry.userId === userId)
    .map(sanitizeIntegration);
}

export async function updateIntegrationPreferences(userId, integrationId, updates) {
  const integrations = await readIntegrationsRaw();
  const index = integrations.findIndex((entry) => entry.id === integrationId && entry.userId === userId);
  if (index === -1) {
    throw new Error('Integration not found');
  }
  const now = new Date().toISOString();
  const updated = {
    ...integrations[index],
    preferences: mergePreferences(integrations[index].preferences, updates),
    updatedAt: now,
  };
  integrations[index] = updated;
  await writeIntegrationsRaw(integrations);
  return sanitizeIntegration(updated);
}

export async function revokeIntegration(userId, integrationId) {
  const integrations = await readIntegrationsRaw();
  const index = integrations.findIndex((entry) => entry.id === integrationId && entry.userId === userId);
  if (index === -1) {
    throw new Error('Integration not found');
  }
  const [removed] = integrations.splice(index, 1);
  await writeIntegrationsRaw(integrations);
  const impl = getProvider(removed.provider);
  try {
    await impl.revoke?.(removed);
  } catch (error) {
    console.warn('[calendar] revoke failed', error);
  }
  return sanitizeIntegration(removed);
}

export async function fetchCalendarSnapshot(userId, { rangeStart, rangeEnd } = {}) {
  const events = await readCollection('calendar');
  const integrations = await readIntegrationsRaw();
  const allowedIds = new Set(
    integrations.filter((entry) => entry.userId === userId).map((entry) => entry.id),
  );
  const startTs = rangeStart ? new Date(rangeStart).getTime() : null;
  const endTs = rangeEnd ? new Date(rangeEnd).getTime() : null;

  return events.filter((event) => {
    if (event.integrationId && !allowedIds.has(event.integrationId)) {
      return false;
    }
    if (startTs && event.start) {
      const eventStart = new Date(event.start).getTime();
      if (Number.isFinite(eventStart) && eventStart < startTs) {
        return false;
      }
    }
    if (endTs && event.start) {
      const eventStart = new Date(event.start).getTime();
      if (Number.isFinite(eventStart) && eventStart > endTs) {
        return false;
      }
    }
    return true;
  });
}

function mapTaskToEvent(task, link) {
  const schedule = task.personalization?.schedule || {};
  return {
    id: `${task.id}:${link.provider}:${link.integrationId || 'local'}`,
    taskId: task.id,
    title: task.title,
    description: task.description,
    provider: link.provider,
    integrationId: link.integrationId || null,
    calendarId: link.calendarId || 'primary',
    eventId: link.eventId || null,
    start: schedule.start || task.dueDate,
    end: schedule.end || null,
    allDay: Boolean(schedule.allDay),
    timezone: schedule.timezone || null,
    status: link.syncState || 'pending',
    updatedAt: new Date().toISOString(),
  };
}

export async function queueTaskSync(task) {
  if (!task || !Array.isArray(task.calendarLinks) || task.calendarLinks.length === 0) {
    return;
  }
  const events = await readCollection('calendar');
  const filtered = events.filter((event) => event.taskId !== task.id);
  const mapped = task.calendarLinks.map((link) => mapTaskToEvent(task, link));
  await writeCollection('calendar', [...filtered, ...mapped]);
}

async function updateTaskCollection(mapper) {
  const tasks = await readCollection('tasks');
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { updated: false, tasks };
  }
  let mutated = false;
  const now = new Date().toISOString();
  const nextTasks = tasks.map((task) => {
    const result = mapper(task, now);
    if (result === task) {
      return task;
    }
    mutated = true;
    return result;
  });
  if (mutated) {
    await writeCollection('tasks', nextTasks);
  }
  return { updated: mutated, tasks: nextTasks };
}

export async function performScheduledSync({ forcedTaskIds = [] } = {}) {
  const integrations = await readIntegrationsRaw();
  const now = new Date().toISOString();
  let integrationsChanged = false;

  const activeIntegrations = integrations.map((integration) => {
    if (!integration.preferences?.autoSync) {
      return integration;
    }
    const next = { ...integration };
    next.lastSyncedAt = now;
    next.syncStatus = 'ok';
    integrationsChanged = true;
    return next;
  });

  if (integrationsChanged) {
    await writeIntegrationsRaw(activeIntegrations);
  }

  const forcedSet = new Set(forcedTaskIds);
  const { updated } = await updateTaskCollection((task, timestamp) => {
    if (!Array.isArray(task.calendarLinks) || task.calendarLinks.length === 0) {
      return task;
    }
    let changed = false;
    const nextLinks = task.calendarLinks.map((link) => {
      if (!link) {
        return link;
      }
      const shouldSync = forcedSet.has(task.id) || link.syncState === 'pending';
      if (!shouldSync) {
        return link;
      }
      const integration = activeIntegrations.find((entry) => entry.id === link.integrationId);
      if (!integration) {
        if (link.syncState !== 'error' || link.lastError !== 'integration-missing') {
          changed = true;
          return {
            ...link,
            syncState: 'error',
            lastError: 'integration-missing',
            lastSyncedAt: timestamp,
          };
        }
        return link;
      }
      changed = true;
      return {
        ...link,
        syncState: 'synced',
        lastError: null,
        lastSyncedAt: timestamp,
      };
    });
    if (!changed) {
      return task;
    }
    const nextVersion = typeof task.version === 'number' ? task.version + 1 : 1;
    const nextTask = {
      ...task,
      calendarLinks: nextLinks,
      updatedAt: timestamp,
      version: nextVersion,
    };
    queueTaskSync(nextTask).catch((error) => {
      console.error('[calendar] Failed to queue task sync during scheduled sync', error);
    });
    return nextTask;
  });

  return {
    timestamp: now,
    syncedIntegrations: integrationsChanged ? activeIntegrations.length : 0,
    updatedTasks: updated ? 'some' : 'none',
  };
}

export function startCalendarSyncScheduler(intervalMs = 5 * 60 * 1000) {
  if (schedulerHandle) {
    return;
  }
  schedulerHandle = setInterval(() => {
    performScheduledSync().catch((error) => {
      console.error('[calendar] scheduled sync failed', error);
    });
  }, intervalMs).unref?.();
}

export function stopCalendarSyncScheduler() {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}

export async function triggerImmediateSync(integrationId) {
  await performScheduledSync({});
  if (!integrationId) {
    return { ok: true };
  }
  const integrations = await readIntegrationsRaw();
  const integration = integrations.find((entry) => entry.id === integrationId);
  if (!integration) {
    throw new Error('Integration not found');
  }
  const impl = getProvider(integration.provider);
  if (impl.refreshToken && integration.credentials?.refreshToken) {
    try {
      const refreshed = await impl.refreshToken({
        refreshToken: integration.credentials.refreshToken,
        redirectUri: integration.redirectUri,
      });
      integration.credentials = {
        ...integration.credentials,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || integration.credentials.refreshToken,
        expiresAt: refreshed.expiresAt || integration.credentials.expiresAt,
        obtainedAt: refreshed.obtainedAt || integration.credentials.obtainedAt,
      };
      integration.updatedAt = new Date().toISOString();
      await writeIntegrationsRaw(integrations);
    } catch (error) {
      console.error('[calendar] token refresh failed', error);
    }
  }
  return sanitizeIntegration(integration);
}

export async function resolveTaskConflict(localTask, incomingTask) {
  if (!incomingTask) {
    return localTask;
  }
  if (!localTask) {
    return incomingTask;
  }
  const localVersion = typeof localTask.version === 'number' ? localTask.version : 0;
  const incomingVersion = typeof incomingTask.version === 'number' ? incomingTask.version : 0;
  if (incomingVersion <= localVersion) {
    return localTask;
  }
  const merged = {
    ...localTask,
    ...incomingTask,
    version: incomingVersion,
    updatedAt: incomingTask.updatedAt || new Date().toISOString(),
  };
  return merged;
}

export { createState, consumeState } from './stateStore.js';
