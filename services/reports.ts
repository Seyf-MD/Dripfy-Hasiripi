const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string) {
  if (API_BASE) {
    return `${API_BASE}${path}`;
  }
  return path;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await parseJson(response);
  if (!response.ok || data?.ok === false) {
    const message = data?.error?.message || fallbackMessage;
    throw new Error(message);
  }
  return data as T;
}

export async function triggerReport(payload: {
  reportType: string;
  parameters?: Record<string, unknown>;
  notes?: string;
}) {
  const response = await fetch(buildUrl('/api/automation/reports/trigger'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  return handleResponse(response, 'Rapor tetiklenemedi.');
}
