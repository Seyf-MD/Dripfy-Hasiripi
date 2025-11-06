import { randomUUID } from 'node:crypto';
import { readCollection, writeCollection } from './storageService.js';
import { queueTaskSync, resolveTaskConflict } from './calendar/index.js';

export class TaskVersionConflictError extends Error {
  constructor(taskId, expected, actual) {
    super(`Task ${taskId} version mismatch. Expected ${expected}, got ${actual}.`);
    this.name = 'TaskVersionConflictError';
    this.taskId = taskId;
    this.expectedVersion = expected;
    this.actualVersion = actual;
  }
}

function sanitizeReminder(reminder) {
  if (!reminder || typeof reminder !== 'object') {
    return null;
  }
  const now = new Date().toISOString();
  return {
    id: reminder.id || randomUUID(),
    type: reminder.type === 'email' || reminder.type === 'push' ? reminder.type : 'popup',
    minutesBefore: typeof reminder.minutesBefore === 'number' ? reminder.minutesBefore : 30,
    scheduledAt: reminder.scheduledAt ?? null,
    createdAt: reminder.createdAt || now,
  };
}

function sanitizeCalendarLink(link) {
  if (!link || typeof link !== 'object') {
    return null;
  }
  const provider = link.provider === 'outlook' ? 'outlook' : 'google';
  const syncState = ['pending', 'synced', 'error'].includes(link.syncState) ? link.syncState : 'pending';
  return {
    id: link.id || randomUUID(),
    provider,
    integrationId: link.integrationId || null,
    calendarId: link.calendarId || 'primary',
    eventId: link.eventId || null,
    syncState,
    lastSyncedAt: link.lastSyncedAt || null,
    lastError: link.lastError || null,
  };
}

function buildPersonalization({ ownerId, ownerName, notes, focusTags, color, schedule, timezone }) {
  const now = new Date().toISOString();
  const safeSchedule = schedule && typeof schedule === 'object' ? schedule : {};
  return {
    ownerId,
    ownerName: ownerName || null,
    notes: notes || '',
    focusTags: Array.isArray(focusTags) ? focusTags.filter((tag) => typeof tag === 'string' && tag.trim()) : [],
    color: color || null,
    schedule: {
      start: safeSchedule.start ?? null,
      end: safeSchedule.end ?? null,
      allDay: Boolean(safeSchedule.allDay),
      timezone: safeSchedule.timezone || timezone || null,
      lastPlannedAt: safeSchedule.lastPlannedAt || now,
    },
  };
}

function canManageTask(user, task) {
  if (!user) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  const ownerId = task.personalization?.ownerId || task.assigneeId;
  return ownerId ? ownerId === user.id : false;
}

export async function listPersonalTasks(userId) {
  const tasks = await readCollection('tasks');
  if (!Array.isArray(tasks)) {
    return [];
  }
  return tasks.filter((task) => task.personalization?.ownerId === userId);
}

export async function createPersonalTask(user, input) {
  if (!user || !user.id) {
    throw new Error('User context is required');
  }
  const now = new Date();
  const reminders = Array.isArray(input.reminders) ? input.reminders.map(sanitizeReminder).filter(Boolean) : [];
  const calendarLinks = Array.isArray(input.calendarLinks)
    ? input.calendarLinks.map(sanitizeCalendarLink).filter(Boolean)
    : [];

  const tasks = await readCollection('tasks');
  const newTask = {
    id: randomUUID(),
    title: input.title || 'Untitled task',
    description: input.description || '',
    assignee: input.assignee || user.name || 'Unassigned',
    priority: input.priority || 'Medium',
    dueDate: input.dueDate || now.toISOString(),
    status: input.status || 'To Do',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    version: 1,
    reminders,
    calendarLinks,
    personalization: buildPersonalization({
      ownerId: user.id,
      ownerName: user.name,
      notes: input.personalNotes,
      focusTags: input.focusTags,
      color: input.color,
      schedule: input.schedule,
      timezone: input.timezone,
    }),
  };

  tasks.push(newTask);
  await writeCollection('tasks', tasks);

  if (calendarLinks.length > 0) {
    await queueTaskSync(newTask).catch((error) => {
      console.error('[taskPlanner] Failed to queue calendar sync on create', error);
    });
  }

  return newTask;
}

export async function updatePersonalTask(user, taskId, changes, expectedVersion) {
  if (!user || !user.id) {
    throw new Error('User context is required');
  }
  const tasks = await readCollection('tasks');
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index === -1) {
    throw new Error('Task not found');
  }
  const existing = tasks[index];
  if (!canManageTask(user, existing)) {
    throw new Error('You do not have permission to modify this task');
  }
  const currentVersion = typeof existing.version === 'number' ? existing.version : 1;
  if (typeof expectedVersion === 'number' && expectedVersion !== currentVersion) {
    throw new TaskVersionConflictError(taskId, expectedVersion, currentVersion);
  }

  const nextReminders = Array.isArray(changes.reminders)
    ? changes.reminders.map(sanitizeReminder).filter(Boolean)
    : existing.reminders || [];
  const nextLinks = Array.isArray(changes.calendarLinks)
    ? changes.calendarLinks.map(sanitizeCalendarLink).filter(Boolean)
    : existing.calendarLinks || [];

  const personalizationUpdates = buildPersonalization({
    ownerId: existing.personalization?.ownerId || user.id,
    ownerName: existing.personalization?.ownerName || user.name,
    notes: changes.personalNotes ?? existing.personalization?.notes,
    focusTags: changes.focusTags ?? existing.personalization?.focusTags,
    color: changes.color ?? existing.personalization?.color,
    schedule: changes.schedule ?? existing.personalization?.schedule,
    timezone: changes.timezone ?? existing.personalization?.schedule?.timezone,
  });

  const updated = {
    ...existing,
    title: changes.title ?? existing.title,
    description: changes.description ?? existing.description,
    assignee: changes.assignee ?? existing.assignee,
    priority: changes.priority ?? existing.priority,
    status: changes.status ?? existing.status,
    dueDate: changes.dueDate ?? existing.dueDate,
    reminders: nextReminders,
    calendarLinks: nextLinks,
    personalization: personalizationUpdates,
    updatedAt: new Date().toISOString(),
    version: currentVersion + 1,
  };

  tasks[index] = updated;
  await writeCollection('tasks', tasks);

  if (nextLinks.length > 0) {
    await queueTaskSync(updated).catch((error) => {
      console.error('[taskPlanner] Failed to queue calendar sync on update', error);
    });
  }

  return updated;
}

export async function mergeRemoteTask(remoteTask) {
  if (!remoteTask || !remoteTask.id) {
    throw new Error('Remote task payload is invalid');
  }
  const tasks = await readCollection('tasks');
  const index = tasks.findIndex((task) => task.id === remoteTask.id);
  if (index === -1) {
    tasks.push(remoteTask);
    await writeCollection('tasks', tasks);
    return remoteTask;
  }
  const merged = resolveTaskConflict(tasks[index], remoteTask);
  tasks[index] = merged;
  await writeCollection('tasks', tasks);
  return merged;
}
