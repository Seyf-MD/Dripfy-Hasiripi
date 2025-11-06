import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chatbotConfig } from '../config/index.js';
import { chunkDocument } from '../../services/knowledgeBase/chunker.js';
import { buildVectorIndex, searchVectorIndex } from '../../services/knowledgeBase/vectorIndex.js';
import { tokenize } from '../../services/knowledgeBase/tokenize.js';

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

function normaliseDocuments(rawDocs) {
  return rawDocs.map((doc) => ({
    ...doc,
    title: doc.title || doc.id,
    tags: doc.tags || [],
  }));
}

function buildSnippet(content, query, maxLength = 420) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const normalised = content.replace(/\s+/g, ' ').trim();
  if (!normalised) {
    return '';
  }

  if (normalised.length <= maxLength) {
    return normalised;
  }

  const tokens = tokenize(query);
  let matchIndex = -1;

  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    const index = normalised.search(regex);
    if (index !== -1) {
      matchIndex = index;
      break;
    }
  }

  if (matchIndex === -1) {
    matchIndex = 0;
  }

  const half = Math.floor(maxLength / 2);
  const start = Math.max(0, matchIndex - half);
  const end = Math.min(normalised.length, start + maxLength);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalised.length ? '…' : '';

  return `${prefix}${normalised.slice(start, end).trim()}${suffix}`;
}

function prepareChunks(documents) {
  return documents.flatMap((document) => {
    const chunks = chunkDocument(document, {
      chunkSize: chatbotConfig.knowledgeBase.chunkSize || 900,
      overlap: chatbotConfig.knowledgeBase.chunkOverlap || 150,
    });

    return chunks.map((chunk) => ({
      ...chunk,
      title: `${chunk.documentTitle || document.title} · Bölüm ${chunk.chunkIndex + 1}`,
    }));
  });
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

    const normalised = normaliseDocuments([...docs, ...dataDocs]);
    const chunks = prepareChunks(normalised);

    knowledgeBaseDocuments = chunks;
    knowledgeBaseIndex = buildVectorIndex(
      chunks.map((chunk) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk,
      })),
    );

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

  if (!index || !documents.length) {
    return [];
  }

  const vectorResults = searchVectorIndex(index, query, { limit: maxResults * 3 });

  const filtered = [];
  for (const item of vectorResults) {
    const chunk = item.document;
    if (!chunk || !allowedSources.has(chunk.source)) {
      continue;
    }
    filtered.push({
      id: chunk.id,
      title: chunk.title,
      snippet: buildSnippet(chunk.content, query),
      score: item.score,
      source: chunk.source,
      path: chunk.path,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
    });
    if (filtered.length >= maxResults) {
      break;
    }
  }

  return filtered;
}

export function listKnowledgeSources() {
  return Object.entries(SOURCE_LABELS).map(([id, label]) => ({
    id,
    label,
  }));
}
