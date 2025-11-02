import * as React from 'react';
import MetricCard from './MetricCard';
import RoleFilters from './RoleFilters';
import OkrProgressList from './OkrProgressList';
import OkrFormModal from './OkrFormModal';
import OkrValidationModal from './OkrValidationModal';
import { useUserContext } from '../../../context/UserContext';
import { Department, KpiOverview, OKRRecord, OperationalRole } from '../../../types';
import { fetchKpiOverview, fetchOkrs, saveOkr, validateOkr } from '../../../services/analytics';
import { useLanguage } from '../../../i18n/LanguageContext';

const ROLE_OPTIONS: OperationalRole[] = ['admin', 'finance', 'operations', 'product', 'medical', 'people'];
const DEPARTMENT_OPTIONS: Department[] = ['Operations', 'Expansion', 'Revenue', 'Medical', 'Product', 'People'];

const ROLE_WIDGET_MAP: Partial<Record<OperationalRole, string[]>> = {
  finance: ['net-cash-flow', 'okr-progress'],
  operations: ['task-completion', 'okr-progress'],
  product: ['okr-progress'],
  medical: ['okr-progress'],
  people: ['task-completion', 'okr-progress'],
};

interface KPIBoardProps {
  initialOkrs: OKRRecord[];
  onOkrsChange?: (okrs: OKRRecord[]) => void;
}

const KPIBoard: React.FC<KPIBoardProps> = ({ initialOkrs, onOkrsChange }) => {
  const { t } = useLanguage();
  const { operationalRole, department } = useUserContext();
  const [selectedRole, setSelectedRole] = React.useState<OperationalRole | null>(operationalRole ?? null);
  const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(department ?? null);
  const [overview, setOverview] = React.useState<KpiOverview | null>(null);
  const [okrs, setOkrs] = React.useState<OKRRecord[]>(initialOkrs);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [formOkr, setFormOkr] = React.useState<OKRRecord | null>(null);
  const [validationOkr, setValidationOkr] = React.useState<OKRRecord | null>(null);

  const filters = React.useMemo(() => ({ role: selectedRole, department: selectedDepartment }), [selectedRole, selectedDepartment]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, remoteOkrs] = await Promise.all([
        fetchKpiOverview(filters),
        fetchOkrs(filters),
      ]);
      setOverview(kpiData);
      setOkrs(remoteOkrs);
      onOkrsChange?.(remoteOkrs);
    } catch (fetchError) {
      console.error('[KPIBoard] Data fetch failed', fetchError);
      setError(fetchError instanceof Error ? fetchError.message : 'Veriler alınamadı.');
    } finally {
      setLoading(false);
    }
  }, [filters, onOkrsChange]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    setSelectedRole(operationalRole ?? null);
    setSelectedDepartment(department ?? null);
  }, [operationalRole, department]);

  React.useEffect(() => {
    setOkrs(initialOkrs);
  }, [initialOkrs]);

  const allowedWidgets = React.useMemo(() => {
    if (!selectedRole || selectedRole === 'admin') {
      return null;
    }
    return ROLE_WIDGET_MAP[selectedRole] ?? null;
  }, [selectedRole]);

  const visibleMetrics = React.useMemo(() => {
    if (!overview) {
      return [];
    }
    if (!allowedWidgets || allowedWidgets.length === 0) {
      return overview.metrics;
    }
    return overview.metrics.filter((metric) => allowedWidgets.includes(metric.id));
  }, [overview, allowedWidgets]);

  const handleOpenForm = (okr?: OKRRecord) => {
    setFormOkr(okr ?? null);
    setFormOpen(true);
  };

  const handleSaveOkr = async (payload: Parameters<typeof saveOkr>[0]) => {
    const saved = await saveOkr(payload);
    setOkrs((prev) => {
      const exists = prev.some((item) => item.id === saved.id);
      const next = exists ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev];
      onOkrsChange?.(next);
      return next;
    });
    await loadData();
  };

  const handleValidateOkr = async (notes?: string) => {
    if (!validationOkr) {
      return;
    }
    const updated = await validateOkr(validationOkr.id, notes);
    setOkrs((prev) => {
      const next = prev.map((item) => (item.id === updated.id ? updated : item));
      onOkrsChange?.(next);
      return next;
    });
    setValidationOkr(null);
    await loadData();
  };

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('okr.dashboardTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('okr.dashboardSubtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <RoleFilters
            role={selectedRole}
            department={selectedDepartment}
            availableRoles={ROLE_OPTIONS}
            availableDepartments={DEPARTMENT_OPTIONS}
            onChangeRole={setSelectedRole}
            onChangeDepartment={setSelectedDepartment}
          />
          <button
            type="button"
            onClick={() => handleOpenForm()}
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700"
          >
            {t('okr.new')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(loading && !overview) ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-xl border border-slate-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900 h-32" />
          ))
        ) : (
          visibleMetrics.map((metric, index) => (
            <MetricCard key={metric.id} metric={metric} isPrimary={index === 0} />
          ))
        )}
      </div>

      {overview?.okrMetrics.requiresValidation ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {overview.okrMetrics.requiresValidation} {t('okr.validationPending')}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900 px-5 py-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('okr.progress')}</h3>
          <button
            type="button"
            onClick={loadData}
            className="text-sm text-emerald-600 hover:text-emerald-700"
          >
            {t('actions.refresh')}
          </button>
        </div>
        <div className="mt-5">
          {loading && okrs.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="animate-pulse rounded-xl border border-slate-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900 h-24" />
              ))}
            </div>
          ) : (
            <OkrProgressList
              okrs={okrs}
              onEdit={(okr) => handleOpenForm(okr)}
              onValidate={(okr) => setValidationOkr(okr)}
            />
          )}
        </div>
      </div>

      <OkrFormModal
        isOpen={formOpen}
        okr={formOkr}
        availableRoles={ROLE_OPTIONS}
        availableDepartments={DEPARTMENT_OPTIONS}
        onClose={() => setFormOpen(false)}
        onSubmit={async (payload) => {
          await handleSaveOkr(payload);
          setFormOpen(false);
        }}
      />

      <OkrValidationModal
        okr={validationOkr}
        isOpen={Boolean(validationOkr)}
        onClose={() => setValidationOkr(null)}
        onValidate={handleValidateOkr}
      />
    </section>
  );
};

export default KPIBoard;
