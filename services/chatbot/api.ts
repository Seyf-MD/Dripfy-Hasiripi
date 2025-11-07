import type {
  ChatbotMessage,
  ChatbotResponsePayload,
  ChatbotActionPermissionMap,
  ChatbotReference,
} from '../../types';
import { DEFAULT_TEMPLATE_ID } from './templates';
import {
  ChatbotApiError,
  getChatbotPermissions,
  getKnowledgeSources,
  postChatCompletion,
} from './apiClient';

export interface ChatCompletionRequest {
  prompt: string;
  sources: string[];
  templateId?: string;
  conversation: ChatbotMessage[];
  dashboardContext?: unknown;
}

export interface ChatCompletionResult extends ChatbotResponsePayload {
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  language?: string;
}

export { ChatbotApiError };

function isChatbotReference(input: unknown): input is ChatbotReference {
  if (!input || typeof input !== 'object') {
    return false;
  }
  const candidate = input as Partial<ChatbotReference>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.snippet === 'string' &&
    typeof candidate.source === 'string'
  );
}

export async function requestChatCompletion(payload: ChatCompletionRequest): Promise<ChatCompletionResult> {
  const response = await postChatCompletion({
    prompt: payload.prompt,
    sources: payload.sources,
    templateId: payload.templateId || DEFAULT_TEMPLATE_ID,
    conversation: payload.conversation,
    dashboardContext: payload.dashboardContext,
  });

  const references = Array.isArray(response.references)
    ? response.references.filter(isChatbotReference)
    : [];

  return {
    answer: response.answer,
    references,
    provider: response.provider,
    usage: response.usage,
    language: response.language,
  };
}

export async function fetchKnowledgeSources() {
  const data = await getKnowledgeSources();
  return data.sources;
}

export async function fetchChatbotPermissions(): Promise<ChatbotActionPermissionMap> {
  const data = await getChatbotPermissions();
  return data.permissions as ChatbotActionPermissionMap;
}

