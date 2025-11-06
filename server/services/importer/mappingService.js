import { getDataset } from './datasetRegistry.js';

export function normaliseMapping(mapping = {}) {
  if (!mapping || typeof mapping !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(mapping)
      .map(([field, column]) => [field, typeof column === 'string' ? column.trim() : null])
      .filter(([, column]) => Boolean(column)),
  );
}

export function mapRowToDataset(row, dataset) {
  const mapped = {};
  const errors = [];

  for (const [field, definition] of Object.entries(dataset.fields)) {
    const columnName = definition.columnName || field;
    const rawValue = row[columnName];
    const normalised = definition.normalise ? definition.normalise(rawValue) : rawValue;
    mapped[field] = normalised;
  }

  return { mapped, errors };
}

export function applyFieldMapping(rows, datasetId, mappingInput) {
  const dataset = getDataset(datasetId);
  if (!dataset) {
    throw new Error('Veri seti bulunamadı');
  }

  const mapping = normaliseMapping(mappingInput);
  const results = [];
  const unmappedFields = [];

  for (const [field, definition] of Object.entries(dataset.fields)) {
    if (!mapping[field] && definition.required) {
      unmappedFields.push(field);
    }
  }

  if (unmappedFields.length > 0) {
    throw new Error(`Eksik alan eşlemesi: ${unmappedFields.join(', ')}`);
  }

  rows.forEach((row, index) => {
    const mapped = {};
    for (const [field, column] of Object.entries(mapping)) {
      const definition = dataset.fields[field];
      const rawValue = row[column];
      const normalised = definition?.normalise ? definition.normalise(rawValue) : rawValue;
      mapped[field] = normalised;
    }
    results.push({ rowIndex: index + 1, data: mapped });
  });

  return results;
}
