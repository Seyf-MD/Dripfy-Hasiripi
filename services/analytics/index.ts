import { KpiOverview, OKRRecord, OperationalRole, Department } from '../../types';
import { enqueueFormSubmission, OfflineQueueError } from '../offlineQueue';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.warn('[analytics] Failed to parse JSON response', error);
    return {} as T;
  }
}

async function handleResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await parseJson<{ ok?: boolean } & T>(response);
  if (!response.ok || data?.ok === false) {
    const message = (data as any)?.error?.message || fallbackMessage;
    throw new Error(message);
  }
  return data as T;
}

interface AnalyticsQueryParams {
  role?: OperationalRole | null;
  department?: Department | null;
}

export async function fetchKpiOverview(params: AnalyticsQueryParams = {}): Promise<KpiOverview> {
  const searchParams = new URLSearchParams();
  if (params.role) {
    searchParams.set('role', params.role);
  }
  if (params.department) {
    searchParams.set('department', params.department);
  }

  const response = await fetch(buildUrl(`/api/analytics/kpi${searchParams.toString() ? `?${searchParams.toString()}` : ''}`), {
    method: 'GET',
    credentials: 'include',
  });

  return handleResponse<KpiOverview>(response, 'KPI verileri alınamadı.');
}

export async function fetchOkrs(params: AnalyticsQueryParams = {}): Promise<OKRRecord[]> {
  const searchParams = new URLSearchParams();
  if (params.role) {
    searchParams.set('role', params.role);
  }
  if (params.department) {
    searchParams.set('department', params.department);
  }

  const response = await fetch(buildUrl(`/api/okr${searchParams.toString() ? `?${searchParams.toString()}` : ''}`), {
    method: 'GET',
    credentials: 'include',
  });

  const data = await handleResponse<{ okrs: OKRRecord[] }>(response, 'OKR listesi alınamadı.');
  return data.okrs;
}

export type SaveOkrPayload = Partial<OKRRecord> & {
  objective: string;
  ownerRole: OperationalRole;
  department: Department;
};

export async function saveOkr(payload: SaveOkrPayload): Promise<OKRRecord> {
  const hasId = Boolean(payload.id);
  const url = hasId ? buildUrl(`/api/okr/${payload.id}`) : buildUrl('/api/okr');
  const method = hasId ? 'PATCH' : 'POST';
  const requestInit: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  };

  const queueAndThrow = async (message: string) => {
    const entry = await enqueueFormSubmission({
      url,
      method,
      body: payload,
      headers: requestInit.headers as Record<string, string>,
      credentials: requestInit.credentials,
      meta: {
        feature: 'okr',
        description: hasId ? 'OKR güncelleme' : 'Yeni OKR oluşturma',
      },
    });
    throw new OfflineQueueError(message, entry);
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueAndThrow('Çevrimdışısınız. Gönderim kuyruğa alındı.');
  }

  try {
    const response = await fetch(url, requestInit);
    const data = await handleResponse<{ okr: OKRRecord }>(response, 'OKR kaydedilemedi.');
    return data.okr;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.message.includes('Failed to fetch'))) {
      await queueAndThrow('Ağ hatası nedeniyle gönderim kuyruğa alındı. Bağlantı geldiğinde otomatik senkronize edilecek.');
    }
    throw error;
  }
}

export async function validateOkr(okrId: string, notes?: string): Promise<OKRRecord> {
  const url = buildUrl(`/api/okr/${okrId}/validate`);
  const requestInit: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  };

  const queueAndThrow = async (message: string) => {
    const entry = await enqueueFormSubmission({
      url,
      method: 'POST',
      body: { notes, okrId },
      headers: requestInit.headers as Record<string, string>,
      credentials: requestInit.credentials,
      meta: {
        feature: 'okr-validation',
        description: 'OKR doğrulama',
      },
    });
    throw new OfflineQueueError(message, entry);
  };

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await queueAndThrow('Çevrimdışısınız. Doğrulama isteği kuyruğa alındı.');
  }

  try {
    const response = await fetch(url, requestInit);
    const data = await handleResponse<{ okr: OKRRecord }>(response, 'OKR doğrulanamadı.');
    return data.okr;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.message.includes('Failed to fetch'))) {
      await queueAndThrow('Ağ hatası nedeniyle doğrulama kuyruğa alındı.');
    }
    throw error;
  }
}
