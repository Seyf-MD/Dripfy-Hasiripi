import { readCollection, writeCollection } from '../services/storageService.js';

const AUDIT_COLLECTION = 'auditLog';
const DEFAULT_LABEL = 'general';
const DEFAULT_SOURCE_MODULE = 'unknown';
const DEFAULT_CRITICALITY = 'medium';

function ensureAuditMetadata(entry) {
  const next = { ...entry };
  if (typeof next.label !== 'string' || !next.label.trim()) {
    next.label = DEFAULT_LABEL;
  }
  if (typeof next.sourceModule !== 'string' || !next.sourceModule.trim()) {
    next.sourceModule = DEFAULT_SOURCE_MODULE;
  }
  if (typeof next.criticality !== 'string' || !next.criticality.trim()) {
    next.criticality = DEFAULT_CRITICALITY;
  }
  return next;
}

export async function addAuditMetadataFields() {
  const logs = await readCollection(AUDIT_COLLECTION);
  if (!Array.isArray(logs) || logs.length === 0) {
    return;
  }

  let mutated = false;
  const normalised = logs.map((entry) => {
    const withMetadata = ensureAuditMetadata(entry);
    if (!mutated) {
      mutated =
        withMetadata.label !== entry.label ||
        withMetadata.sourceModule !== entry.sourceModule ||
        withMetadata.criticality !== entry.criticality;
    }
    return withMetadata;
  });

  if (mutated) {
    await writeCollection(AUDIT_COLLECTION, normalised);
  }
}
