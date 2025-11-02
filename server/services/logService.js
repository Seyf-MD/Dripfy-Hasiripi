import { randomUUID } from 'crypto';
import { readCollection, writeCollection } from './storageService.js';

const LOGIN_COLLECTION = 'loginLogs';
const ERROR_COLLECTION = 'errorLogs';
const AUDIT_COLLECTION = 'auditLog';

async function appendToCollection(collection, entry) {
  const list = await readCollection(collection);
  if (!Array.isArray(list)) {
    throw new Error(`Collection ${collection} is not an array`);
  }
  list.push(entry);
  await writeCollection(collection, list);
  return entry;
}

export async function recordLoginEvent({ userId, email, ip, userAgent, timestamp = new Date().toISOString() }) {
  const entry = {
    id: randomUUID(),
    userId,
    email,
    ip,
    userAgent,
    timestamp: new Date(timestamp).toISOString(),
  };
  await appendToCollection(LOGIN_COLLECTION, entry);
  return entry;
}

export async function recordErrorLog({ message, stack, context, timestamp = new Date().toISOString() }) {
  const entry = {
    id: randomUUID(),
    message,
    stack,
    context,
    timestamp: new Date(timestamp).toISOString(),
  };
  await appendToCollection(ERROR_COLLECTION, entry);
  return entry;
}

export async function recordAuditLog({
  user,
  action,
  targetType,
  targetId,
  details,
  timestamp = new Date().toISOString(),
}) {
  const entry = {
    id: randomUUID(),
    user,
    action,
    targetType,
    targetId,
    details,
    timestamp: new Date(timestamp).toISOString(),
  };

  await appendToCollection(AUDIT_COLLECTION, entry);
  return entry;
}
