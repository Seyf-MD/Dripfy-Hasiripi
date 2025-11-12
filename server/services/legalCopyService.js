import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const SERVER_DATA_DIR = path.resolve(__dirname, '../data');
const STORE_FILE_PATH = path.join(SERVER_DATA_DIR, 'websiteCopy.json');
const DEFAULT_COPY_PATH = path.join(REPO_ROOT, 'data', 'websiteContent.json');

async function ensureStoreDir() {
  await fs.mkdir(SERVER_DATA_DIR, { recursive: true });
}

async function readDefaultCopy() {
  const raw = await fs.readFile(DEFAULT_COPY_PATH, 'utf-8');
  return JSON.parse(raw);
}

export async function readWebsiteCopy() {
  await ensureStoreDir();
  try {
    const raw = await fs.readFile(STORE_FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return readDefaultCopy();
    }
    throw error;
  }
}

export async function writeWebsiteCopy(copy) {
  await ensureStoreDir();
  await fs.writeFile(STORE_FILE_PATH, JSON.stringify(copy, null, 2), 'utf-8');
}
