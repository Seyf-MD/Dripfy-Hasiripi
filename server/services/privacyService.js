import crypto from 'crypto';

const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,4}[\s-]?\d{3,4}\b/g;
const CREDIT_CARD_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const IBAN_REGEX = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g;
const NATIONAL_ID_REGEX = /\b\d{11}\b/g;
const SERIAL_REGEX = /\b[0-9A-Z]{8,}\b/g;

export function maskSensitiveText(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  let sanitized = value;
  sanitized = sanitized.replace(EMAIL_REGEX, '[email]');
  sanitized = sanitized.replace(IBAN_REGEX, '[iban]');
  sanitized = sanitized.replace(CREDIT_CARD_REGEX, '[card]');
  sanitized = sanitized.replace(NATIONAL_ID_REGEX, '[id]');
  sanitized = sanitized.replace(PHONE_REGEX, '[phone]');
  sanitized = sanitized.replace(SERIAL_REGEX, (match) => {
    if (/^(?:[0-9]{5,}|[A-Z0-9]{10,})$/.test(match)) {
      return '[id]';
    }
    return match;
  });

  return sanitized;
}

export function anonymizeLogObject(value) {
  if (Array.isArray(value)) {
    return value.map((item) => anonymizeLogObject(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, val]) => {
      if (typeof val === 'string') {
        return [key, maskSensitiveText(val)];
      }
      if (Array.isArray(val) || (val && typeof val === 'object')) {
        return [key, anonymizeLogObject(val)];
      }
      return [key, val];
    });
    return Object.fromEntries(entries);
  }

  if (typeof value === 'string') {
    return maskSensitiveText(value);
  }

  return value;
}

export function generateUsageEventId() {
  return crypto.randomUUID ? crypto.randomUUID() : `usage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
