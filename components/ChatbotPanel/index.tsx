import * as React from 'react';
import {
  Bot,
  Loader,
  Send,
  Sparkles,
  User,
  Workflow,
  ClipboardEdit,
  FileBarChart2,
  X,
  RefreshCcw,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  requestChatCompletion,
  fetchKnowledgeSources,
} from '../../services/chatbot/api';
import { PROMPT_TEMPLATES, DEFAULT_TEMPLATE_ID } from '../../services/chatbot/templates';
import { createTask } from '../../services/tasks';
import { triggerReport } from '../../services/reports';
import { updateRecord } from '../../services/records';
import type {
  ChatbotAction,
  ChatbotReference,
  DashboardData,
  ChatbotMessage,
} from '../../types';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  references?: ChatbotReference[];
}

interface ChatbotPanelProps {
  onClose: () => void;
  dataContext: { activeView: string } & DashboardData;
}

const defaultSources = [
  { id: 'docs', label: 'Policy Docs' },
  { id: 'data', label: 'Operational Data' },
];

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parseText = React.useCallback((text: string) => {
    return text
      .split(/(\*\*.*?\*\*)/g)
      .filter(Boolean)
      .map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="dark:text-white text-[var(--drip-text)]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      });
  }, []);

  const blocks = React.useMemo(() => {
    return content
      .split('\n')
      .reduce<Array<{ type: 'p' | 'ul'; lines: string[] }>>((acc, line) => {
        const trimmedLine = line.trim();
        const isListItem = trimmedLine.startsWith('- ');
        const lastBlock = acc.length > 0 ? acc[acc.length - 1] : null;

        if (isListItem) {
          if (lastBlock && lastBlock.type === 'ul') {
            lastBlock.lines.push(trimmedLine.substring(2));
          } else {
            acc.push({ type: 'ul', lines: [trimmedLine.substring(2)] });
          }
        } else if (trimmedLine) {
          acc.push({ type: 'p', lines: [line] });
        }

        return acc;
      }, []);
  }, [content]);

  return (
    <div className="prose prose-sm max-w-none prose-strong:text-[var(--drip-text)] dark:prose-strong:text-white text-left">
      {blocks.map((block, index) => {
        if (block.type === 'ul') {
          return (
            <ul key={index} className="list-disc pl-5 my-2 space-y-1">
              {block.lines.map((item, itemIndex) => (
                <li key={itemIndex}>{parseText(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index} className="my-2">
            {parseText(block.lines.join('\n'))}
          </p>
        );
      })}
    </div>
  );
};

function asChatbotMessages(messages: ChatMessage[]): ChatbotMessage[] {
  return messages
    .filter((message) => message.content.trim() !== '')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function withoutTrailingPlaceholder(messages: ChatMessage[]): ChatMessage[] {
  if (!messages.length) {
    return messages;
  }
  const draft = [...messages];
  const last = draft[draft.length - 1];
  if (last.role === 'assistant' && last.content === '') {
    draft.pop();
  }
  return draft;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ onClose, dataContext }) => {
  const { t } = useLanguage();
  const { canUseChatbotAction } = useAuth();

  const [messages, setMessages] = React.useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: t('chatbot.initialMessage'),
    },
  ]);
  const [input, setInput] = React.useState('');
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string>(DEFAULT_TEMPLATE_ID);
  const [selectedSources, setSelectedSources] = React.useState<Set<string>>(
    () => new Set(defaultSources.map((s) => s.id)),
  );
  const [sources, setSources] = React.useState(defaultSources);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionType, setActionType] = React.useState<ChatbotAction | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [taskForm, setTaskForm] = React.useState({
    title: '',
    description: '',
    assignee: '',
    priority: 'Medium',
    dueDate: '',
  });
  const [recordForm, setRecordForm] = React.useState({
    collection: 'tasks',
    id: '',
    changes: '{"status":"In Progress"}',
  });
  const [reportForm, setReportForm] = React.useState({
    reportType: 'operations-daily',
    notes: '',
    parameters: '{}',
  });
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: t('chatbot.initialMessage'),
      },
    ]);
  }, [t]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  React.useEffect(() => {
    let cancelled = false;

    fetchKnowledgeSources()
      .then((response) => {
        if (cancelled) return;
        if (Array.isArray(response) && response.length > 0) {
          setSources(response.map((item) => ({ id: item.id, label: item.label || item.id })));
          setSelectedSources(new Set(response.map((item) => item.id)));
        }
      })
      .catch(() => {
        // keep defaults silently
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const latestAssistantMessage = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'assistant' && messages[i].content.trim()) {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const toggleSource = (sourceId: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = PROMPT_TEMPLATES.find((item) => item.id === templateId);
    setSelectedTemplateId(templateId);
    if (template) {
      setInput(template.prompt);
      if (template.recommendedSources?.length) {
        setSelectedSources(new Set(template.recommendedSources));
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage, { id: `assistant-${Date.now()}`, role: 'assistant', content: '' }]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const previousMessages = withoutTrailingPlaceholder(messages);

    try {
      const response = await requestChatCompletion({
        prompt: userMessage.content,
        sources: Array.from(selectedSources),
        templateId: selectedTemplateId,
        conversation: asChatbotMessages(previousMessages),
        dashboardContext: dataContext,
      });

      setMessages((prev) => {
        const draft = [...prev];
        const last = draft[draft.length - 1];
        if (last && last.role === 'assistant') {
          last.content = response.answer;
          last.references = response.references;
        }
        return draft;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'İstek tamamlanamadı.';
      setError(message);
      setMessages((prev) => {
        const draft = [...prev];
        const last = draft[draft.length - 1];
        if (last && last.role === 'assistant') {
          last.content = message;
        }
        return draft;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onTaskSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      await createTask(taskForm);
      setActionMessage('Görev başarıyla oluşturuldu.');
      setActionType(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Görev oluşturulamadı.';
      setActionError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onRecordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      const parsedChanges = JSON.parse(recordForm.changes || '{}');
      await updateRecord(recordForm.collection, recordForm.id, parsedChanges);
      setActionMessage('Kayıt güncellendi.');
      setActionType(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Kayıt güncellenemedi.';
      setActionError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onReportSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionError(null);
    setActionMessage(null);
    setIsLoading(true);
    try {
      const parameters = JSON.parse(reportForm.parameters || '{}');
      await triggerReport({
        reportType: reportForm.reportType,
        notes: reportForm.notes,
        parameters,
      });
      setActionMessage('Rapor tetiklendi.');
      setActionType(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Rapor tetiklenemedi.';
      setActionError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const openAction = (type: ChatbotAction) => {
    if (type === 'createTask') {
      setTaskForm((prev) => ({
        ...prev,
        title: latestAssistantMessage?.content.split('\n')[0]?.slice(0, 80) || prev.title,
        description: latestAssistantMessage?.content || prev.description,
      }));
    }
    if (type === 'updateRecord') {
      setRecordForm((prev) => ({
        ...prev,
        id: prev.id,
        changes: prev.changes,
      }));
    }
    if (type === 'triggerReport') {
      setReportForm((prev) => ({
        ...prev,
        notes: latestAssistantMessage?.content || prev.notes,
      }));
    }
    setActionError(null);
    setActionMessage(null);
    setActionType(type);
  };

  const closeAction = () => {
    setActionType(null);
    setActionError(null);
    setActionMessage(null);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[rgba(75,165,134,0.95)] to-[rgba(48,122,7,0.85)] flex items-center justify-center text-white">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-bold text-[var(--drip-text)] dark:text-white">{t('chatbot.header')}</h3>
            <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">{t('chatbot.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: t('chatbot.initialMessage'),
                },
              ]);
              setInput('');
            }}
            className="text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white transition-colors"
            aria-label={t('chatbot.clear')}
          >
            <RefreshCcw size={16} />
          </button>
          <button onClick={onClose} className="text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="p-4 border-b border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex flex-wrap gap-2 mb-3">
          {sources.map((source) => {
            const active = selectedSources.has(source.id);
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`px-3 py-1 rounded-full text-xs border ${
                  active
                    ? 'bg-[var(--drip-primary)] text-white border-[var(--drip-primary)]'
                    : 'border-slate-300 dark:border-neutral-600 text-[var(--drip-text)] dark:text-neutral-200'
                }`}
              >
                {source.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {PROMPT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template.id)}
              className={`px-3 py-2 rounded-lg border text-left min-w-[180px] ${
                template.id === selectedTemplateId
                  ? 'border-[var(--drip-primary)] bg-[rgba(75,165,134,0.12)] text-[var(--drip-primary)]'
                  : 'border-slate-200 dark:border-neutral-700 text-[var(--drip-text)] dark:text-neutral-200'
              }`}
            >
              <p className="text-sm font-semibold">{template.name}</p>
              <p className="text-xs opacity-80 mt-1">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto bg-white dark:bg-neutral-900">
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-[color:var(--drip-text-soft)] dark:text-neutral-300" />
                </div>
              )}
              <div
                className={`max-w-[80%] p-3 rounded-xl text-sm leading-6 ${
                  msg.role === 'user'
                    ? 'bg-slate-200 dark:bg-neutral-700 text-[var(--drip-text)] dark:text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 rounded-bl-none'
                }`}
              >
                {msg.role === 'assistant' && isLoading && msg.content === '' ? (
                  <Loader className="animate-spin text-[var(--drip-muted)] dark:text-neutral-400" size={20} />
                ) : (
                  <MarkdownRenderer content={msg.content} />
                )}
                {msg.references && msg.references.length > 0 && (
                  <div className="mt-3 text-xs text-[var(--drip-muted)] dark:text-neutral-400 border-t border-slate-200 dark:border-neutral-700 pt-2">
                    <p className="font-semibold mb-1">Referanslar:</p>
                    <ul className="space-y-1">
                      {msg.references.map((ref) => (
                        <li key={ref.id}>
                          <span className="font-medium text-[var(--drip-text)] dark:text-neutral-200">{ref.title}</span>
                          {ref.path ? ` · ${ref.path}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-[color:var(--drip-text-soft)] dark:text-neutral-300" />
                </div>
              )}
            </div>
          ))}
          {messages.length === 1 && !isLoading && (
            <div className="flex flex-col gap-2 items-start mt-4 p-4 bg-slate-100 dark:bg-neutral-800/50 rounded-lg border border-slate-200 dark:border-neutral-700">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--drip-text)] dark:text-neutral-300">
                <Sparkles size={16} className="text-[var(--drip-primary)]" />
                <span>{t('chatbot.examplePrompts')}</span>
              </div>
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="w-full text-left text-sm text-[var(--drip-primary)] dark:text-[var(--drip-primary)] bg-[color:rgba(75,165,134,0.12)] hover:bg-[color:rgba(75,165,134,0.22)] p-2 rounded-md transition-colors"
                >
                  {template.name}
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-t border-red-200">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm border-t border-emerald-200">
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-t border-red-200">
          {actionError}
        </div>
      )}

      {actionType === 'createTask' && (
        <form onSubmit={onTaskSubmit} className="p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--drip-text)] dark:text-neutral-200">
              <Workflow size={16} />
              <span>Görev Oluştur</span>
            </div>
            <button type="button" onClick={closeAction} className="text-xs text-[var(--drip-muted)]">{t('chatbot.clear')}</button>
          </div>
          <input
            value={taskForm.title}
            onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Görev başlığı"
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
            required
          />
          <textarea
            value={taskForm.description}
            onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Görev açıklaması"
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm h-20"
          />
          <div className="flex gap-2">
            <input
              value={taskForm.assignee}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, assignee: event.target.value }))}
              placeholder="Atanacak kişi"
              className="flex-1 px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
            />
            <select
              value={taskForm.priority}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, priority: event.target.value }))}
              className="w-32 px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <input
            type="date"
            value={taskForm.dueDate}
            onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
          />
          <button
            type="submit"
            className="w-full bg-[var(--drip-primary)] text-white py-2 rounded-md hover:bg-[var(--drip-primary-dark)] disabled:bg-neutral-500"
            disabled={isLoading}
          >
            Kaydet
          </button>
        </form>
      )}

      {actionType === 'updateRecord' && (
        <form onSubmit={onRecordSubmit} className="p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--drip-text)] dark:text-neutral-200">
              <ClipboardEdit size={16} />
              <span>Kayıt Güncelle</span>
            </div>
            <button type="button" onClick={closeAction} className="text-xs text-[var(--drip-muted)]">{t('chatbot.clear')}</button>
          </div>
          <input
            value={recordForm.collection}
            onChange={(event) => setRecordForm((prev) => ({ ...prev, collection: event.target.value }))}
            placeholder="Koleksiyon (ör. tasks, financials)"
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
            required
          />
          <input
            value={recordForm.id}
            onChange={(event) => setRecordForm((prev) => ({ ...prev, id: event.target.value }))}
            placeholder="Kayıt ID"
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
            required
          />
          <textarea
            value={recordForm.changes}
            onChange={(event) => setRecordForm((prev) => ({ ...prev, changes: event.target.value }))}
            placeholder='Güncelleme JSON verisi (ör. {"status":"Done"})'
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm h-20"
            required
          />
          <button
            type="submit"
            className="w-full bg-[var(--drip-primary)] text-white py-2 rounded-md hover:bg-[var(--drip-primary-dark)] disabled:bg-neutral-500"
            disabled={isLoading}
          >
            Güncelle
          </button>
        </form>
      )}

      {actionType === 'triggerReport' && (
        <form onSubmit={onReportSubmit} className="p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--drip-text)] dark:text-neutral-200">
              <FileBarChart2 size={16} />
              <span>Rapor Tetikle</span>
            </div>
            <button type="button" onClick={closeAction} className="text-xs text-[var(--drip-muted)]">{t('chatbot.clear')}</button>
          </div>
          <input
            value={reportForm.reportType}
            onChange={(event) => setReportForm((prev) => ({ ...prev, reportType: event.target.value }))}
            placeholder="Rapor tipi"
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm"
            required
          />
          <textarea
            value={reportForm.notes}
            onChange={(event) => setReportForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notlar"
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm h-20"
          />
          <textarea
            value={reportForm.parameters}
            onChange={(event) => setReportForm((prev) => ({ ...prev, parameters: event.target.value }))}
            placeholder='Parametre JSON verisi (ör. {"range":"last_7_days"})'
            className="w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 rounded-md bg-slate-50 dark:bg-neutral-800 text-sm h-20"
          />
          <button
            type="submit"
            className="w-full bg-[var(--drip-primary)] text-white py-2 rounded-md hover:bg-[var(--drip-primary-dark)] disabled:bg-neutral-500"
            disabled={isLoading}
          >
            Gönder
          </button>
        </form>
      )}

      <div className="p-4 border-t border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/50 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => openAction('createTask')}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 text-sm flex items-center gap-2 justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            disabled={!canUseChatbotAction('createTask')}
          >
            <Workflow size={16} /> Görev oluştur
          </button>
          <button
            onClick={() => openAction('updateRecord')}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 text-sm flex items-center gap-2 justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            disabled={!canUseChatbotAction('updateRecord')}
          >
            <ClipboardEdit size={16} /> Kayıt güncelle
          </button>
          <button
            onClick={() => openAction('triggerReport')}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 text-sm flex items-center gap-2 justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-50"
            disabled={!canUseChatbotAction('triggerReport')}
          >
            <FileBarChart2 size={16} /> Rapor tetikle
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={t('chatbot.placeholder')}
            className="w-full pl-4 pr-12 py-2 bg-slate-100 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-600 rounded-full focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white placeholder:text-neutral-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-[var(--drip-primary)] text-white p-2 rounded-full hover:bg-[var(--drip-primary-dark)] disabled:bg-neutral-600 transition-colors"
            disabled={isLoading}
            aria-label={t('chatbot.send')}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotPanel;
