import * as React from 'react';

interface DatasetFieldDefinition {
  field: string;
  label: string;
  required?: boolean;
}

interface DatasetSummary {
  id: string;
  label: string;
  description?: string;
  canImport: boolean;
  canExport: boolean;
  fields: DatasetFieldDefinition[];
}

interface JobSummary {
  id: string;
  status: string;
  progress?: number;
  processed?: number;
  total?: number;
  exportFileId?: string;
  datasetId?: string;
  error?: string;
}

type WizardStep = 'select-dataset' | 'configure' | 'progress' | 'completed';

const API_BASE = `${(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')}/api/importer`.replace(/^\/+/, '/');

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-2">
    <div
      className="bg-[var(--drip-primary)] h-2 rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

export const ExportWizard: React.FC = () => {
  const [datasets, setDatasets] = React.useState<DatasetSummary[]>([]);
  const [loadingDatasets, setLoadingDatasets] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<WizardStep>('select-dataset');
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null);
  const [filters, setFilters] = React.useState<Record<string, string>>({});
  const [job, setJob] = React.useState<JobSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchDatasets = React.useCallback(async () => {
    setLoadingDatasets(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/datasets`, { credentials: 'include' });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error?.message || 'Veri setleri alınamadı');
      }
      setDatasets(data.datasets || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Veri setleri alınamadı');
    } finally {
      setLoadingDatasets(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const resetWizard = React.useCallback(() => {
    setSelectedDatasetId(null);
    setFilters({});
    setJob(null);
    setStep('select-dataset');
    setError(null);
  }, []);

  const selectedDataset = React.useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) || null,
    [datasets, selectedDatasetId],
  );

  const startExport = async () => {
    if (!selectedDatasetId) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/export`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datasetId: selectedDatasetId, filters }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error?.message || 'Dışa aktarma başlatılamadı');
      }
      setJob({ id: data.jobId, status: 'queued', progress: 0 });
      setStep('progress');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Dışa aktarma başlatılamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  React.useEffect(() => {
    if (!job?.id) {
      return;
    }
    let interval: number | null = window.setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/jobs/${job.id}`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error?.message || 'Durum alınamadı');
        }
        const summary: JobSummary = data.job;
        setJob(summary);
        if (summary.status === 'completed' || summary.status === 'failed') {
          if (interval) {
            window.clearInterval(interval);
          }
          setStep('completed');
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000);
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [job?.id]);

  const renderDatasetSelection = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dışa aktarılacak veri setini seçin</h2>
      {loadingDatasets && <p className="text-sm text-slate-500">Veri setleri yükleniyor...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {datasets
          .filter((dataset) => dataset.canExport)
          .map((dataset) => (
            <button
              key={dataset.id}
              type="button"
              onClick={() => {
                setSelectedDatasetId(dataset.id);
                setFilters({});
                setError(null);
                setStep('configure');
              }}
              className="border border-slate-200 dark:border-neutral-700 rounded-xl p-4 text-left hover:border-[var(--drip-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
            >
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">{dataset.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{dataset.description}</p>
            </button>
          ))}
      </div>
    </div>
  );

  const renderFilterStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Filtreleri belirleyin (opsiyonel)</h2>
        <p className="text-sm text-slate-500 mt-1">Boş bıraktığınız alanlar filtrelenmez.</p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {selectedDataset?.fields.map((field) => (
          <label key={field.field} className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-neutral-200">{field.label || field.field}</span>
            <input
              type="text"
              value={filters[field.field] || ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, [field.field]: event.target.value }))
              }
              className="border border-slate-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-100"
              placeholder="Filtre değeri"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--drip-primary)] text-white disabled:opacity-50"
          onClick={startExport}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Başlatılıyor...' : 'Dışa Aktarmayı Başlat'}
        </button>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-200"
          onClick={resetWizard}
        >
          Geri
        </button>
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dışa aktarma kuyruğa alındı</h2>
        <p className="text-sm text-slate-500 mt-1">İşlem tamamlandığında dosya hazır olacaktır.</p>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-6 space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-neutral-200">
          <span>Durum</span>
          <span className="font-medium text-slate-900 dark:text-white">{job?.status || 'bekliyor'}</span>
        </div>
        <ProgressBar progress={job?.progress ?? 0} />
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-neutral-200">
          <div>
            <div className="text-xs uppercase text-slate-400">Hazırlanan Satır</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{job?.processed ?? 0}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">Toplam</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{job?.total ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompleted = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Dışa aktarma tamamlandı</h2>
        <p className="text-sm text-slate-500 mt-1">
          {job?.status === 'failed'
            ? 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'
            : 'Dosyanız hazır. Aşağıdaki bağlantıdan indirebilirsiniz.'}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-6 space-y-4">
        <div className="text-sm text-slate-600 dark:text-neutral-200">
          Durum: <span className="font-medium text-slate-900 dark:text-white">{job?.status}</span>
        </div>
        {job?.error && <div className="text-sm text-red-500">Hata: {job.error}</div>}
        {job?.status === 'completed' && job.exportFileId && (
          <a
            href={`${API_BASE}/exports/${job.id}/file`}
            className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--drip-primary)] text-white"
          >
            Dosyayı İndir
          </a>
        )}
      </div>
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-200"
        onClick={resetWizard}
      >
        Yeni Dışa Aktarma
      </button>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Dışa Aktarma Sihirbazı</h1>
          <p className="text-sm text-slate-500">Veri setlerini adım adım dışa aktarın.</p>
        </div>
        {selectedDataset && (
          <div className="text-right text-sm text-slate-500">
            <div className="font-medium text-slate-900 dark:text-white">{selectedDataset.label}</div>
            <div>{selectedDataset.fields.length} alan</div>
          </div>
        )}
      </div>
      {step === 'select-dataset' && renderDatasetSelection()}
      {step === 'configure' && renderFilterStep()}
      {step === 'progress' && renderProgress()}
      {step === 'completed' && renderCompleted()}
    </div>
  );
};

export default ExportWizard;
