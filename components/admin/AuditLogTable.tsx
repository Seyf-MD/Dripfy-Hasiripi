import * as React from 'react';
import { Download, Filter, Loader2, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { AuditLogCriticality, AuditLogEntry } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
const AUDIT_ENDPOINT = API_BASE ? `${API_BASE}/api/audit/logs` : '/api/audit/logs';
const LOCAL_STORAGE_KEY = 'dripfy.auditLog.savedFilters';

interface AuditLogTableProps {
  initialLogs?: AuditLogEntry[];
  authToken: string | null;
}

type FilterCriticality = AuditLogCriticality | '';

interface FilterState {
  startDate: string;
  endDate: string;
  user: string;
  action: string;
  label: string;
  sourceModule: string;
  criticality: FilterCriticality;
}

interface SavedFilterSet {
  id: string;
  name: string;
  filters: FilterState;
  createdAt: string;
}

interface AuditFilterOptions {
  users: string[];
  actions: string[];
  labels: string[];
  sourceModules: string[];
  criticalities: string[];
}

const defaultFilters: FilterState = {
  startDate: '',
  endDate: '',
  user: '',
  action: '',
  label: '',
  sourceModule: '',
  criticality: '',
};

function parseFiltersFromSearch(search: string): FilterState {
  const params = new URLSearchParams(search);
  return {
    startDate: params.get('startDate') || '',
    endDate: params.get('endDate') || '',
    user: params.get('user') || '',
    action: params.get('action') || '',
    label: params.get('label') || '',
    sourceModule: params.get('sourceModule') || '',
    criticality: (params.get('criticality') as FilterCriticality) || '',
  };
}

function updateUrlWithFilters(filters: FilterState) {
  const params = new URLSearchParams(window.location.search);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });
  const nextUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
}

function downloadCsv(rows: AuditLogEntry[]) {
  if (!rows.length) {
    return;
  }
  const header = ['Timestamp', 'User', 'Action', 'Target', 'Target ID', 'Label', 'Source', 'Criticality', 'Details'];
  const payload = rows.map((row) => [
    new Date(row.timestamp).toISOString(),
    row.user,
    row.action,
    row.targetType,
    row.targetId,
    row.label,
    row.sourceModule,
    row.criticality,
    row.details?.replace(/\n/g, ' '),
  ]);
  const csv = [header, ...payload]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `audit-log-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const AuditLogTable: React.FC<AuditLogTableProps> = ({ initialLogs = [], authToken }) => {
  const { t } = useLanguage();
  const translate = React.useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t],
  );
  const [filters, setFilters] = React.useState<FilterState>(() => parseFiltersFromSearch(window.location.search));
  const [draftFilters, setDraftFilters] = React.useState<FilterState>(() => ({ ...filters }));
  const [logs, setLogs] = React.useState<AuditLogEntry[]>(initialLogs);
  const [totalCount, setTotalCount] = React.useState<number>(initialLogs.length);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = React.useState<boolean>(false);
  const [savedFilters, setSavedFilters] = React.useState<SavedFilterSet[]>([]);
  const [filterOptions, setFilterOptions] = React.useState<AuditFilterOptions>({
    users: [],
    actions: [],
    labels: [],
    sourceModules: [],
    criticalities: [],
  });
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const loadingRef = React.useRef(false);

  const applyFilters = React.useCallback((nextFilters: FilterState) => {
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
  }, []);

  const resetFilters = React.useCallback(() => {
    applyFilters({ ...defaultFilters });
  }, [applyFilters]);

  React.useEffect(() => {
    updateUrlWithFilters(filters);
  }, [filters]);

  React.useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedFilterSet[];
        if (Array.isArray(parsed)) {
          setSavedFilters(parsed);
        }
      }
    } catch (storageError) {
      console.warn('[audit-log] Failed to read saved filters from storage:', storageError);
    }
  }, []);

  const persistSavedFilters = React.useCallback((next: SavedFilterSet[]) => {
    setSavedFilters(next);
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
    } catch (storageError) {
      console.warn('[audit-log] Failed to persist saved filters:', storageError);
    }
  }, []);

  const fetchLogs = React.useCallback(
    async ({ reset = false, cursorOverride = null }: { reset?: boolean; cursorOverride?: string | null } = {}) => {
      if (loadingRef.current) {
        return;
      }
      loadingRef.current = true;
      setIsLoading(true);
      if (reset) {
        setError(null);
        setCursor(null);
      }

      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            params.set(key, value);
          }
        });

        const effectiveCursor = reset ? null : cursorOverride ?? cursor;
        if (effectiveCursor) {
          params.set('cursor', effectiveCursor);
        }
        params.set('limit', '50');

        const response = await fetch(`${AUDIT_ENDPOINT}?${params.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: 'include',
        });

        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to load audit log');
        }

        const nextLogs = Array.isArray(data.results) ? (data.results as AuditLogEntry[]) : [];
        setFilterOptions({
          users: data.filters?.users || [],
          actions: data.filters?.actions || [],
          labels: data.filters?.labels || [],
          sourceModules: data.filters?.sourceModules || [],
          criticalities: data.filters?.criticalities || [],
        });
        setCursor(data.nextCursor || null);
        setHasMore(Boolean(data.hasMore));
        setTotalCount(typeof data.total === 'number' ? data.total : nextLogs.length);

        if (reset) {
          setLogs(nextLogs);
        } else {
          setLogs((prev) => {
            const existing = new Set(prev.map((entry) => entry.id));
            const merged = [...prev];
            nextLogs.forEach((entry) => {
              if (!existing.has(entry.id)) {
                merged.push(entry);
              }
            });
            return merged;
          });
        }
      } catch (requestError) {
        console.error('[audit-log] Failed to fetch audit logs', requestError);
        setError(requestError instanceof Error ? requestError.message : 'Unknown error');
        setHasMore(false);
        setCursor(null);
        if (reset && initialLogs.length) {
          setLogs(initialLogs);
          setTotalCount(initialLogs.length);
        }
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [authToken, cursor, filters, initialLogs.length],
  );

  React.useEffect(() => {
    fetchLogs({ reset: true });
  }, [fetchLogs, filters]);

  React.useEffect(() => {
    if (!hasMore || isLoading) {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first?.isIntersecting) {
        fetchLogs({ cursorOverride: cursor });
      }
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [cursor, fetchLogs, hasMore, isLoading]);

  const handleSaveFilters = React.useCallback(() => {
    const name = window.prompt(translate('admin.auditLogSaveFilterPrompt', 'Filtre seti için bir ad girin'));
    if (!name) {
      return;
    }
    const next: SavedFilterSet = {
      id: `filter-${Date.now()}`,
      name,
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };
    persistSavedFilters([...savedFilters, next]);
  }, [filters, persistSavedFilters, savedFilters, t]);

  const handleDeleteFilter = React.useCallback(
    (id: string) => {
      const next = savedFilters.filter((item) => item.id !== id);
      persistSavedFilters(next);
    },
    [persistSavedFilters, savedFilters],
  );

  const handleApplySavedFilter = React.useCallback(
    (setId: string) => {
      const selected = savedFilters.find((set) => set.id === setId);
      if (selected) {
        applyFilters({ ...selected.filters });
      }
    },
    [applyFilters, savedFilters],
  );

  const criticalityOptions = React.useMemo(() => {
    if (filterOptions.criticalities.length) {
      return filterOptions.criticalities as FilterCriticality[];
    }
    return ['low', 'medium', 'high', 'critical'] as FilterCriticality[];
  }, [filterOptions.criticalities]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">{translate('admin.auditLog', 'Audit Log')}</h2>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
            {translate('admin.auditLogDescription', 'İşlem geçmişini filtreleyin, kaydedin ve dışa aktarın.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-neutral-700 px-3 py-2 text-sm font-medium text-[var(--drip-text)] dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-700"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            type="button"
          >
            <Filter size={16} />
            {isFilterPanelOpen
              ? translate('common.hideFilters', 'Filtreleri gizle')
              : translate('common.showFilters', 'Filtreleri göster')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-[color:rgba(75,165,134,0.15)] text-[var(--drip-primary)] dark:text-[var(--drip-primary)] px-3 py-2 text-sm font-semibold hover:bg-[color:rgba(75,165,134,0.25)]"
            onClick={() => downloadCsv(logs)}
            type="button"
            disabled={!logs.length}
          >
            <Download size={16} />
            {translate('common.exportCsv', 'CSV dışa aktar')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-neutral-700 px-3 py-2 text-sm font-medium text-[var(--drip-text)] dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-700"
            onClick={handleSaveFilters}
            type="button"
          >
            <Save size={16} />
            {translate('common.save', 'Kaydet')}
          </button>
        </div>
      </header>

      {isFilterPanelOpen && (
        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('common.startDate', 'Başlangıç tarihi')}</span>
              <input
                type="date"
                value={draftFilters.startDate}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, startDate: event.target.value }))}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('common.endDate', 'Bitiş tarihi')}</span>
              <input
                type="date"
                value={draftFilters.endDate}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, endDate: event.target.value }))}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('common.user', 'Kullanıcı')}</span>
              <input
                type="text"
                value={draftFilters.user}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, user: event.target.value }))}
                placeholder={translate('admin.auditLogUserPlaceholder', 'Kullanıcı adı veya e-posta')}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('admin.auditLogEventType', 'Olay türü')}</span>
              <select
                value={draftFilters.action}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, action: event.target.value }))}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              >
                <option value="">{translate('common.all', 'Tümü')}</option>
                {(filterOptions.actions.length ? filterOptions.actions : ['Created', 'Updated', 'Deleted', 'Approved', 'Denied']).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('admin.auditLogLabel', 'Etiket')}</span>
              <select
                value={draftFilters.label}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, label: event.target.value }))}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              >
                <option value="">{translate('common.all', 'Tümü')}</option>
                {filterOptions.labels.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('admin.auditLogSourceModule', 'Kaynak modül')}</span>
              <select
                value={draftFilters.sourceModule}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, sourceModule: event.target.value }))}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              >
                <option value="">{translate('common.all', 'Tümü')}</option>
                {filterOptions.sourceModules.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-[var(--drip-text)] dark:text-white">{translate('admin.auditLogCriticality', 'Kritiklik')}</span>
              <select
                value={draftFilters.criticality}
                onChange={(event) => setDraftFilters((prev) => ({ ...prev, criticality: event.target.value as FilterCriticality }))}
                className="w-full rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
              >
                <option value="">{translate('common.all', 'Tümü')}</option>
                {criticalityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 dark:border-neutral-700 px-3 py-2 text-sm font-medium text-[var(--drip-text)] dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-700"
              onClick={resetFilters}
              type="button"
            >
              <RefreshCcw size={16} />
              {translate('common.reset', 'Sıfırla')}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-md bg-[var(--drip-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[color:rgba(75,165,134,0.85)]"
              onClick={() => applyFilters({ ...draftFilters })}
              type="button"
            >
              {translate('common.apply', 'Uygula')}
            </button>
          </div>
        </div>
      )}

      {savedFilters.length > 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{translate('admin.auditLogSavedFilters', 'Kaydedilen filtreler')}</h3>
            <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
              {translate('admin.auditLogSavedFiltersHint', 'Kaydedilen bir set seçildiğinde filtreler otomatik uygulanır.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedFilters.map((set) => (
              <div key={set.id} className="flex items-center gap-2 rounded-full bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 px-3 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleApplySavedFilter(set.id)}
                  className="font-semibold text-[var(--drip-text)] dark:text-white hover:underline"
                >
                  {set.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteFilter(set.id)}
                  className="text-red-500 hover:text-red-600"
                  aria-label={translate('common.delete', 'Sil')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-700 px-4 py-3 text-sm text-[var(--drip-muted)] dark:text-neutral-400">
          <span>{translate('admin.auditLogTotalCount', 'Toplam {count} kayıt bulundu').replace('{count}', String(totalCount))}</span>
          {isLoading && (
            <span className="inline-flex items-center gap-2 text-[var(--drip-primary)]">
              <Loader2 size={16} className="animate-spin" />
              {translate('common.loading', 'Yükleniyor...')}
            </span>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-200 dark:divide-neutral-700">
          {logs.map((log) => (
            <article key={log.id} className="p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--drip-text)] dark:text-white">
                    <span className="uppercase tracking-wide text-xs text-slate-500 dark:text-neutral-400 mr-2">{log.action}</span>
                    {log.targetType}
                  </p>
                  <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">{log.targetId}</p>
                </div>
                <time className="text-xs text-[var(--drip-muted)] dark:text-neutral-400" dateTime={log.timestamp}>
                  {new Date(log.timestamp).toLocaleString()}
                </time>
              </div>
              <p className="mt-2 text-[var(--drip-text)] dark:text-neutral-200 whitespace-pre-wrap break-words">{log.details}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-neutral-900 px-2 py-1 text-[var(--drip-text)] dark:text-neutral-200">
                  {translate('common.user', 'Kullanıcı')}: {log.user}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-neutral-900 px-2 py-1 text-[var(--drip-text)] dark:text-neutral-200">
                  {translate('admin.auditLogLabel', 'Etiket')}: {log.label}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-neutral-900 px-2 py-1 text-[var(--drip-text)] dark:text-neutral-200">
                  {translate('admin.auditLogSourceModule', 'Kaynak modül')}: {log.sourceModule}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-white ${
                    log.criticality === 'high'
                      ? 'bg-red-500'
                      : log.criticality === 'critical'
                      ? 'bg-red-700'
                      : log.criticality === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-emerald-500'
                  }`}
                >
                  {translate('admin.auditLogCriticality', 'Kritiklik')}: {log.criticality}
                </span>
              </div>
            </article>
          ))}
          {!logs.length && !isLoading && (
            <div className="p-6 text-center text-sm text-[var(--drip-muted)] dark:text-neutral-400">
              {error ? error : translate('admin.auditLogEmpty', 'Filtre kriterlerine uygun kayıt bulunamadı.')}
            </div>
          )}
          <div ref={sentinelRef} />
        </div>
      </div>
    </section>
  );
};

export default AuditLogTable;
