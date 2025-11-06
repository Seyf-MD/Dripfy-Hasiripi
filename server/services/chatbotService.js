import OpenAI from 'openai';
import { chatbotConfig } from '../config/index.js';
import { ensureKnowledgeBase, searchKnowledgeBase, listKnowledgeSources } from './knowledgeBase.js';
import { getUsageSummary, isQuotaExceeded, recordUsageEvent } from './usageService.js';

let openaiClient = null;

function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient;
  }

  if (!chatbotConfig.openAI.apiKey) {
    return null;
  }

  openaiClient = new OpenAI({
    apiKey: chatbotConfig.openAI.apiKey,
  });

  return openaiClient;
}

class ChatbotServiceError extends Error {
  constructor(message, code = 'CHATBOT_ERROR', meta = {}) {
    super(message);
    this.code = code;
    this.meta = meta;
  }
}

const BASE_PROMPTS = {
  tr: 'Sen Dripfy AI adında operasyon asistanısın. Politikaları, prosedürleri ve gösterge paneli verilerini özetleyerek ekip kararlarını hızlandırırsın. Yalnızca doğrulanmış bilgilere dayan ve kaynak dosya adlarını mümkün olduğunda belirt. Kullanıcının dilinde yanıt ver.',
  en: "You are Dripfy AI, an operations assistant that summarises policies, procedures, and dashboard updates. Base your answers on verified data only, cite relevant source file names when available, and respond in the user's language.",
  de: 'Du bist Dripfy AI, ein Assistent für operative Teams. Du fasst Richtlinien, Prozesse und Dashboard-Daten zusammen. Nutze ausschließlich verifizierte Informationen, nenne relevante Quelldateien und antworte in der Sprache der Nutzerin oder des Nutzers.',
  ru: 'Вы — Dripfy AI, операционный ассистент. Вы помогаете суммировать политики, процедуры и обновления панели. Используйте только проверенные данные, указывайте связанные источники и отвечайте на языке пользователя.',
  ar: 'أنت دربفي AI، مساعد العمليات. لخّص السياسات والإجراءات وبيانات لوحة التحكم بالاعتماد على معلومات موثوقة فقط، واذكر الملفات المرجعية عند توفرها، وأجب بلغة المستخدم.',
};

function buildSystemPrompt(templateName, language) {
  const base = BASE_PROMPTS[language] || BASE_PROMPTS.en;

  if (templateName === 'policy-summary') {
    return `${base}\nÖzetlerken zorunlu adımları ve sorumlulukları özellikle vurgula.`;
  }

  if (templateName === 'incident-report') {
    return `${base}\nOlay ayrıntılarını düzenle, riskleri belirt ve sonraki operasyon adımlarını sıralı şekilde çıkar.`;
  }

  if (templateName === 'customer-update') {
    return `${base}\nPaydaşlara iletilebilecek kısa ve nazik bir bilgilendirme metni üret.`;
  }

  return base;
}

function combineContext({ dashboardContext, knowledgeSnippets }) {
  const contextLines = [];

  if (knowledgeSnippets.length) {
    contextLines.push('Knowledge base snippets:');
    knowledgeSnippets.forEach((snippet, index) => {
      contextLines.push(`  [${index + 1}] (${snippet.source}) ${snippet.title} — ${snippet.snippet}`);
    });
  }

  if (dashboardContext) {
    contextLines.push('Dashboard context:');
    contextLines.push(JSON.stringify(dashboardContext).slice(0, 4000));
  }

  return contextLines.join('\n');
}

function detectLanguage({ prompt, previousMessages = [] }) {
  const text = [
    ...previousMessages.map((msg) => msg?.content || ''),
    prompt || '',
  ]
    .join(' ')
    .toLowerCase();

  if (/[؀-ۿ]/.test(text)) {
    return 'ar';
  }
  if (/[ğüşöçıİâîû]/.test(text)) {
    return 'tr';
  }
  if (/[äöüß]/.test(text)) {
    return 'de';
  }
  if (/[а-яё]/.test(text)) {
    return 'ru';
  }

  return 'en';
}

function calculateRetryAfterSeconds(resetAt) {
  if (!resetAt) {
    return undefined;
  }

  const resetTime = new Date(resetAt).getTime();
  if (Number.isNaN(resetTime)) {
    return undefined;
  }

  const seconds = Math.max(Math.floor((resetTime - Date.now()) / 1000), 0);
  return Number.isFinite(seconds) ? seconds : undefined;
}

export async function generateChatResponse({
  prompt,
  previousMessages = [],
  template,
  sources = [],
  dashboardContext,
}) {
  if (!prompt || !prompt.trim()) {
    throw new ChatbotServiceError('Prompt is required', 'PROMPT_REQUIRED');
  }

  await ensureKnowledgeBase();
  const knowledgeSnippets = await searchKnowledgeBase(prompt, {
    sources,
    limit: chatbotConfig.knowledgeBase.maxContextDocuments,
  });

  const language = detectLanguage({ prompt, previousMessages });
  const systemPrompt = buildSystemPrompt(template?.id, language);
  const context = combineContext({ dashboardContext, knowledgeSnippets });
  const client = getOpenAIClient();

  if (!client) {
    throw new ChatbotServiceError(
      'OpenAI API anahtarı yapılandırılmadığı için chatbot yanıtı üretilemiyor.',
      'OPENAI_NOT_CONFIGURED',
    );
  }

  if (await isQuotaExceeded()) {
    const summary = await getUsageSummary();
    const retryAfterSeconds = calculateRetryAfterSeconds(summary?.monthly?.resetAt);

    await recordUsageEvent({
      status: 'quota_exceeded',
      promptPreview: prompt,
      templateId: template?.id,
      language,
      sources,
      model: chatbotConfig.openAI.model,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      errorCode: 'USAGE_LIMIT_EXCEEDED',
    });
    throw new ChatbotServiceError(
      'Kullanım kotası dolduğu için şu anda yeni yanıt üretemiyorum.',
      'USAGE_LIMIT_EXCEEDED',
      { retryAfterSeconds },
    );
  }

  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  if (context) {
    messages.push({ role: 'system', content: `Context:\n${context}` });
  }

  previousMessages.forEach((msg) => {
    if (msg.role === 'user' || msg.role === 'assistant') {
      const role = msg.role === 'assistant' ? 'assistant' : 'user';
      messages.push({ role, content: msg.content });
    }
  });

  messages.push({ role: 'user', content: prompt });

  const abortController = new AbortController();
  const timeoutMs = Number(chatbotConfig.openAI.requestTimeoutMs || 0);
  const timeoutHandle = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? setTimeout(() => abortController.abort(), timeoutMs)
    : null;

  try {
    const response = await client.chat.completions.create({
      model: chatbotConfig.openAI.model,
      messages,
      temperature: chatbotConfig.openAI.temperature,
      max_tokens: chatbotConfig.openAI.maxOutputTokens,
      signal: abortController.signal,
    });

    const usage = response?.usage || {};
    const inputTokens = usage.prompt_tokens ?? usage.total_tokens ?? 0;
    const outputTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;

    await recordUsageEvent({
      status: 'success',
      model: chatbotConfig.openAI.model,
      inputTokens,
      outputTokens,
      totalTokens,
      promptPreview: prompt,
      templateId: template?.id,
      language,
      sources,
    });

    const answer = response?.choices?.[0]?.message?.content?.trim() || 'Yanıt oluşturulamadı.';

    return {
      answer,
      references: knowledgeSnippets,
      provider: 'openai',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
      language,
    };
  } catch (error) {
    const isAbortError = error?.name === 'AbortError';
    const errorCode = isAbortError ? 'OPENAI_TIMEOUT' : 'OPENAI_API_ERROR';
    const message = isAbortError
      ? 'OpenAI isteği zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.'
      : error?.message || 'Yanıt oluşturulamadı.';

    await recordUsageEvent({
      status: 'error',
      model: chatbotConfig.openAI.model,
      promptPreview: prompt,
      templateId: template?.id,
      language,
      sources,
      errorCode,
    });

    throw new ChatbotServiceError(message, errorCode);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function listKnowledgeBaseSources() {
  const sources = listKnowledgeSources();
  const { documents } = await ensureKnowledgeBase();

  const counts = documents.reduce((acc, doc) => {
    acc[doc.source] = (acc[doc.source] || 0) + 1;
    return acc;
  }, {});

  return sources.map((source) => ({
    ...source,
    count: counts[source.id] || 0,
  }));
}
