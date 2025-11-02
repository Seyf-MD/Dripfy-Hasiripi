import * as React from 'react';
import { OKRRecord } from '../../../types';
import { useLanguage } from '../../../i18n/LanguageContext';
import { Edit2, CheckCircle2, Building2, User, TrendingUp, Calendar } from 'lucide-react';

interface OkrProgressListProps {
  okrs: OKRRecord[];
  onEdit: (okr: OKRRecord) => void;
  onValidate: (okr: OKRRecord) => void;
}

const OkrProgressList: React.FC<OkrProgressListProps> = ({ okrs, onEdit, onValidate }) => {
  const { t, language } = useLanguage();
  
  const getLocale = () => {
    const localeMap: Record<string, string> = {
      'tr': 'tr-TR',
      'en': 'en-US',
      'de': 'de-DE',
      'ru': 'ru-RU',
      'ar': 'ar-SA',
    };
    return localeMap[language] || 'tr-TR';
  };
  
  const getKeyResultsLabel = () => {
    const translated = t('okr.keyResults');
    // If translation function returns the key itself, use fallback
    if (translated === 'okr.keyResults' || translated.includes('KEYRESULTS')) {
      const fallback: Record<string, string> = {
        'tr': 'Anahtar Sonuçlar',
        'en': 'Key Results',
        'de': 'Schlüsselergebnisse',
        'ru': 'Ключевые Результаты',
        'ar': 'النتائج الرئيسية',
      };
      return fallback[language] || 'Key Results';
    }
    return translated;
  };
  
  if (!okrs.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 bg-white/30 dark:bg-neutral-900 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t('okr.notFound')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {okrs.map((okr) => {
        const progress = Math.round((okr.progress || 0) * 100);
        const getProgressColor = (p: number) => {
          if (p >= 80) return 'bg-emerald-500';
          if (p >= 50) return 'bg-blue-500';
          if (p >= 25) return 'bg-amber-500';
          return 'bg-rose-500';
        };
        
        const getProgressBgColor = (p: number) => {
          if (p >= 80) return 'bg-emerald-50 dark:bg-emerald-500/10';
          if (p >= 50) return 'bg-blue-50 dark:bg-blue-500/10';
          if (p >= 25) return 'bg-amber-50 dark:bg-amber-500/10';
          return 'bg-rose-50 dark:bg-rose-500/10';
        };

        return (
          <div key={okr.id} className="group rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            {/* Header Section */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-transparent dark:from-neutral-800/50 dark:to-transparent border-b border-slate-100 dark:border-neutral-800">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight">{okr.objective}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <Building2 size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="font-medium">{okr.department}</span>
                    </div>
                    <span className="text-slate-300 dark:text-neutral-700">·</span>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <User size={14} className="text-slate-400 dark:text-slate-500" />
                      <span className="font-medium uppercase">{okr.ownerRole}</span>
                    </div>
                    {okr.targetDate && (
                      <>
                        <span className="text-slate-300 dark:text-neutral-700">·</span>
                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Calendar size={14} className="text-slate-400 dark:text-slate-500" />
                          <span>{new Date(okr.targetDate).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {okr.requiresValidation && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-3 py-1.5 text-xs font-semibold shadow-sm">
                      <CheckCircle2 size={12} />
                      {t('okr.pendingApproval')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(okr)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                  >
                    <Edit2 size={14} />
                    {t('actions.edit')}
                  </button>
                  {okr.requiresValidation && (
                    <button
                      type="button"
                      onClick={() => onValidate(okr)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-2 text-xs font-semibold hover:bg-emerald-700 shadow-sm transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      {t('okr.validate')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Section */}
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-slate-400 dark:text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('okr.progressLabel')}</span>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${getProgressBgColor(progress)}`}>
                  <span className={`${progress >= 80 ? 'text-emerald-700 dark:text-emerald-400' : progress >= 50 ? 'text-blue-700 dark:text-blue-400' : progress >= 25 ? 'text-amber-700 dark:text-amber-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {progress}%
                  </span>
                </div>
              </div>
              <div className="mt-3 relative h-3 w-full rounded-full bg-slate-200 dark:bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Key Results Section */}
              {okr.keyResults && okr.keyResults.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-neutral-800">
                  <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                    {getKeyResultsLabel()}
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {okr.keyResults.map((kr) => {
                      const krProgress = kr.target > 0 ? Math.min(100, (kr.current / kr.target) * 100) : 0;
                      return (
                        <div key={kr.id} className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/50 px-4 py-3 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 leading-tight">{kr.title}</p>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs text-slate-600 dark:text-slate-400">
                              {kr.metricUnit === 'percent'
                                ? `${Math.round(kr.current)}% / ${Math.round(kr.target)}%`
                                : `${kr.current} / ${kr.target} ${kr.metricUnit}`}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {Math.round(krProgress)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-neutral-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getProgressColor(krProgress)}`}
                              style={{ width: `${krProgress}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OkrProgressList;
