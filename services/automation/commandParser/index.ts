export type AutomationCommandType = 'createTask' | 'updateRecord' | 'triggerReport';

export interface BaseAutomationCommand {
  type: AutomationCommandType;
  raw: string;
}

export interface CreateTaskCommand extends BaseAutomationCommand {
  type: 'createTask';
  title: string;
  description?: string;
  assignee?: string;
  priority?: 'High' | 'Medium' | 'Low';
  dueDate?: string;
}

export interface UpdateRecordCommand extends BaseAutomationCommand {
  type: 'updateRecord';
  collection: string;
  recordId: string;
  changes: Record<string, unknown>;
}

export interface TriggerReportCommand extends BaseAutomationCommand {
  type: 'triggerReport';
  reportType: string;
  parameters: Record<string, unknown>;
  notes?: string;
}

export type AutomationCommand = CreateTaskCommand | UpdateRecordCommand | TriggerReportCommand;

export class CommandParseError extends Error {
  code: 'UNSUPPORTED_COMMAND' | 'INVALID_ARGUMENT';

  constructor(message: string, code: 'UNSUPPORTED_COMMAND' | 'INVALID_ARGUMENT') {
    super(message);
    this.name = 'CommandParseError';
    this.code = code;
  }
}

function tokenizeInput(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | '\'' | '`' | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === '\'' || char === '`') {
      if (!quote) {
        quote = char;
        continue;
      }
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function parseValue(raw: string | undefined): unknown {
  if (raw === undefined || raw === '') {
    return true;
  }
  const trimmed = raw.trim();
  if (/^(true|false)$/i.test(trimmed)) {
    return trimmed.toLowerCase() === 'true';
  }
  if (/^null$/i.test(trimmed)) {
    return null;
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      throw new CommandParseError(`JSON değeri çözümlenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`, 'INVALID_ARGUMENT');
    }
  }
  return trimmed;
}

function assignNested(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.').filter(Boolean);
  if (!segments.length) {
    return;
  }
  let current: Record<string, unknown> = target;
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value;
      return;
    }
    if (typeof current[segment] !== 'object' || current[segment] === null || Array.isArray(current[segment])) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  });
}

interface ParsedOptions {
  positional: string[];
  flags: Record<string, string | undefined>;
}

function splitOptions(tokens: string[]): ParsedOptions {
  const positional: string[] = [];
  const flags: Record<string, string | undefined> = {};

  tokens.forEach((token) => {
    if (token.startsWith('--')) {
      const [key, ...rest] = token.slice(2).split('=');
      const value = rest.length > 0 ? rest.join('=') : undefined;
      flags[key] = value;
    } else {
      positional.push(token);
    }
  });

  return { positional, flags };
}

function parseTaskCommand(raw: string, tokens: string[]): CreateTaskCommand {
  if (tokens.length < 2) {
    throw new CommandParseError('Görev komutu için başlık gerekli (örn. /gorev "Ekip toplantısı" --oncelik=High).', 'INVALID_ARGUMENT');
  }

  const [, ...rest] = tokens;
  const { positional, flags } = splitOptions(rest);
  const title = positional.length > 0 ? positional.join(' ') : flags.baslik || flags.title || '';

  if (!title.trim()) {
    throw new CommandParseError('Görev başlığı boş olamaz.', 'INVALID_ARGUMENT');
  }

  const description = flags.aciklama || flags.acikla || flags.desc || flags.description;
  const assignee = flags.atama || flags.assign || flags.assignee;
  const priorityRaw = (flags.oncelik || flags.priority || 'Medium').toLowerCase();
  const priorityMap: Record<string, 'High' | 'Medium' | 'Low'> = {
    high: 'High',
    h: 'High',
    yuksek: 'High',
    yüksek: 'High',
    medium: 'Medium',
    m: 'Medium',
    orta: 'Medium',
    low: 'Low',
    l: 'Low',
    dusuk: 'Low',
    düşük: 'Low',
  };
  const dueDate = flags.tarih || flags.son || flags.due || flags.deadline;

  return {
    type: 'createTask',
    raw,
    title: title.trim(),
    description: description?.trim() || undefined,
    assignee: assignee?.trim() || undefined,
    priority: priorityMap[priorityRaw] || 'Medium',
    dueDate: dueDate?.trim() || undefined,
  };
}

function parseRecordCommand(raw: string, tokens: string[]): UpdateRecordCommand {
  if (tokens.length < 4) {
    throw new CommandParseError('Kayıt komutu için koleksiyon, kayıt ID ve en az bir alan gerekir (örn. /kayit finance 123 status=Approved).', 'INVALID_ARGUMENT');
  }

  const [, collection, recordId, ...rest] = tokens;
  const { positional, flags } = splitOptions(rest);

  const changes: Record<string, unknown> = {};

  if (flags.degisiklik || flags.changes) {
    const parsed = parseValue(flags.degisiklik || flags.changes);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new CommandParseError('changes parametresi yalnızca JSON nesnesi kabul eder.', 'INVALID_ARGUMENT');
    }
    Object.assign(changes, parsed as Record<string, unknown>);
  }

  positional.forEach((pair) => {
    const [key, ...restValue] = pair.split('=');
    if (!key || !restValue.length) {
      throw new CommandParseError(`Geçersiz alan eşlemesi: ${pair}`, 'INVALID_ARGUMENT');
    }
    assignNested(changes, key, parseValue(restValue.join('=')));
  });

  Object.entries(flags).forEach(([key, value]) => {
    if (key.startsWith('set.')) {
      assignNested(changes, key.replace(/^set\./, ''), parseValue(value));
    }
  });

  if (!Object.keys(changes).length) {
    throw new CommandParseError('Uygulanacak değişiklik bulunamadı. JSON ya da key=value parametreleri ekleyin.', 'INVALID_ARGUMENT');
  }

  return {
    type: 'updateRecord',
    raw,
    collection,
    recordId,
    changes,
  };
}

function parseReportCommand(raw: string, tokens: string[]): TriggerReportCommand {
  if (tokens.length < 2) {
    throw new CommandParseError('Rapor komutu için rapor tipi gerekli (örn. /rapor haftalik_finans).', 'INVALID_ARGUMENT');
  }

  const [, reportType, ...rest] = tokens;
  const { positional, flags } = splitOptions(rest);
  const parameters: Record<string, unknown> = {};

  if (flags.paramjson || flags.params || flags.parametreler) {
    const parsed = parseValue(flags.paramjson || flags.params || flags.parametreler);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new CommandParseError('param-json değeri JSON nesnesi olmalıdır.', 'INVALID_ARGUMENT');
    }
    Object.assign(parameters, parsed as Record<string, unknown>);
  }

  positional.forEach((entry) => {
    const [key, ...restValue] = entry.split('=');
    if (!key || !restValue.length) {
      throw new CommandParseError(`Geçersiz parametre: ${entry}`, 'INVALID_ARGUMENT');
    }
    assignNested(parameters, key, parseValue(restValue.join('=')));
  });

  Object.entries(flags).forEach(([key, value]) => {
    if (key.startsWith('param.')) {
      assignNested(parameters, key.replace(/^param\./, ''), parseValue(value));
    }
  });

  const notes = flags.not || flags.notlar || flags.note || flags.notes;

  return {
    type: 'triggerReport',
    raw,
    reportType,
    parameters,
    notes: notes?.trim() || undefined,
  };
}

export interface ParseResult {
  command: AutomationCommand;
  warnings?: string[];
}

export function parseAutomationCommand(input: string): ParseResult | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const tokens = tokenizeInput(trimmed);
  const base = tokens[0]?.toLowerCase();

  try {
    switch (base) {
      case '/gorev':
      case '/görev':
      case '/task':
        return { command: parseTaskCommand(trimmed, tokens) };
      case '/kayit':
      case '/kayıt':
      case '/record':
        return { command: parseRecordCommand(trimmed, tokens) };
      case '/rapor':
      case '/report':
        return { command: parseReportCommand(trimmed, tokens) };
      default:
        throw new CommandParseError(`Desteklenmeyen komut: ${base || trimmed}`, 'UNSUPPORTED_COMMAND');
    }
  } catch (error) {
    if (error instanceof CommandParseError) {
      throw error;
    }
    throw new CommandParseError(error instanceof Error ? error.message : 'Komut çözümlenemedi.', 'INVALID_ARGUMENT');
  }
}

export function formatCommandSummary(command: AutomationCommand): string {
  switch (command.type) {
    case 'createTask': {
      const parts = [`Görev oluştur: "${command.title}"`];
      if (command.assignee) {
        parts.push(`atanan: ${command.assignee}`);
      }
      if (command.priority) {
        parts.push(`öncelik: ${command.priority}`);
      }
      if (command.dueDate) {
        parts.push(`teslim: ${command.dueDate}`);
      }
      return `${parts.join(' · ')}. Onaylıyor musunuz?`;
    }
    case 'updateRecord': {
      const preview = JSON.stringify(command.changes, null, 2);
      return `Kayıt güncelle: ${command.collection} → ${command.recordId}. Uygulanacak değişiklikler:\n${preview}\nOnaylıyor musunuz?`;
    }
    case 'triggerReport': {
      const paramsPreview = Object.keys(command.parameters).length
        ? JSON.stringify(command.parameters, null, 2)
        : 'Parametre yok';
      const notesLine = command.notes ? `Not: ${command.notes}\n` : '';
      return `Rapor tetikle: ${command.reportType}.\n${notesLine}${paramsPreview}\nOnaylıyor musunuz?`;
    }
    default:
      return 'Komut özeti oluşturulamadı.';
  }
}
