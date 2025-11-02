import { promises as fs } from 'fs';
import path from 'path';
import {
  COLLECTION_NAMES,
  COLLECTION_FILE_MAP,
  ensureDataEnvironment,
  getBackupDir,
  getCollectionFilePath,
} from './storageService.js';

const BACKUP_RETENTION_DAYS = 30;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatTimestamp(date) {
  const pad = (value) => value.toString().padStart(2, '0');
  return `${formatDate(date)}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

async function ensureBackupDir() {
  await ensureDataEnvironment();
  await fs.mkdir(getBackupDir(), { recursive: true });
}

async function copyCollectionFiles(targetDir) {
  await Promise.all(
    COLLECTION_NAMES.map(async (collection) => {
      const filename = COLLECTION_FILE_MAP[collection];
      const source = getCollectionFilePath(collection);
      const destination = path.join(targetDir, filename);
      try {
        await fs.copyFile(source, destination);
      } catch (error) {
        if (!(error && error.code === 'ENOENT')) {
          throw error;
        }
      }
    }),
  );
}

async function writeMetadata(targetDir, metadata) {
  const metadataPath = path.join(targetDir, 'metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

async function readMetadata(backupDir) {
  const metadataPath = path.join(backupDir, 'metadata.json');
  try {
    const raw = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      const stats = await fs.stat(backupDir);
      return { createdAt: stats.mtime.toISOString(), id: path.basename(backupDir), reason: 'unknown' };
    }
    throw error;
  }
}

export async function createBackup({ reason = 'manual' } = {}) {
  await ensureBackupDir();
  const now = new Date();
  const backupId = formatTimestamp(now);
  const backupDir = path.join(getBackupDir(), backupId);
  await fs.mkdir(backupDir, { recursive: true });
  await copyCollectionFiles(backupDir);
  const metadata = { id: backupId, createdAt: now.toISOString(), reason };
  await writeMetadata(backupDir, metadata);
  await pruneBackups(BACKUP_RETENTION_DAYS);
  return metadata;
}

export async function listBackups() {
  await ensureBackupDir();
  const entries = await fs.readdir(getBackupDir(), { withFileTypes: true });
  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const fullPath = path.join(getBackupDir(), entry.name);
        const metadata = await readMetadata(fullPath);
        return metadata;
      }),
  );
  return backups
    .map((backup) => ({ ...backup, createdAt: backup.createdAt ?? backup.timestamp }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function restoreBackup(backupId) {
  await ensureBackupDir();
  if (!backupId) {
    throw new Error('Backup ID is required');
  }
  const backupDir = path.join(getBackupDir(), backupId);
  try {
    const stat = await fs.stat(backupDir);
    if (!stat.isDirectory()) {
      throw new Error('Invalid backup directory');
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(`Backup not found: ${backupId}`);
    }
    throw error;
  }

  await Promise.all(
    COLLECTION_NAMES.map(async (collection) => {
      const filename = COLLECTION_FILE_MAP[collection];
      const source = path.join(backupDir, filename);
      const destination = getCollectionFilePath(collection);
      try {
        await fs.copyFile(source, destination);
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          // Skip missing files to avoid blocking restore when a collection was empty during backup.
          return;
        }
        throw error;
      }
    }),
  );

  return { ok: true };
}

async function pruneBackups(maxEntries) {
  if (!maxEntries || maxEntries <= 0) {
    return;
  }
  const backups = await listBackups();
  if (backups.length <= maxEntries) {
    return;
  }

  const toRemove = backups.slice(maxEntries);
  await Promise.all(
    toRemove.map(async (backup) => {
      const dirPath = path.join(getBackupDir(), backup.id);
      await fs.rm(dirPath, { recursive: true, force: true });
    }),
  );
}

export async function ensureDailyBackup() {
  await ensureBackupDir();
  const today = formatDate(new Date());
  const backups = await listBackups();
  const hasTodayBackup = backups.some((backup) => backup.id.startsWith(today));
  if (!hasTodayBackup) {
    await createBackup({ reason: 'daily' });
  }
}

export function startDailyBackupScheduler() {
  ensureDailyBackup().catch((error) => {
    console.error('[backup] Failed to create initial daily backup:', error);
  });

  const scheduleNext = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const delay = next.getTime() - now.getTime();
    const timer = setTimeout(async () => {
      try {
        await ensureDailyBackup();
      } catch (error) {
        console.error('[backup] Failed to run scheduled daily backup:', error);
      }
      scheduleNext();
    }, delay);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  };

  scheduleNext();
}
