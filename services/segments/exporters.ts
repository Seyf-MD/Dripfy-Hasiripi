import { Contact, SegmentDefinition } from '../../types';

export interface CampaignExportOptions {
  includeHeader?: boolean;
  delimiter?: string;
}

export interface CampaignExportResult {
  fileName: string;
  mimeType: string;
  content: string;
  contactCount: number;
}

const sanitizeSegmentName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'segment';

const buildRows = (contacts: Contact[], fields: (keyof Contact)[]): string[][] => {
  return contacts.map((contact) => fields.map((field) => String((contact[field] ?? '') as string)));
};

export const buildSegmentEmailExport = (
  contacts: Contact[],
  segment: SegmentDefinition,
  options: CampaignExportOptions = {},
): CampaignExportResult => {
  const delimiter = options.delimiter ?? ',';
  const rows = buildRows(
    contacts.filter((contact) => Boolean(contact.email)),
    ['firstName', 'lastName', 'email'],
  );
  const header = options.includeHeader !== false ? [['firstName', 'lastName', 'email']] : [];
  const payload = [...header, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(delimiter))
    .join('\n');

  return {
    fileName: `${sanitizeSegmentName(segment.name)}-email-targets.csv`,
    mimeType: 'text/csv;charset=utf-8',
    content: payload,
    contactCount: rows.length,
  };
};

export const buildSegmentNotificationExport = (
  contacts: Contact[],
  segment: SegmentDefinition,
): CampaignExportResult => {
  const payload = contacts.map((contact) => ({
    id: contact.id,
    email: contact.email ?? null,
    phone: contact.phone ?? null,
    name: `${contact.firstName} ${contact.lastName}`.trim(),
  }));

  return {
    fileName: `${sanitizeSegmentName(segment.name)}-notifications.json`,
    mimeType: 'application/json;charset=utf-8',
    content: JSON.stringify(payload, null, 2),
    contactCount: payload.length,
  };
};

export const triggerDownload = (result: CampaignExportResult) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return result;
  }
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  return result;
};

export default {
  buildSegmentEmailExport,
  buildSegmentNotificationExport,
  triggerDownload,
};
