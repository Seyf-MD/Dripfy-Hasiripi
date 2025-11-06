import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { getDataDir } from '../storageService.js';

const IMPORT_DIR = path.join(getDataDir(), 'imports');
const REPORT_DIR = path.join(IMPORT_DIR, 'reports');
const SESSION_DIR = path.join(IMPORT_DIR, 'sessions');
const EXPORT_DIR = path.join(IMPORT_DIR, 'exports');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function initialiseImportStorage() {
  await ensureDir(REPORT_DIR);
  await ensureDir(SESSION_DIR);
  await ensureDir(EXPORT_DIR);
}

export async function createUploadSession({ datasetId, userId, filename, mimetype, columns, rows }) {
  await initialiseImportStorage();
  const id = randomUUID();
  const filePath = path.join(SESSION_DIR, `${id}.json`);
  const payload = {
    id,
    datasetId,
    userId,
    filename,
    mimetype,
    columns,
    rows,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath, JSON.stringify(payload), 'utf-8');
  return payload;
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

export async function getUploadSession(sessionId) {
  try {
    await initialiseImportStorage();
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
    return await readJsonFile(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function deleteUploadSession(sessionId) {
  try {
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function persistErrorReport(buffer, { sessionId, jobId }) {
  await initialiseImportStorage();
  const id = jobId || sessionId || randomUUID();
  const filePath = path.join(REPORT_DIR, `${id}.csv`);
  await fs.writeFile(filePath, buffer);
  return { id, path: filePath };
}

export async function updateUploadSession(sessionId, updates) {
  const existing = await getUploadSession(sessionId);
  if (!existing) {
    throw new Error('Yükleme oturumu bulunamadı');
  }
  const next = { ...existing, ...updates };
  const filePath = path.join(SESSION_DIR, `${sessionId}.json`);
  await fs.writeFile(filePath, JSON.stringify(next), 'utf-8');
  return next;
}

export async function readErrorReport(reportId) {
  try {
    const filePath = path.join(REPORT_DIR, `${reportId}.csv`);
    const buffer = await fs.readFile(filePath);
    return { id: reportId, buffer, filePath };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function persistExportFile(buffer, { jobId, extension = 'csv' }) {
  await initialiseImportStorage();
  const id = jobId || randomUUID();
  const filePath = path.join(EXPORT_DIR, `${id}.${extension}`);
  await fs.writeFile(filePath, buffer);
  return { id, path: filePath };
}

export async function readExportFile(fileId, extension = 'csv') {
  try {
    const filePath = path.join(EXPORT_DIR, `${fileId}.${extension}`);
    const buffer = await fs.readFile(filePath);
    return { id: fileId, buffer, filePath };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
