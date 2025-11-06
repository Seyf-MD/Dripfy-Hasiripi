import { randomUUID } from 'node:crypto';
import { readCollection, writeCollection, isValidCollection } from './storageService.js';
import { queueTaskSync } from './calendar/index.js';

function normaliseReminder(reminder) {
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

function normaliseCalendarLink(link) {
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

function buildPersonalization({ ownerId, ownerName, personalNotes, focusTags, schedule, color, timezone }) {
  const now = new Date().toISOString();
  const safeFocusTags = Array.isArray(focusTags) ? focusTags.filter((tag) => typeof tag === 'string' && tag.trim()) : [];
  const safeSchedule = schedule && typeof schedule === 'object' ? schedule : {};
  return {
    ownerId: ownerId || 'legacy-shared',
    ownerName: ownerName || null,
    notes: personalNotes || '',
    focusTags: safeFocusTags,
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

export async function createTask({
  title,
  description,
  assignee,
  priority = 'Medium',
  dueDate,
  ownerId,
  ownerName,
  personalNotes,
  focusTags,
  reminders = [],
  calendarLinks = [],
  schedule = {},
  color = null,
  timezone = null,
}) {
  const tasks = await readCollection('tasks');
  const now = new Date();
  const reminderEntries = reminders
    .map(normaliseReminder)
    .filter(Boolean);
  const calendarEntries = calendarLinks
    .map(normaliseCalendarLink)
    .filter(Boolean);

  const newTask = {
    id: randomUUID(),
    title: title || 'Untitled task',
    description: description || '',
    assignee: assignee || 'Unassigned',
    priority,
    dueDate: dueDate || now.toISOString(),
    status: 'To Do',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    version: 1,
    reminders: reminderEntries,
    calendarLinks: calendarEntries,
    personalization: buildPersonalization({ ownerId, ownerName, personalNotes, focusTags, schedule, color, timezone }),
  };

  tasks.push(newTask);
  await writeCollection('tasks', tasks);

  if (calendarEntries.length > 0) {
    await queueTaskSync(newTask).catch((error) => {
      console.error('[automationService] Failed to queue calendar sync', error);
    });
  }

  return newTask;
}

export async function updateRecord({ collection, recordId, changes }) {
  if (!isValidCollection(collection)) {
    throw new Error(`Unknown collection: ${collection}`);
  }

  const records = await readCollection(collection);
  const index = records.findIndex((item) => item.id === recordId);

  if (index === -1) {
    throw new Error(`Record ${recordId} not found in ${collection}`);
  }

  const updated = {
    ...records[index],
    ...changes,
    updatedAt: new Date().toISOString(),
  };

  records[index] = updated;
  await writeCollection(collection, records);
  return updated;
}

export async function triggerReport({ reportType, parameters, notes }) {
  const reports = await readCollection('reports');
  const entry = {
    id: randomUUID(),
    reportType: reportType || 'ad-hoc',
    parameters: parameters || {},
    notes: notes || '',
    triggeredAt: new Date().toISOString(),
    status: 'queued',
  };
  reports.push(entry);
  await writeCollection('reports', reports);
  return entry;
}
