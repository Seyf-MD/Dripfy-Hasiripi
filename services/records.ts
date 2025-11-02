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

export async function updateRecord(collection: string, id: string, changes: Record<string, unknown>) {
  const response = await fetch(buildUrl(`/api/automation/records/${collection}/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ changes }),
  });
  return handleResponse(response, 'Kayıt güncellenemedi.');
}
