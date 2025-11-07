import * as React from 'react';
import type { PortalDocumentRecord } from '../../types';
import { FilePlus2, Link as LinkIcon, Upload } from 'lucide-react';

interface PortalDocumentManagerProps {
  documents: PortalDocumentRecord[];
  onCreateDocument: (payload: { title: string; description?: string; category?: string }) => Promise<void>;
  onUploadVersion: (documentId: string, payload: { fileName: string; notes?: string }) => Promise<void>;
  onGenerateLink: (documentId: string, versionId: string) => Promise<{ url: string; expiresAt: string }>;
  onUpdateApproval: (documentId: string, status: 'pending' | 'approved' | 'rejected', notes?: string) => Promise<void>;
  isSubmitting?: boolean;
  canApprove?: boolean;
}

export const PortalDocumentManager: React.FC<PortalDocumentManagerProps> = ({
  documents,
  onCreateDocument,
  onUploadVersion,
  onGenerateLink,
  onUpdateApproval,
  isSubmitting,
  canApprove,
}) => {
  const [createForm, setCreateForm] = React.useState({ title: '', description: '', category: 'general' });
  const [uploadForms, setUploadForms] = React.useState<Record<string, { fileName: string; notes: string }>>({});
  const [approvalNotes, setApprovalNotes] = React.useState<Record<string, string>>({});
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleCreateDocument = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!createForm.title.trim()) {
      setToast({ message: 'Belge başlığı gerekli.', type: 'error' });
      return;
    }
    await onCreateDocument({
      title: createForm.title.trim(),
      description: createForm.description.trim() || undefined,
      category: createForm.category,
    });
    setCreateForm({ title: '', description: '', category: 'general' });
    setToast({ message: 'Belge kaydedildi.', type: 'success' });
  };

  const handleUploadVersion = async (documentId: string, event: React.FormEvent) => {
    event.preventDefault();
    const form = uploadForms[documentId] || { fileName: '', notes: '' };
    if (!form.fileName.trim()) {
      setToast({ message: 'Dosya adı gerekli.', type: 'error' });
      return;
    }
    await onUploadVersion(documentId, { fileName: form.fileName.trim(), notes: form.notes.trim() || undefined });
    setUploadForms((prev) => ({ ...prev, [documentId]: { fileName: '', notes: '' } }));
    setToast({ message: 'Yeni sürüm eklendi.', type: 'success' });
  };

  const handleGenerateLink = async (documentId: string, versionId: string) => {
    try {
      const result = await onGenerateLink(documentId, versionId);
      setToast({ message: `Güvenli bağlantı oluşturuldu: ${result.url}`, type: 'success' });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Bağlantı oluşturulamadı.', type: 'error' });
    }
  };

  const handleApproval = async (documentId: string, status: 'pending' | 'approved' | 'rejected') => {
    const notes = approvalNotes[documentId] || '';
    await onUpdateApproval(documentId, status, notes.trim() || undefined);
    setToast({ message: 'Onay durumu güncellendi.', type: 'success' });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">Belge Yönetimi</h2>
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
            Belgeleri sürümleriyle yönetin, onay ve paylaşım akışlarını takip edin.
          </p>
        </div>
        {toast && (
          <div
            className={`px-3 py-2 rounded-lg text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'bg-rose-500/15 text-rose-600 dark:bg-rose-500/10 dark:text-rose-200'
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>

      <form onSubmit={handleCreateDocument} className="border border-slate-200 dark:border-neutral-800 rounded-xl p-4 bg-slate-50/60 dark:bg-neutral-800/40 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--drip-text)] dark:text-white">
          <FilePlus2 size={18} />
          Yeni Belge Kaydı
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={createForm.title}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Belge başlığı"
            className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          />
          <input
            value={createForm.description}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Açıklama (opsiyonel)"
            className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          />
          <select
            value={createForm.category}
            onChange={(event) => setCreateForm((prev) => ({ ...prev, category: event.target.value }))}
            className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
          >
            <option value="general">Genel</option>
            <option value="compliance">Uyumluluk</option>
            <option value="asset">Varlık</option>
            <option value="finance">Finans</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-[var(--drip-primary)] text-white text-sm font-medium hover:bg-[var(--drip-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Kaydediliyor...' : 'Belge Oluştur'}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {documents.map((document) => {
          const form = uploadForms[document.id] || { fileName: '', notes: '' };
          const approvalNote = approvalNotes[document.id] || '';
          return (
            <div key={document.id} className="border border-slate-200 dark:border-neutral-800 rounded-xl p-4 bg-slate-50/60 dark:bg-neutral-800/40 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h3 className="text-md font-semibold text-[var(--drip-text)] dark:text-white">{document.title}</h3>
                  {document.description && (
                    <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-300 mt-1">{document.description}</p>
                  )}
                  <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 mt-2">
                    Kategori: {document.category} • Güncelleme: {new Date(document.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-sm text-[var(--drip-muted)] dark:text-neutral-300 space-y-1">
                  <div>
                    Onay Durumu:{' '}
                    <span className="font-semibold text-[var(--drip-text)] dark:text-white">{document.approval.status}</span>
                  </div>
                  {document.approval.decidedAt && (
                    <div>
                      {document.approval.status === 'approved' ? 'Onaylandı' : 'Güncellendi'}:{' '}
                      {new Date(document.approval.decidedAt).toLocaleString()}
                    </div>
                  )}
                  {document.approval.decidedBy?.name && <div>Yetkili: {document.approval.decidedBy.name}</div>}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-[var(--drip-text)] dark:text-white">Sürüm Geçmişi</div>
                <div className="space-y-2">
                  {document.versions.map((version) => (
                    <div key={version.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-slate-200 dark:border-neutral-800 rounded-lg p-3 bg-white dark:bg-neutral-900">
                      <div>
                        <div className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">
                          v{version.version} • {version.fileName}
                        </div>
                        <div className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
                          Yüklendi: {new Date(version.uploadedAt).toLocaleString()}
                        </div>
                        {version.notes && (
                          <div className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 mt-1">Not: {version.notes}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleGenerateLink(document.id, version.id)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-neutral-700 text-[var(--drip-text)] dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
                        >
                          <LinkIcon size={16} />
                          Güvenli Bağlantı
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={(event) => handleUploadVersion(document.id, event)} className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--drip-text)] dark:text-white mb-1">Dosya adı</label>
                    <input
                      value={form.fileName}
                      onChange={(event) =>
                        setUploadForms((prev) => ({
                          ...prev,
                          [document.id]: { ...prev[document.id], fileName: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                      placeholder="dosya-adı.pdf"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-[var(--drip-text)] dark:text-white mb-1">Not (opsiyonel)</label>
                    <input
                      value={form.notes}
                      onChange={(event) =>
                        setUploadForms((prev) => ({
                          ...prev,
                          [document.id]: { ...prev[document.id], notes: event.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                      placeholder="Revizyon notu"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--drip-primary)] text-white text-sm font-medium hover:bg-[var(--drip-primary-dark)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Upload size={16} />
                    Sürüm Ekle
                  </button>
                </form>

                {canApprove && (
                  <div className="border border-slate-200 dark:border-neutral-800 rounded-lg p-3 bg-white dark:bg-neutral-900 space-y-2">
                    <label className="block text-xs font-medium text-[var(--drip-text)] dark:text-white">Onay Notu</label>
                    <textarea
                      rows={2}
                      value={approvalNote}
                      onChange={(event) =>
                        setApprovalNotes((prev) => ({
                          ...prev,
                          [document.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm"
                      placeholder="Geri bildirim veya onay notu"
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleApproval(document.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproval(document.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproval(document.id, 'pending')}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 dark:border-neutral-700 text-[var(--drip-text)] dark:text-white hover:bg-slate-100 dark:hover:bg-neutral-800"
                      >
                        Beklemeye Al
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {documents.length === 0 && (
          <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">Henüz yüklenmiş belge bulunmuyor.</p>
        )}
      </div>
    </div>
  );
};

export default PortalDocumentManager;
