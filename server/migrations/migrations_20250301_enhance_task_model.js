import { randomUUID } from 'node:crypto';
import { readCollection, writeCollection, ensureDataEnvironment } from '../services/storageService.js';

function normaliseReminder(reminder) {
  const now = new Date().toISOString();
  if (!reminder || typeof reminder !== 'object') {
    return {
      id: randomUUID(),
      type: 'popup',
      minutesBefore: 30,
      createdAt: now,
      scheduledAt: null,
    };
  }

  return {
    id: reminder.id || randomUUID(),
    type: reminder.type === 'email' || reminder.type === 'push' ? reminder.type : 'popup',
    minutesBefore: typeof reminder.minutesBefore === 'number' ? reminder.minutesBefore : 30,
    createdAt: reminder.createdAt || now,
    scheduledAt: reminder.scheduledAt ?? null,
  };
}

function normaliseCalendarLink(link) {
  if (!link || typeof link !== 'object') {
    return null;
  }
  const allowedProviders = new Set(['google', 'outlook']);
  const provider = allowedProviders.has(link.provider) ? link.provider : 'google';
  const syncState = ['pending', 'synced', 'error'].includes(link.syncState) ? link.syncState : 'pending';
  return {
    id: link.id || randomUUID(),
    provider,
    integrationId: link.integrationId || null,
    calendarId: link.calendarId || link.calendar || 'primary',
    eventId: link.eventId || null,
    syncState,
    lastSyncedAt: link.lastSyncedAt || null,
    lastError: link.lastError || null,
  };
}

function normalisePersonalisation(task) {
  const now = new Date().toISOString();
  const personalization = task.personalization || task.personalisation || task.personalContext || {};
  const schedule = personalization.schedule || {};
  return {
    ownerId: personalization.ownerId || task.ownerId || task.assigneeId || 'legacy-shared',
    ownerName: personalization.ownerName || task.ownerName || null,
    notes: personalization.notes || personalization.personalNotes || '',
    focusTags: Array.isArray(personalization.focusTags) ? personalization.focusTags : [],
    color: personalization.color || null,
    schedule: {
      start: schedule.start ?? schedule.startAt ?? null,
      end: schedule.end ?? schedule.endAt ?? null,
      allDay: Boolean(schedule.allDay),
      timezone: schedule.timezone || personalization.timezone || null,
      lastPlannedAt: schedule.lastPlannedAt || personalization.lastPlannedAt || now,
    },
  };
}

export async function enhanceTaskModel() {
  await ensureDataEnvironment();
  const tasks = await readCollection('tasks');
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return;
  }

  let touched = false;
  const now = new Date().toISOString();

  const nextTasks = tasks.map((task) => {
    if (!task || typeof task !== 'object') {
      return task;
    }

    const updated = { ...task };
    let mutated = false;

    if (!Array.isArray(updated.reminders)) {
      updated.reminders = [];
      mutated = true;
    }

    updated.reminders = updated.reminders.map((reminder) => {
      const normalised = normaliseReminder(reminder);
      if (normalised !== reminder) {
        mutated = true;
      }
      return normalised;
    });

    if (!Array.isArray(updated.calendarLinks)) {
      const normalisedLink = normaliseCalendarLink(updated.calendarLink || null);
      updated.calendarLinks = normalisedLink ? [normalisedLink] : [];
      if (normalisedLink || updated.calendarLink) {
        mutated = true;
      }
      delete updated.calendarLink;
    } else {
      updated.calendarLinks = updated.calendarLinks
        .map(normaliseCalendarLink)
        .filter(Boolean);
    }

    if (!updated.personalization || typeof updated.personalization !== 'object') {
      updated.personalization = normalisePersonalisation(updated);
      mutated = true;
    } else {
      const normalisedPersonalisation = normalisePersonalisation(updated);
      if (JSON.stringify(normalisedPersonalisation) !== JSON.stringify(updated.personalization)) {
        updated.personalization = normalisedPersonalisation;
        mutated = true;
      }
    }

    if (typeof updated.version !== 'number' || Number.isNaN(updated.version)) {
      updated.version = 1;
      mutated = true;
    }

    if (!updated.createdAt) {
      updated.createdAt = now;
      mutated = true;
    }

    if (!updated.updatedAt) {
      updated.updatedAt = updated.createdAt;
      mutated = true;
    }

    if (mutated) {
      touched = true;
    }

    return updated;
  });

  if (touched) {
    await writeCollection('tasks', nextTasks);
  }
}
