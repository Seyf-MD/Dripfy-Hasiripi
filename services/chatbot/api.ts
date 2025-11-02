import type {
  ChatbotMessage,
  ChatbotResponsePayload,
  ChatbotActionPermissionMap,
} from '../../types';
import { DEFAULT_TEMPLATE_ID } from './templates';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

function buildUrl(path: string): string {
  if (API_BASE) {
    return `${API_BASE}/api/automation${path}`;
  }
  return `/api/automation${path}`;
}

async function parseJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function handleResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const data = await parseJson(response);
  if (!response.ok || data?.ok === false) {
    const message = data?.error?.message || fallbackError;
    throw new Error(message);
  }
  return data as T;
}

export interface ChatCompletionRequest {
  prompt: string;
  sources: string[];
  templateId?: string;
  conversation: ChatbotMessage[];
  dashboardContext?: unknown;
}

interface ChatCompletionResponse extends ChatbotResponsePayload {
  ok: true;
}

export async function requestChatCompletion(payload: ChatCompletionRequest): Promise<ChatbotResponsePayload> {
  const response = await fetch(buildUrl('/chat'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      prompt: payload.prompt,
      sources: payload.sources,
      template: { id: payload.templateId || DEFAULT_TEMPLATE_ID },
      conversation: payload.conversation,
      dashboardContext: payload.dashboardContext,
    }),
  });

  const data = await handleResponse<ChatCompletionResponse>(response, 'Chatbot isteği başarısız oldu.');
  return {
    answer: data.answer,
    references: data.references,
    provider: data.provider,
  };
}

interface KnowledgeSourceResponse {
  ok: true;
  sources: Array<{ id: string; label: string; count: number }>;
}

export async function fetchKnowledgeSources() {
  const response = await fetch(buildUrl('/knowledge-sources'), {
    credentials: 'include',
  });
  const data = await handleResponse<KnowledgeSourceResponse>(response, 'Bilgi tabanı kaynakları alınamadı.');
  return data.sources;
}

interface PermissionsResponse {
  ok: true;
  permissions: ChatbotActionPermissionMap;
}

export async function fetchChatbotPermissions(): Promise<ChatbotActionPermissionMap> {
  const response = await fetch(buildUrl('/permissions'), {
    credentials: 'include',
  });
  const data = await handleResponse<PermissionsResponse>(response, 'İzinler alınamadı.');
  return data.permissions;
}

