import { isRoleAtLeast } from '../../models/roleModel.js';

const REQUIRED_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export const DATASET_REGISTRY = [
  {
    id: 'people',
    label: 'İK Personel Listesi',
    description: 'Aktif çalışanların iletişim ve organizasyon bilgileri.',
    collection: 'people',
    importRoles: ['manager', 'admin'],
    exportRoles: ['user', 'manager', 'admin'],
    primaryKey: 'employeeId',
    fields: {
      employeeId: {
        label: 'Çalışan Kodu',
        required: true,
        normalise: (value) => String(value || '').trim(),
        validate: (value) => value.length > 0,
        errorMessage: 'Çalışan kodu zorunludur.',
      },
      firstName: {
        label: 'İsim',
        required: true,
        normalise: (value) => String(value || '').trim(),
        validate: (value) => value.length > 1,
        errorMessage: 'İsim en az 2 karakter olmalıdır.',
      },
      lastName: {
        label: 'Soyisim',
        required: true,
        normalise: (value) => String(value || '').trim(),
        validate: (value) => value.length > 1,
        errorMessage: 'Soyisim en az 2 karakter olmalıdır.',
      },
      email: {
        label: 'E-posta',
        required: true,
        normalise: (value) => String(value || '').trim().toLowerCase(),
        validate: (value) => REQUIRED_EMAIL_REGEX.test(value),
        errorMessage: 'Geçerli bir e-posta adresi giriniz.',
      },
      department: {
        label: 'Departman',
        required: false,
        normalise: (value) => String(value || '').trim(),
        validate: () => true,
      },
      role: {
        label: 'Ünvan',
        required: false,
        normalise: (value) => String(value || '').trim(),
        validate: () => true,
      },
    },
  },
  {
    id: 'financials',
    label: 'Finansal Kayıtlar',
    description: 'Gelir, gider ve bütçe kalemleri.',
    collection: 'financials',
    importRoles: ['finance', 'admin'],
    exportRoles: ['finance', 'manager', 'admin'],
    primaryKey: 'recordId',
    fields: {
      recordId: {
        label: 'Kayıt Numarası',
        required: true,
        normalise: (value) => String(value || '').trim(),
        validate: (value) => value.length > 0,
        errorMessage: 'Kayıt numarası zorunludur.',
      },
      date: {
        label: 'Tarih',
        required: true,
        normalise: (value) => {
          const parsed = new Date(value);
          return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
        },
        validate: (value) => Boolean(value),
        errorMessage: 'Geçerli bir tarih giriniz.',
      },
      type: {
        label: 'Tür',
        required: true,
        normalise: (value) => String(value || '').trim().toLowerCase(),
        validate: (value) => ['income', 'expense', 'budget'].includes(value),
        errorMessage: 'Tür income, expense veya budget olmalıdır.',
      },
      amount: {
        label: 'Tutar',
        required: true,
        normalise: (value) => {
          const numeric = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.,-]/g, '').replace(',', '.'));
          return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : NaN;
        },
        validate: (value) => Number.isFinite(value),
        errorMessage: 'Tutar sayısal olmalıdır.',
      },
      currency: {
        label: 'Para Birimi',
        required: true,
        normalise: (value) => String(value || '').trim().toUpperCase(),
        validate: (value) => value.length === 3,
        errorMessage: 'Para birimi 3 harf olmalıdır.',
      },
      description: {
        label: 'Açıklama',
        required: false,
        normalise: (value) => String(value || '').trim(),
        validate: () => true,
      },
    },
  },
];

export function getDataset(datasetId) {
  return DATASET_REGISTRY.find((dataset) => dataset.id === datasetId) || null;
}

export function listDatasetsForRole(role) {
  return DATASET_REGISTRY.filter((dataset) =>
    dataset.exportRoles.some((allowedRole) => isRoleAtLeast(role, allowedRole)) ||
    dataset.importRoles.some((allowedRole) => isRoleAtLeast(role, allowedRole)),
  );
}

export function canImportDataset(role, datasetId) {
  const dataset = getDataset(datasetId);
  if (!dataset) {
    return false;
  }
  return dataset.importRoles.some((allowedRole) => isRoleAtLeast(role, allowedRole));
}

export function canExportDataset(role, datasetId) {
  const dataset = getDataset(datasetId);
  if (!dataset) {
    return false;
  }
  return dataset.exportRoles.some((allowedRole) => isRoleAtLeast(role, allowedRole));
}

export function getDatasetFieldDefinitions(datasetId) {
  const dataset = getDataset(datasetId);
  if (!dataset) {
    return null;
  }
  return Object.entries(dataset.fields).map(([field, definition]) => ({
    field,
    ...definition,
  }));
}
