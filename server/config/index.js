import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const chatbotActionPermissions = JSON.parse(
  readFileSync(join(__dirname, '../../config/chatbot-actions.json'), 'utf-8')
);

const parseNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const chatbotConfig = {
  openAI: {
    apiKey: (process.env.OPENAI_API_KEY || '').trim(),
    model: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
    temperature: parseFloatNumber(process.env.OPENAI_TEMPERATURE, 0.2),
    maxOutputTokens: parseNumber(process.env.OPENAI_MAX_OUTPUT_TOKENS, 800),
    requestTimeoutMs: parseNumber(process.env.OPENAI_TIMEOUT_MS, 45000),
  },
  knowledgeBase: {
    languages: (process.env.KNOWLEDGE_BASE_LANGUAGES || 'en').split(',').map((lang) => lang.trim()).filter(Boolean),
    maxContextDocuments: parseNumber(process.env.KNOWLEDGE_BASE_CONTEXT_DOCS, 4),
  },
};

export const automationConfig = {
  permissions: chatbotActionPermissions,
};

export default {
  chatbot: chatbotConfig,
  automation: automationConfig,
};
