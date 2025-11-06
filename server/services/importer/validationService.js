import { getDataset } from './datasetRegistry.js';

export function validateMappedRows(datasetId, mappedRows) {
  const dataset = getDataset(datasetId);
  if (!dataset) {
    throw new Error('Veri seti bulunamadı');
  }

  const valid = [];
  const errors = [];

  mappedRows.forEach(({ rowIndex, data }) => {
    const rowErrors = [];
    for (const [field, definition] of Object.entries(dataset.fields)) {
      const value = data[field];
      if (definition.required && (value === null || value === undefined || value === '')) {
        rowErrors.push({ field, message: `${definition.label || field} zorunludur.` });
        continue;
      }
      if (definition.validate && value !== null && value !== undefined && value !== '') {
        try {
          if (!definition.validate(value, data)) {
            rowErrors.push({ field, message: definition.errorMessage || `${definition.label || field} geçersiz.` });
          }
        } catch (error) {
          rowErrors.push({ field, message: error.message || `${definition.label || field} kontrol edilemedi.` });
        }
      }
    }

    if (rowErrors.length > 0) {
      rowErrors.forEach((error) => {
        errors.push({ row: rowIndex, field: error.field, message: error.message });
      });
    } else {
      valid.push({ rowIndex, data });
    }
  });

  return { valid, errors };
}
