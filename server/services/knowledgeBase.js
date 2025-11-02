import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import elasticlunr from 'elasticlunr';
import { chatbotConfig } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const DATA_DIR = path.join(PROJECT_ROOT, 'data');

let knowledgeBaseIndex = null;
let knowledgeBaseDocuments = [];
let buildingPromise = null;

const SOURCE_LABELS = {
  docs: 'Policy & Procedure Documents',
  data: 'Operational Data Snapshots',
};

async function readDirectoryFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const results = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const absolute = path.join(dirPath, entry.name);
          const body = await fs.readFile(absolute, 'utf-8');
          return { name: entry.name, body };
        }),
    );
    return results;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function createIndex(documents) {
  return elasticlunr(function () {
    this.addField('title');
    this.addField('body');
    this.addField('tags');
    this.setRef('id');

    documents.forEach((doc) => {
      this.addDoc(doc);
    });
  });
}

function normaliseDocuments(rawDocs) {
  return rawDocs.map((doc) => ({
    ...doc,
    title: doc.title || doc.id,
    tags: doc.tags || [],
  }));
}

async function buildKnowledgeBase() {
  if (buildingPromise) {
    return buildingPromise;
  }

  buildingPromise = (async () => {
    const docFiles = await readDirectoryFiles(DOCS_DIR);
    const dataFiles = await readDirectoryFiles(DATA_DIR);

    const docs = docFiles.map((file, index) => ({
      id: `docs-${index}-${file.name}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      body: file.body,
      tags: ['docs'],
      source: 'docs',
      path: path.relative(PROJECT_ROOT, path.join(DOCS_DIR, file.name)),
    }));

    const dataDocs = dataFiles.map((file, index) => ({
      id: `data-${index}-${file.name}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      body: file.body,
      tags: ['data'],
      source: 'data',
      path: path.relative(PROJECT_ROOT, path.join(DATA_DIR, file.name)),
    }));

    knowledgeBaseDocuments = normaliseDocuments([...docs, ...dataDocs]);
    knowledgeBaseIndex = createIndex(knowledgeBaseDocuments);

    return knowledgeBaseDocuments;
  })();

  return buildingPromise;
}

export async function ensureKnowledgeBase() {
  if (knowledgeBaseIndex) {
    return { index: knowledgeBaseIndex, documents: knowledgeBaseDocuments };
  }
  await buildKnowledgeBase();
  return { index: knowledgeBaseIndex, documents: knowledgeBaseDocuments };
}

export async function searchKnowledgeBase(query, { sources = [], limit } = {}) {
  if (!query || !query.trim()) {
    return [];
  }

  const { index, documents } = await ensureKnowledgeBase();
  const allowedSources = new Set(sources.length ? sources : Object.keys(SOURCE_LABELS));
  const maxResults = limit ?? chatbotConfig.knowledgeBase.maxContextDocuments ?? 4;

  const results = index.search(query, {
    fields: {
      title: { boost: 2 },
      body: { boost: 1 },
      tags: { boost: 1.5 },
    },
    bool: 'AND',
    expand: true,
  });

  const scored = results
    .map((match) => ({
      score: match.score,
      document: documents.find((doc) => doc.id === match.ref),
    }))
    .filter((item) => item.document && allowedSources.has(item.document.source))
    .slice(0, maxResults)
    .map((item) => ({
      id: item.document.id,
      title: item.document.title,
      snippet: item.document.body.substring(0, 500),
      score: item.score,
      source: item.document.source,
      path: item.document.path,
    }));

  return scored;
}

export function listKnowledgeSources() {
  return Object.entries(SOURCE_LABELS).map(([id, label]) => ({
    id,
    label,
  }));
}
