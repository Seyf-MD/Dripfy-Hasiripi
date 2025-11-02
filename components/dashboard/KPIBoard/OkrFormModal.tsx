import * as React from 'react';
import { Department, OperationalRole, OKRRecord, OKRKeyResult } from '../../../types';
import type { SaveOkrPayload } from '../../../services/analytics';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Plus, X } from 'lucide-react';

interface OkrFormModalProps {
  isOpen: boolean;
  okr: OKRRecord | null;
  availableRoles: OperationalRole[];
  availableDepartments: Department[];
  onClose: () => void;
  onSubmit: (payload: SaveOkrPayload) => Promise<void> | void;
}

const numberFormatter = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

const OkrFormModal: React.FC<OkrFormModalProps> = ({
  isOpen,
  okr,
  availableRoles,
  availableDepartments,
  onClose,
  onSubmit,
}) => {
  const { t, language } = useLanguage();
  
  // Helper function to safely get translations with fallback
  const getTranslation = (key: string, fallback: Record<string, string>): string => {
    const translated = t(key);
    if (translated === key || translated.includes('okr.') || translated.includes('OKR.')) {
      return fallback[language] || fallback['en'] || translated;
    }
    return translated;
  };
  const [objective, setObjective] = React.useState(okr?.objective ?? '');
  const [ownerRole, setOwnerRole] = React.useState<OperationalRole>(okr?.ownerRole ?? availableRoles[0]);
  const [department, setDepartment] = React.useState<Department>(okr?.department ?? availableDepartments[0]);
  const [progress, setProgress] = React.useState<number>(okr?.progress ?? 0);
  const [currentValue, setCurrentValue] = React.useState<number>(okr?.metrics.current ?? 0);
  const [targetValue, setTargetValue] = React.useState<number>(okr?.metrics.target ?? 100);
  const [keyResults, setKeyResults] = React.useState<OKRKeyResult[]>(okr?.keyResults ?? []);
  const [requiresValidation, setRequiresValidation] = React.useState<boolean>(okr?.requiresValidation ?? false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setObjective(okr?.objective ?? '');
    setOwnerRole(okr?.ownerRole ?? availableRoles[0]);
    setDepartment(okr?.department ?? availableDepartments[0]);
    setProgress(okr?.progress ?? 0);
    setCurrentValue(okr?.metrics.current ?? 0);
    setTargetValue(okr?.metrics.target ?? 100);
    setKeyResults(okr?.keyResults ? [...okr.keyResults] : []);
    setRequiresValidation(okr?.requiresValidation ?? false);
    setError(null);
  }, [isOpen, okr, availableRoles, availableDepartments]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        id: okr?.id,
        objective,
        ownerRole,
        department,
        progress,
        requiresValidation,
        keyResults,
        metrics: {
          ...okr?.metrics,
          current: currentValue,
          target: targetValue,
        },
      });
      onClose();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : t('okr.saveFailed');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = okr ? t('okr.update') : t('okr.create');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-slate-200 dark:border-neutral-700">
        <div className="border-b border-slate-100 dark:border-neutral-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('okr.objective')}</label>
            <input
              type="text"
              required
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('okr.role')}</span>
              <select
                value={ownerRole}
                onChange={(event) => setOwnerRole(event.target.value as OperationalRole)}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableRoles.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>{roleOption}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('okr.department')}</span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value as Department)}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>{t('okr.progressLabel')}</span>
              <span>{numberFormatter.format(progress * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('okr.currentValue')}</span>
              <input
                type="number"
                value={currentValue}
                onChange={(event) => setCurrentValue(Number(event.target.value))}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('okr.targetValue')}</span>
              <input
                type="number"
                value={targetValue}
                onChange={(event) => setTargetValue(Number(event.target.value))}
                className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>

          {/* Key Results Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {getTranslation('okr.keyResults', {
                  'tr': 'Anahtar Sonuçlar',
                  'en': 'Key Results',
                  'de': 'Schlüsselergebnisse',
                  'ru': 'Ключевые Результаты',
                  'ar': 'النتائج الرئيسية',
                })}
              </label>
              <button
                type="button"
                onClick={() => {
                  const newKr: OKRKeyResult = {
                    id: `kr-${Date.now()}`,
                    title: '',
                    metricUnit: 'percent',
                    baseline: 0,
                    target: 100,
                    current: 0,
                    status: 'onTrack',
                  };
                  setKeyResults([...keyResults, newKr]);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600"
              >
                <Plus size={14} />
                {getTranslation('okr.addKeyResult', {
                  'tr': 'Anahtar Sonuç Ekle',
                  'en': 'Add Key Result',
                  'de': 'Schlüsselergebnis hinzufügen',
                  'ru': 'Добавить Ключевой Результат',
                  'ar': 'إضافة نتيجة رئيسية',
                })}
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {keyResults.map((kr, index) => (
                <div key={kr.id} className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/50 p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">#{index + 1}</span>
                    {keyResults.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setKeyResults(keyResults.filter((k) => k.id !== kr.id))}
                        className="text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {getTranslation('okr.keyResultTitle', {
                        'tr': 'Başlık',
                        'en': 'Title',
                        'de': 'Titel',
                        'ru': 'Название',
                        'ar': 'العنوان',
                      })}
                    </label>
                    <input
                      type="text"
                      value={kr.title}
                      onChange={(e) => {
                        const updated = [...keyResults];
                        updated[index] = { ...kr, title: e.target.value };
                        setKeyResults(updated);
                      }}
                      className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder={getTranslation('okr.keyResultTitlePlaceholder', {
                        'tr': 'Key result başlığı',
                        'en': 'Key result title',
                        'de': 'Schlüsselergebnis-Titel',
                        'ru': 'Название ключевого результата',
                        'ar': 'عنوان النتيجة الرئيسية',
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="flex flex-col gap-1.5 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{t('okr.currentValue')}</span>
                      <input
                        type="number"
                        value={kr.current}
                        onChange={(e) => {
                          const updated = [...keyResults];
                          updated[index] = { ...kr, current: Number(e.target.value) };
                          setKeyResults(updated);
                        }}
                        className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{t('okr.targetValue')}</span>
                      <input
                        type="number"
                        value={kr.target}
                        onChange={(e) => {
                          const updated = [...keyResults];
                          updated[index] = { ...kr, target: Number(e.target.value) };
                          setKeyResults(updated);
                        }}
                        className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {getTranslation('okr.metricUnit', {
                          'tr': 'Birim',
                          'en': 'Unit',
                          'de': 'Einheit',
                          'ru': 'Единица',
                          'ar': 'الوحدة',
                        })}
                      </span>
                      <select
                        value={kr.metricUnit}
                        onChange={(e) => {
                          const updated = [...keyResults];
                          updated[index] = { ...kr, metricUnit: e.target.value };
                          setKeyResults(updated);
                        }}
                        className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="percent">%</option>
                        <option value="number">{getTranslation('okr.metricNumber', {
                          'tr': 'Sayı',
                          'en': 'Number',
                          'de': 'Zahl',
                          'ru': 'Число',
                          'ar': 'رقم',
                        })}</option>
                        <option value="currency">{getTranslation('okr.metricCurrency', {
                          'tr': 'Para',
                          'en': 'Currency',
                          'de': 'Währung',
                          'ru': 'Валюта',
                          'ar': 'عملة',
                        })}</option>
                      </select>
                    </label>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {t('okr.progressLabel')}: {kr.target > 0 ? Math.round((kr.current / kr.target) * 100) : 0}%
                  </div>
                </div>
              ))}
              {keyResults.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/50 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {getTranslation('okr.noKeyResults', {
                    'tr': 'Henüz anahtar sonuç eklenmedi',
                    'en': 'No key results added yet',
                    'de': 'Noch keine Schlüsselergebnisse hinzugefügt',
                    'ru': 'Ключевые результаты еще не добавлены',
                    'ar': 'لم يتم إضافة نتائج رئيسية بعد',
                  })}
                </div>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={requiresValidation}
              onChange={(event) => setRequiresValidation(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            {t('okr.requiresValidation')}
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500"
              disabled={isSubmitting}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSubmitting ? t('okr.saving') : t('actions.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OkrFormModal;
