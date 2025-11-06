import { tokenize } from './tokenize.js';

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  return [value];
}

function calculateNorm(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    const value = vector[i];
    if (value !== 0) {
      sum += value * value;
    }
  }
  return Math.sqrt(sum);
}

function buildVocabulary(documents) {
  const vocabulary = new Map();
  const documentFrequencies = new Map();
  const tokensPerDocument = new Map();

  documents.forEach((doc) => {
    const tokens = tokenize(doc.content);
    tokensPerDocument.set(doc.id, tokens);
    const seen = new Set();
    tokens.forEach((token) => {
      if (!seen.has(token)) {
        seen.add(token);
        documentFrequencies.set(token, (documentFrequencies.get(token) || 0) + 1);
      }
    });
  });

  const vocabularyList = Array.from(documentFrequencies.keys()).sort();
  vocabularyList.forEach((token, index) => {
    vocabulary.set(token, index);
  });

  return { vocabulary, documentFrequencies, tokensPerDocument, vocabularyList };
}

export function buildVectorIndex(rawDocuments = []) {
  const documents = rawDocuments
    .filter((doc) => doc && typeof doc.id === 'string' && typeof doc.content === 'string' && doc.content.trim())
    .map((doc) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata || doc,
    }));

  if (!documents.length) {
    return {
      vocabulary: new Map(),
      idf: new Float64Array(0),
      vectors: new Map(),
      totalDocuments: 0,
    };
  }

  const { vocabulary, documentFrequencies, tokensPerDocument, vocabularyList } = buildVocabulary(documents);
  const totalDocuments = documents.length;
  const idf = new Float64Array(vocabularyList.length);

  vocabularyList.forEach((token, index) => {
    const df = documentFrequencies.get(token) || 0;
    idf[index] = Math.log((1 + totalDocuments) / (1 + df)) + 1;
  });

  const vectors = new Map();

  documents.forEach((doc) => {
    const tokens = tokensPerDocument.get(doc.id) || [];
    const counts = new Map();
    tokens.forEach((token) => {
      counts.set(token, (counts.get(token) || 0) + 1);
    });

    const vector = new Float64Array(vocabularyList.length);
    const totalTokens = tokens.length || 1;

    counts.forEach((count, token) => {
      const index = vocabulary.get(token);
      if (typeof index === 'number') {
        const tf = count / totalTokens;
        vector[index] = tf * idf[index];
      }
    });

    const norm = calculateNorm(vector);
    vectors.set(doc.id, { vector, norm, document: doc.metadata });
  });

  return { vocabulary, idf, vectors, totalDocuments };
}

function buildQueryVector(index, query) {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return { vector: new Float64Array(index.idf.length), norm: 0 };
  }

  const vector = new Float64Array(index.idf.length);
  const counts = new Map();

  tokens.forEach((token) => {
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  const totalTokens = tokens.length || 1;

  counts.forEach((count, token) => {
    const position = index.vocabulary.get(token);
    if (typeof position === 'number') {
      const tf = count / totalTokens;
      vector[position] = tf * (index.idf[position] || 0);
    }
  });

  const norm = calculateNorm(vector);
  return { vector, norm };
}

function cosineSimilarity(a, b) {
  if (!a.vector.length || !b.vector.length || !a.norm || !b.norm) {
    return 0;
  }

  let dot = 0;
  const length = Math.min(a.vector.length, b.vector.length);
  for (let i = 0; i < length; i += 1) {
    const av = a.vector[i];
    if (av !== 0) {
      dot += av * b.vector[i];
    }
  }
  return dot / (a.norm * b.norm);
}

export function searchVectorIndex(index, query, { limit = 5 } = {}) {
  if (!index || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const queryVector = buildQueryVector(index, query);
  if (!queryVector.norm) {
    return [];
  }

  const results = [];
  index.vectors.forEach((entry, id) => {
    if (!entry || !entry.norm) {
      return;
    }
    const score = cosineSimilarity(queryVector, entry);
    if (Number.isFinite(score) && score > 0) {
      results.push({ id, score, document: entry.document });
    }
  });

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, Math.max(1, limit));
}

export function mergeDocumentMetadata(documents) {
  return ensureArray(documents).map((doc) => ({
    id: doc.id,
    title: doc.title,
    source: doc.source,
    path: doc.path || null,
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    chunkIndex: doc.chunkIndex || 0,
    content: doc.content,
    documentId: doc.documentId || doc.id,
  }));
}

export default {
  buildVectorIndex,
  searchVectorIndex,
  mergeDocumentMetadata,
};
