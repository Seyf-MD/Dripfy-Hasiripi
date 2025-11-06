function normaliseNewlines(text) {
  return text.replace(/\r\n?/g, '\n');
}

function safeTrim(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function chunkText(text, { chunkSize = 900, overlap = 150 } = {}) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalised = normaliseNewlines(text);
  const length = normalised.length;
  const chunks = [];

  let start = 0;
  while (start < length) {
    let end = Math.min(length, start + chunkSize);

    if (end < length) {
      const newline = normalised.indexOf('\n', end);
      if (newline !== -1 && newline - end <= 120) {
        end = newline;
      } else {
        const space = normalised.indexOf(' ', end);
        if (space !== -1 && space - end <= 60) {
          end = space;
        }
      }
    }

    const raw = normalised.slice(start, end);
    const content = safeTrim(raw);

    if (content) {
      chunks.push({ content, start, end });
    }

    if (end >= length) {
      break;
    }

    start = Math.max(0, end - overlap);
    if (start === end) {
      start += chunkSize;
    }
  }

  return chunks;
}

export function chunkDocument(document, options) {
  if (!document || typeof document !== 'object') {
    return [];
  }

  const baseChunks = chunkText(document.body || '', options);
  return baseChunks.map((chunk, index) => ({
    id: `${document.id || 'doc'}#${index + 1}`,
    documentId: document.id || 'doc',
    title: document.title || document.id || `Document ${index + 1}`,
    documentTitle: document.title || document.id || 'Document',
    tags: Array.isArray(document.tags) ? document.tags : [],
    source: document.source || 'docs',
    path: document.path || null,
    chunkIndex: index,
    startOffset: chunk.start,
    endOffset: chunk.end,
    content: chunk.content,
  }));
}

export default chunkDocument;
