import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const BACKUP_DIR = path.resolve(__dirname, '../backups');

export const COLLECTION_FILE_MAP = {
  users: 'users.json',
  financials: 'financials.json',
  tasks: 'tasks.json',
  reports: 'reports.json',
  people: 'people.json',
  errorLogs: 'errorLogs.json',
  loginLogs: 'loginLogs.json',
  signupRequests: 'signupRequests.json',
  calendar: 'calendar.json',
  calendarIntegrations: 'calendarIntegrations.json',
  challenges: 'challenges.json',
  advantages: 'advantages.json',
  okrs: 'okrs.json',
  auditLog: 'auditLog.json',
  approvalDecisions: 'approvalDecisions.json',
  usageMetrics: 'usageMetrics.json',
};

const COLLECTION_DEFAULTS = {
  users: [],
  financials: [],
  tasks: [],
  reports: [],
  people: [],
  errorLogs: [],
  loginLogs: [],
  signupRequests: [],
  calendar: [],
  calendarIntegrations: [],
  challenges: [],
  advantages: [],
  okrs: [],
  auditLog: [],
  approvalDecisions: [],
  usageMetrics: [],
};

export const COLLECTION_NAMES = Object.keys(COLLECTION_FILE_MAP);

export function getDataDir() {
  return DATA_DIR;
}

export function getBackupDir() {
  return BACKUP_DIR;
}

export function getCollectionFilePath(collection) {
  const filename = COLLECTION_FILE_MAP[collection];
  if (!filename) {
    throw new Error(`Unknown collection: ${collection}`);
  }
  return path.join(DATA_DIR, filename);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureCollectionFile(collection) {
  const filePath = getCollectionFilePath(collection);
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const defaultValue = COLLECTION_DEFAULTS[collection] ?? [];
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
    } else {
      throw error;
    }
  }
}

export async function ensureDataEnvironment() {
  await ensureDir(DATA_DIR);
  await ensureDir(BACKUP_DIR);
  await Promise.all(COLLECTION_NAMES.map(name => ensureCollectionFile(name)));
}

async function readJsonFile(filePath, defaultValue = []) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return defaultValue;
    }
    throw error;
  }
}

export async function readCollection(collection) {
  await ensureDataEnvironment();
  const filePath = getCollectionFilePath(collection);
  const defaultValue = COLLECTION_DEFAULTS[collection] ?? [];
  const data = await readJsonFile(filePath, defaultValue);
  return data ?? defaultValue;
}

export async function writeCollection(collection, data) {
  await ensureDataEnvironment();
  const filePath = getCollectionFilePath(collection);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getCollectionSnapshot() {
  const snapshotEntries = await Promise.all(
    COLLECTION_NAMES.map(async (name) => {
      const filePath = getCollectionFilePath(name);
      const stats = await fs.stat(filePath);
      return [name, {
        file: path.basename(filePath),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
      }];
    }),
  );
  return Object.fromEntries(snapshotEntries);
}

export function isValidCollection(name) {
  return COLLECTION_NAMES.includes(name);
}
