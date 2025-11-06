import type { SignupRequest, SignupSource } from '../../types';

export interface NurtureEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  delayDays: number;
  enabled: boolean;
  segment?: {
    source?: SignupSource;
    campaign?: string;
    country?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NurtureTriggerCandidate {
  templateId: string;
  templateName: string;
  signupId: string;
  recipientEmail: string;
  sendAt: string;
  status: 'scheduled' | 'due';
  reason: string;
}

export interface EvaluateNurtureContext {
  templates?: NurtureEmailTemplate[];
  signups: SignupRequest[];
  now?: Date;
  lastSentMap?: Record<string, string>;
}

const STORAGE_KEY = 'dripfy:nurtureTemplates';

const DEFAULT_TEMPLATES: NurtureEmailTemplate[] = [
  {
    id: 'nurture-welcome',
    name: 'Hoş Geldiniz',
    subject: 'Dripfy ekibinden teşekkürler',
    body: 'Talebiniz alındı. Ekibimiz kısa süre içinde sizinle iletişime geçecek.',
    delayDays: 0,
    enabled: true,
    segment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'nurture-reminder-3',
    name: '3 Günlük Hatırlatma',
    subject: 'Kayıt talebiniz hakkında kısa bir hatırlatma',
    body: '3 gündür yanıt alamadık. Ekibimizle görüşmek için bu e-postayı yanıtlayabilirsiniz.',
    delayDays: 3,
    enabled: true,
    segment: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const inMemoryStore: NurtureEmailTemplate[] = [...DEFAULT_TEMPLATES];

function supportsLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadFromStorage(): NurtureEmailTemplate[] {
  if (!supportsLocalStorage()) {
    return inMemoryStore;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inMemoryStore));
      return [...inMemoryStore];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...inMemoryStore];
    }
    return parsed as NurtureEmailTemplate[];
  } catch (error) {
    console.warn('[notifications] Failed to load templates from storage', error);
    return [...inMemoryStore];
  }
}

function saveToStorage(templates: NurtureEmailTemplate[]): void {
  if (!supportsLocalStorage()) {
    inMemoryStore.splice(0, inMemoryStore.length, ...templates);
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.warn('[notifications] Failed to persist templates', error);
  }
}

export async function listNurtureTemplates(): Promise<NurtureEmailTemplate[]> {
  return loadFromStorage().slice().sort((a, b) => a.delayDays - b.delayDays);
}

function generateTemplateId(): string {
  const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis.crypto as Crypto | undefined) : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }
  return `tmpl-${Math.random().toString(16).slice(2)}`;
}

export async function saveNurtureTemplate(template: Partial<NurtureEmailTemplate>): Promise<NurtureEmailTemplate> {
  const existing = loadFromStorage();
  const now = new Date().toISOString();
  const normalised: NurtureEmailTemplate = {
    id: template.id ?? generateTemplateId(),
    name: template.name?.trim() || 'Yeni Nurturing Şablonu',
    subject: template.subject?.trim() || 'Dripfy nurturing',
    body: template.body?.trim() || '',
    delayDays: typeof template.delayDays === 'number' && template.delayDays >= 0 ? template.delayDays : 0,
    enabled: template.enabled !== false,
    segment: template.segment ?? null,
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  };

  const index = existing.findIndex((item) => item.id === normalised.id);
  if (index >= 0) {
    existing.splice(index, 1, normalised);
  } else {
    existing.push(normalised);
  }
  saveToStorage(existing);
  return normalised;
}

export async function deleteNurtureTemplate(id: string): Promise<void> {
  const existing = loadFromStorage();
  const filtered = existing.filter((template) => template.id !== id);
  saveToStorage(filtered);
}

export function loadNurtureHistory(): Record<string, string> {
  if (!supportsLocalStorage()) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:sent`);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch (error) {
    console.warn('[notifications] Failed to load nurture history', error);
  }
  return {};
}

function matchesSegment(template: NurtureEmailTemplate, signup: SignupRequest): boolean {
  if (!template.segment) {
    return true;
  }
  const { segment } = template;
  if (segment.source && signup.attribution?.source !== segment.source) {
    return false;
  }
  if (segment.campaign && signup.attribution?.campaign !== segment.campaign) {
    return false;
  }
  if (segment.country && signup.attribution?.country !== segment.country) {
    return false;
  }
  return true;
}

export function evaluateNurtureTriggers(context: EvaluateNurtureContext): NurtureTriggerCandidate[] {
  const templates = context.templates ?? loadFromStorage();
  const now = context.now ?? new Date();
  const nowTs = now.getTime();
  const lastSent = context.lastSentMap ?? {};
  const candidates: NurtureTriggerCandidate[] = [];

  context.signups.forEach((signup) => {
    if (!signup.email) {
      return;
    }
    const createdAt = new Date(signup.timestamp || signup.id).getTime();
    if (!Number.isFinite(createdAt)) {
      return;
    }

    templates
      .filter((template) => template.enabled)
      .filter((template) => matchesSegment(template, signup))
      .forEach((template) => {
        const sendAtTs = createdAt + template.delayDays * 24 * 60 * 60 * 1000;
        const sendAt = new Date(sendAtTs);
        if (!Number.isFinite(sendAtTs)) {
          return;
        }
        const lastSentKey = `${template.id}:${signup.id}`;
        const lastSentTs = lastSent[lastSentKey] ? new Date(lastSent[lastSentKey]).getTime() : null;
        if (lastSentTs && lastSentTs >= sendAtTs) {
          return;
        }
        const status: 'scheduled' | 'due' = sendAtTs <= nowTs ? 'due' : 'scheduled';
        candidates.push({
          templateId: template.id,
          templateName: template.name,
          signupId: signup.id,
          recipientEmail: signup.email,
          sendAt: sendAt.toISOString(),
          status,
          reason: status === 'due' ? 'Planlanan nurturing e-postası gönderim zamanı geldi.' : 'Planlanan nurturing e-postası takvime alındı.',
        });
      });
  });

  return candidates.sort((a, b) => new Date(a.sendAt).getTime() - new Date(b.sendAt).getTime());
}

export function markNurtureTriggerSent(id: string, signupId: string, when: Date = new Date()): void {
  const existing = loadFromStorage();
  const template = existing.find((entry) => entry.id === id);
  if (!template) {
    return;
  }
  const payloadKey = `${id}:${signupId}`;
  if (supportsLocalStorage()) {
    const key = `${STORAGE_KEY}:sent`;
    const raw = window.localStorage.getItem(key);
    const data: Record<string, string> = raw ? JSON.parse(raw) : {};
    data[payloadKey] = when.toISOString();
    window.localStorage.setItem(key, JSON.stringify(data));
  }
}
