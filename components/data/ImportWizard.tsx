import * as React from 'react';

interface DatasetFieldDefinition {
  field: string;
  label: string;
  required?: boolean;
  description?: string;
}

interface DatasetSummary {
  id: string;
  label: string;
  description?: string;
  canImport: boolean;
  canExport: boolean;
  fields: DatasetFieldDefinition[];
}

interface UploadResponse {
  sessionId: string;
  dataset: { id: string; label: string };
  columns: string[];
  rowCount: number;
  sampleRows: Record<string, unknown>[];
  suggestedMapping: Record<string, string>;
  requiredFields: DatasetFieldDefinition[];
}

interface ValidationResponse {
  ok: boolean;
  summary: { total: number; valid: number; invalid: number };
  previewErrors?: { row: number; field: string; message: string }[];
  errorReportId?: string | null;
  jobId?: string;
}

interface JobSummary {
  id: string;
  status: string;
  progress?: number;
  processed?: number;
  total?: number;
  inserted?: number;
  updated?: number;
  error?: string;
  errorReportId?: string;
  exportFileId?: string;
  fallback?: boolean;
}

type WizardStep = 'select-dataset' | 'upload-file' | 'map-fields' | 'review' | 'progress' | 'completed';

const API_BASE = `${(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '')}/api/importer`.replace(/^\/+/, '/');

const formatNumber = (value: number | undefined) =>
  typeof value === 'number' ? value.toLocaleString('tr-TR') : '0';

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-slate-200 dark:bg-neutral-800 rounded-full h-2">
    <div
      className="bg-[var(--drip-primary)] h-2 rounded-full transition-all"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    />
  </div>
);

export const ImportWizard: React.FC = () => {
  const [datasets, setDatasets] = React.useState<DatasetSummary[]>([]);
  const [loadingDatasets, setLoadingDatasets] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<WizardStep>('select-dataset');
  const [uploadResult, setUploadResult] = React.useState<UploadResponse | null>(null);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [validation, setValidation] = React.useState<ValidationResponse | null>(null);
  const [job, setJob] = React.useState<JobSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [allowedMimeTypes, setAllowedMimeTypes] = React.useState<string[]>([]);
  const [maxFileSize, setMaxFileSize] = React.useState<number | null>(null);

  const fetchDatasets = React.useCallback(async () => {
    setLoadingDatasets(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/datasets`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error?.message || 'Veri setleri alınamadı');
      }
      setDatasets(data.datasets || []);
      setAllowedMimeTypes(data.allowedMimeTypes || []);
      setMaxFileSize(data.maxFileSize || null);
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
    setUploadResult(null);
    setMapping({});
    setValidation(null);
    setJob(null);
    setStep('select-dataset');
  }, []);

  const handleDatasetSelect = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
    setStep('upload-file');
    setError(null);
  };

  const handleFileUpload: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem('file') as HTMLInputElement | null;
    if (!input || !input.files || input.files.length === 0) {
      setError('Lütfen içe aktarılacak bir dosya seçin.');
      return;
    }
    if (!selectedDatasetId) {
      setError('Lütfen önce veri seti seçin.');
      return;
    }

    const formData = new FormData();
    formData.append('datasetId', selectedDatasetId);
    formData.append('file', input.files[0]);

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error?.message || 'Dosya yüklenemedi');
      }
      setUploadResult(data);
      setMapping(data.suggestedMapping || {});
      setStep('map-fields');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Dosya yüklenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMappingChange = (field: string, column: string) => {
    setMapping((prev) => ({ ...prev, [field]: column }));
  };

  const runValidation = async (commit = false) => {
    if (!uploadResult) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/sessions/${uploadResult.sessionId}/${commit ? 'commit' : 'validate'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping, commit }),
      });
      const data: ValidationResponse = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error((data as any)?.error?.message || 'Doğrulama başarısız');
      }
      if (!commit) {
        setValidation(data);
      }
      if (commit && data.jobId) {
        setJob({ id: data.jobId, status: 'queued', progress: 0 });
        setStep('progress');
      } else {
        setStep('review');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Doğrulama başarısız');
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
          throw new Error(data?.error?.message || 'Kuyruk durumu alınamadı');
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

  const selectedDataset = React.useMemo(
    () => datasets.find((dataset) => dataset.id === selectedDatasetId) || null,
    [datasets, selectedDatasetId],
  );

  const mappingReady = React.useMemo(() => {
    if (!selectedDataset) {
      return false;
    }
    return selectedDataset.fields.every((field) => !field.required || mapping[field.field]);
  }, [selectedDataset, mapping]);

  const renderDatasetSelection = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Veri seti seçin</h2>
      {loadingDatasets && <p className="text-sm text-slate-500">Veri setleri yükleniyor...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {datasets
          .filter((dataset) => dataset.canImport)
          .map((dataset) => (
            <button
              key={dataset.id}
              type="button"
              onClick={() => handleDatasetSelect(dataset.id)}
              className="border border-slate-200 dark:border-neutral-700 rounded-xl p-4 text-left hover:border-[var(--drip-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
            >
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">{dataset.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{dataset.description}</p>
              <p className="text-xs text-slate-400 mt-3">
                Zorunlu alanlar:{' '}
                {dataset.fields
                  .filter((field) => field.required)
                  .map((field) => field.label || field.field)
                  .join(', ') || 'Yok'}
              </p>
            </button>
          ))}
      </div>
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{selectedDataset?.label} için dosya yükleyin</h2>
        <p className="text-sm text-slate-500 mt-1">CSV veya Excel dosyalarını yükleyebilirsiniz.</p>
        {maxFileSize && (
          <p className="text-xs text-slate-400 mt-1">Maksimum dosya boyutu: {(maxFileSize / (1024 * 1024)).toFixed(1)} MB</p>
        )}
        {allowedMimeTypes.length > 0 && (
          <p className="text-xs text-slate-400">Desteklenen türler: {allowedMimeTypes.join(', ')}</p>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <form onSubmit={handleFileUpload} className="space-y-4">
        <input
          type="file"
          name="file"
          accept={allowedMimeTypes.join(',') || '.csv,.xlsx'}
          className="block w-full text-sm text-slate-600"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--drip-primary)] text-white disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Yükleniyor...' : 'Dosyayı Yükle'}
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-200"
            onClick={resetWizard}
          >
            Geri Dön
          </button>
        </div>
      </form>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Alan eşlemesi</h2>
        <p className="text-sm text-slate-500 mt-1">Sistem alanlarını dosya sütunları ile eşleştirin.</p>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="overflow-x-auto border border-slate-200 dark:border-neutral-700 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-neutral-800">
            <tr>
              <th className="px-4 py-2 text-left text-slate-600">Sistem Alanı</th>
              <th className="px-4 py-2 text-left text-slate-600">Dosya Sütunu</th>
              <th className="px-4 py-2 text-left text-slate-600">Zorunlu</th>
            </tr>
          </thead>
          <tbody>
            {selectedDataset?.fields.map((field) => (
              <tr key={field.field} className="border-t border-slate-200 dark:border-neutral-700">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-900 dark:text-white">{field.label || field.field}</div>
                  <div className="text-xs text-slate-500">{field.field}</div>
                </td>
                <td className="px-4 py-2">
                  <select
                    className="w-full border border-slate-200 dark:border-neutral-700 rounded-md px-2 py-1 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-100"
                    value={mapping[field.field] || ''}
                    onChange={(event) => handleMappingChange(field.field, event.target.value)}
                  >
                    <option value="">Bir sütun seçin</option>
                    {uploadResult?.columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2">
                  {field.required ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500">Zorunlu</span>
                  ) : (
                    <span className="text-xs text-slate-400">Opsiyonel</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--drip-primary)] text-white disabled:opacity-50"
          onClick={() => runValidation(false)}
          disabled={!mappingReady || isSubmitting}
        >
          {isSubmitting ? 'Kontrol ediliyor...' : 'Verileri Kontrol Et'}
        </button>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-200"
          onClick={() => setStep('upload-file')}
        >
          Geri
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Doğrulama özeti</h2>
        <p className="text-sm text-slate-500 mt-1">Sonuçları kontrol edin ve içe aktarmayı başlatın.</p>
      </div>
      {validation && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-4">
            <div className="text-xs uppercase text-slate-400">Toplam Satır</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(validation.summary.total)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-4">
            <div className="text-xs uppercase text-green-500">Başarılı</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(validation.summary.valid)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-4">
            <div className="text-xs uppercase text-red-500">Hatalı</div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {formatNumber(validation.summary.invalid)}
            </div>
          </div>
        </div>
      )}
      {validation?.errorReportId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-4 text-sm">
          Bazı satırlarda hatalar tespit edildi. Ayrıntılı hata raporunu{' '}
          <a
            href={`${API_BASE}/errors/${validation.errorReportId}`}
            className="underline font-medium"
            target="_blank"
            rel="noreferrer"
          >
            buradan indirebilirsiniz
          </a>
          .
        </div>
      )}
      {validation?.previewErrors && validation.previewErrors.length > 0 && (
        <div className="border border-slate-200 dark:border-neutral-700 rounded-lg overflow-hidden">
          <div className="bg-slate-50 dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-slate-600">
            Örnek Hata Satırları
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-neutral-800">
            {validation.previewErrors.slice(0, 5).map((item, index) => (
              <li key={`${item.row}-${item.field}-${index}`} className="px-4 py-3 text-sm text-slate-600 dark:text-neutral-200">
                <strong>Satır {item.row}:</strong> {item.field} - {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--drip-primary)] text-white disabled:opacity-50"
          onClick={() => runValidation(true)}
          disabled={isSubmitting || (validation?.summary.invalid ?? 0) > 0}
        >
          {isSubmitting ? 'Kuyruğa Ekleniyor...' : 'İçe Aktarmayı Başlat'}
        </button>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-md border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-200"
          onClick={() => setStep('map-fields')}
        >
          Geri
        </button>
      </div>
    </div>
  );

  const renderProgressStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">İçe aktarma kuyruğa alındı</h2>
        <p className="text-sm text-slate-500 mt-1">İşlem arka planda çalışıyor. Bu ekranı kapatmadan durumu takip edebilirsiniz.</p>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-6 space-y-4">
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-neutral-200">
          <span>Durum</span>
          <span className="font-medium text-slate-900 dark:text-white">{job?.status || 'bekliyor'}</span>
        </div>
        <ProgressBar progress={job?.progress ?? 0} />
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-neutral-200">
          <div>
            <div className="text-xs uppercase text-slate-400">İşlenen</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{formatNumber(job?.processed)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">Toplam</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{formatNumber(job?.total)}</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">İşlem tamamlandı</h2>
        <p className="text-sm text-slate-500 mt-1">
          {job?.status === 'failed'
            ? 'İçe aktarma işlemi başarısız oldu. Ayrıntılar için hata mesajını kontrol edin.'
            : 'Tüm uygun satırlar başarıyla işlendi.'}
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-neutral-700 p-6 space-y-4">
        <div className="text-sm text-slate-600 dark:text-neutral-200">
          Durum: <span className="font-medium text-slate-900 dark:text-white">{job?.status}</span>
        </div>
        {job?.error && <div className="text-sm text-red-500">Hata: {job.error}</div>}
        {job?.errorReportId && (
          <div className="text-sm">
            <a
              href={`${API_BASE}/errors/${job.errorReportId}`}
              className="text-[var(--drip-primary)] underline"
              target="_blank"
              rel="noreferrer"
            >
              Hata raporunu indir
            </a>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 dark:text-neutral-200">
          <div>
            <div className="text-xs uppercase text-slate-400">Yeni Kayıt</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{formatNumber(job?.inserted)}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-slate-400">Güncellenen</div>
            <div className="text-base font-semibold text-slate-900 dark:text-white">{formatNumber(job?.updated)}</div>
          </div>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 rounded-md bg-[var(--drip-primary)] text-white"
        onClick={resetWizard}
      >
        Yeni İçe Aktarma Başlat
      </button>
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">İçe Aktarma Sihirbazı</h1>
          <p className="text-sm text-slate-500">Adım adım içe aktarma sürecini takip edin.</p>
        </div>
        {uploadResult && (
          <div className="text-right text-sm text-slate-500">
            <div className="font-medium text-slate-900 dark:text-white">{uploadResult.dataset.label}</div>
            <div>{uploadResult.rowCount} satır</div>
          </div>
        )}
      </div>
      {step === 'select-dataset' && renderDatasetSelection()}
      {step === 'upload-file' && renderUploadStep()}
      {step === 'map-fields' && renderMappingStep()}
      {step === 'review' && renderReviewStep()}
      {step === 'progress' && renderProgressStep()}
      {step === 'completed' && renderCompletedStep()}
    </div>
  );
};

export default ImportWizard;
