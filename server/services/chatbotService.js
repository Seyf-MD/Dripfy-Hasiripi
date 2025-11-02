import OpenAI from 'openai';
import { chatbotConfig } from '../config/index.js';
import { ensureKnowledgeBase, searchKnowledgeBase, listKnowledgeSources } from './knowledgeBase.js';

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

function buildSystemPrompt(templateName) {
  const base = `You are Dripfy AI, an operations assistant that helps summarise policies, procedures and dashboard updates.\n` +
    `Always answer in the language of the user's prompt. Cite relevant source filenames when available.`;

  if (templateName === 'policy-summary') {
    return base + '\nFocus on compliance implications and highlight required steps for staff.';
  }

  if (templateName === 'incident-report') {
    return base + '\nCollect incident details and outline next operational steps.';
  }

  if (templateName === 'customer-update') {
    return base + '\nPrepare concise updates that can be sent to stakeholders.';
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

export async function generateChatResponse({
  prompt,
  previousMessages = [],
  template,
  sources = [],
  dashboardContext,
}) {
  if (!prompt || !prompt.trim()) {
    throw new Error('Prompt is required');
  }

  await ensureKnowledgeBase();
  const knowledgeSnippets = await searchKnowledgeBase(prompt, {
    sources,
    limit: chatbotConfig.knowledgeBase.maxContextDocuments,
  });

  const systemPrompt = buildSystemPrompt(template?.id);
  const context = combineContext({ dashboardContext, knowledgeSnippets });
  const client = getOpenAIClient();

  if (!client) {
    return {
      answer: 'OpenAI API anahtarı yapılandırılmadığı için chatbot yanıtı üretilemiyor.',
      references: knowledgeSnippets,
      provider: 'openai',
    };
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

  const response = await client.responses.create({
    model: chatbotConfig.openAI.model,
    input: messages,
    temperature: chatbotConfig.openAI.temperature,
    max_output_tokens: chatbotConfig.openAI.maxOutputTokens,
  });

  const answer = response.output_text?.trim() || 'Yanıt oluşturulamadı.';

  return {
    answer,
    references: knowledgeSnippets,
    provider: 'openai',
  };
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
