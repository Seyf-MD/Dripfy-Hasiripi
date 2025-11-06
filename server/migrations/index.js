import { promises as fs } from 'fs';
import path from 'path';
import { getDataDir } from '../services/storageService.js';
import { addAuditMetadataFields } from './migrations_20250204_add_audit_metadata.js';
import { enhanceTaskModel } from './migrations_20250301_enhance_task_model.js';

const MIGRATIONS = [
  {
    id: '20250204_add_audit_metadata',
    run: addAuditMetadataFields,
  },
  {
    id: '20250301_enhance_task_model',
    run: enhanceTaskModel,
  },
];

const STATE_FILE_NAME = '.migrations.json';

async function loadState(stateFilePath) {
  try {
    const raw = await fs.readFile(stateFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { completed: [] };
    }
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
    };
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return { completed: [] };
    }
    throw error;
  }
}

async function persistState(stateFilePath, state) {
  const payload = JSON.stringify({ completed: [...state.completed] }, null, 2);
  await fs.writeFile(stateFilePath, payload, 'utf-8');
}

export async function runMigrations() {
  const dataDir = getDataDir();
  const stateFilePath = path.join(dataDir, STATE_FILE_NAME);
  const state = await loadState(stateFilePath);
  const completed = new Set(state.completed);

  for (const migration of MIGRATIONS) {
    if (completed.has(migration.id)) {
      continue;
    }

    await migration.run();
    completed.add(migration.id);
  }

  await persistState(stateFilePath, { completed });
}
