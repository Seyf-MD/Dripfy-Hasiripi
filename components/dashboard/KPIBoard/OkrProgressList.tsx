import * as React from 'react';
import { OKRRecord } from '../../../types';

interface OkrProgressListProps {
  okrs: OKRRecord[];
  onEdit: (okr: OKRRecord) => void;
  onValidate: (okr: OKRRecord) => void;
}

const OkrProgressList: React.FC<OkrProgressListProps> = ({ okrs, onEdit, onValidate }) => {
  if (!okrs.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 bg-white/30 dark:bg-neutral-900 px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Seçilen filtreler için OKR kaydı bulunamadı.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {okrs.map((okr) => {
        const progress = Math.round((okr.progress || 0) * 100);
        return (
          <div key={okr.id} className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900 px-4 py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{okr.objective}</h4>
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{okr.department} · {okr.ownerRole}</p>
              </div>
              <div className="flex items-center gap-2">
                {okr.requiresValidation && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-3 py-1 text-xs font-semibold">
                    Onay Bekliyor
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(okr)}
                  className="rounded-lg border border-slate-200 dark:border-neutral-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600"
                >
                  Güncelle
                </button>
                {okr.requiresValidation && (
                  <button
                    type="button"
                    onClick={() => onValidate(okr)}
                    className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-medium hover:bg-emerald-700"
                  >
                    Doğrula
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>İlerleme</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-neutral-800">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500 dark:text-slate-400">
                {okr.keyResults.map((kr) => (
                  <div key={kr.id} className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900 px-3 py-2">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{kr.title}</p>
                    <p className="mt-1">
                      {kr.metricUnit === 'percent'
                        ? `${Math.round(kr.current)}% / ${Math.round(kr.target)}%`
                        : `${kr.current} / ${kr.target} ${kr.metricUnit}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OkrProgressList;
