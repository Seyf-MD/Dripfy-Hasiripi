import { randomUUID } from 'node:crypto';
import { readCollection, writeCollection, isValidCollection } from './storageService.js';

export async function createTask({ title, description, assignee, priority = 'Medium', dueDate }) {
  const tasks = await readCollection('tasks');
  const now = new Date();
  const newTask = {
    id: randomUUID(),
    title: title || 'Untitled task',
    description: description || '',
    assignee: assignee || 'Unassigned',
    priority,
    dueDate: dueDate || now.toISOString(),
    status: 'To Do',
    createdAt: now.toISOString(),
  };
  tasks.push(newTask);
  await writeCollection('tasks', tasks);
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
