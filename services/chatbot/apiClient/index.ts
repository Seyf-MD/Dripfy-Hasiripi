const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
}

export class ChatbotApiError extends Error {
  code?: string;
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, { code, status, retryAfterSeconds }: { code?: string; status: number; retryAfterSeconds?: number }) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    credentials: 'include',
  });

  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfterFromHeader = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined;
  const headerRetryAfterSeconds = Number.isFinite(retryAfterFromHeader) ? retryAfterFromHeader : undefined;

  if (!response.ok) {
    const data = await parseJson(response);
    const payload: ApiErrorPayload = data?.error || {};
    const message = payload.message || 'İstek başarısız oldu.';
    const payloadRetryAfter = typeof payload.retryAfterSeconds === 'number' && Number.isFinite(payload.retryAfterSeconds)
      ? payload.retryAfterSeconds
      : undefined;
    throw new ChatbotApiError(message, {
      code: payload.code,
      status: response.status,
      retryAfterSeconds: payloadRetryAfter ?? headerRetryAfterSeconds,
    });
  }

  const data = (await parseJson(response)) as T & { ok?: boolean; error?: ApiErrorPayload };
  if (data && typeof data === 'object' && 'ok' in data && (data as any).ok === false) {
    const payload: ApiErrorPayload = (data as any).error || {};
    const message = payload.message || 'İstek başarısız oldu.';
    const payloadRetryAfter = typeof payload.retryAfterSeconds === 'number' && Number.isFinite(payload.retryAfterSeconds)
      ? payload.retryAfterSeconds
      : undefined;
    throw new ChatbotApiError(message, {
      code: payload.code,
      status: response.status,
      retryAfterSeconds: payloadRetryAfter ?? headerRetryAfterSeconds,
    });
  }
  return data as T;
}

export interface ChatCompletionPayload {
  prompt: string;
  sources: string[];
  templateId?: string;
  conversation: unknown;
  dashboardContext?: unknown;
}

export interface ChatCompletionSuccess {
  ok: true;
  answer: string;
  references: unknown[];
  provider: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  language?: string;
}

export async function postChatCompletion(payload: ChatCompletionPayload): Promise<ChatCompletionSuccess> {
  return request('/api/automation/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      sources: payload.sources,
      template: payload.templateId ? { id: payload.templateId } : undefined,
      conversation: payload.conversation,
      dashboardContext: payload.dashboardContext,
    }),
  });
}

interface KnowledgeSourcesResponse {
  ok: true;
  sources: Array<{ id: string; label: string; count: number }>;
}

export async function getKnowledgeSources(): Promise<KnowledgeSourcesResponse> {
  return request('/api/automation/knowledge-sources');
}

interface PermissionsResponse {
  ok: true;
  permissions: Record<string, string[]>;
}

export async function getChatbotPermissions(): Promise<PermissionsResponse> {
  return request('/api/automation/permissions');
}
