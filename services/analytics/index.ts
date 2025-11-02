import { KpiOverview, OKRRecord, OperationalRole, Department } from '../../types';

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

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await handleResponse<{ okr: OKRRecord }>(response, 'OKR kaydedilemedi.');
  return data.okr;
}

export async function validateOkr(okrId: string, notes?: string): Promise<OKRRecord> {
  const response = await fetch(buildUrl(`/api/okr/${okrId}/validate`), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });

  const data = await handleResponse<{ okr: OKRRecord }>(response, 'OKR doğrulanamadı.');
  return data.okr;
}
