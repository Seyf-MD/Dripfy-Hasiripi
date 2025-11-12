import * as React from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebsiteCopy } from '../context/WebsiteCopyContext';
import { Language, useLanguage } from '../i18n/LanguageContext';
import { LegalPageKey, LEGAL_LANGUAGES } from '../data/legalContent';

const LANGUAGE_LABELS: Record<string, string> = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  ru: 'Русский',
  ar: 'العربية',
};

interface LegalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LegalEditorModal: React.FC<LegalEditorModalProps> = ({ isOpen, onClose }) => {
  const { isAdmin, token } = useAuth();
  const { copy, refresh } = useWebsiteCopy();
  const { t } = useLanguage();
  const [legalDraft, setLegalDraft] = React.useState(copy.legalContent);
  const [footerDraft, setFooterDraft] = React.useState(copy.footer);
  const [addressLines, setAddressLines] = React.useState<string>(copy.footer.addressLines.join('\n'));
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setLegalDraft(JSON.parse(JSON.stringify(copy.legalContent)));
      setFooterDraft(copy.footer);
      setAddressLines(copy.footer.addressLines.join('\n'));
      setStatusMessage(null);
    }
  }, [isOpen, copy]);

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !isAdmin) {
    return null;
  }

  const handleLegalChange = (page: LegalPageKey, language: Language, value: string) => {
    setLegalDraft(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [language]: value,
      },
    }));
  };

  const handleFooterChange = (field: keyof typeof footerDraft, value: string) => {
    setFooterDraft(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    const payload = {
      legalContent: legalDraft,
      footer: {
        ...footerDraft,
        addressLines: addressLines
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean),
      },
    };

    try {
      const response = await fetch('/api/legal-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to save copy');
      }
      await refresh();
      onClose();
    } catch (error) {
      console.error('[legal-editor] Save failed:', error);
      setStatusMessage(t('legalEditor.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-10 px-4">
      <div className="w-full max-w-5xl bg-white dark:bg-neutral-950 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--drip-muted)]/80 dark:text-neutral-500">
              {t('legalEditor.title')}
            </p>
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t('legalEditor.subtitle')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            aria-label="Close legal editor"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[var(--drip-text)]">{t('legalEditor.footerSection')}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-[var(--drip-muted)]">{t('legalEditor.footerCompany')}</span>
                <input
                  type="text"
                  value={footerDraft.companyName}
                  onChange={event => handleFooterChange('companyName', event.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-slate-50 dark:bg-neutral-900 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-[var(--drip-muted)]">{t('legalEditor.footerEmail')}</span>
                <input
                  type="email"
                  value={footerDraft.email}
                  onChange={event => handleFooterChange('email', event.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-slate-50 dark:bg-neutral-900 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                />
              </label>
              <label className="flex flex-col text-sm">
                <span className="mb-1 text-[var(--drip-muted)]">{t('legalEditor.footerPhone')}</span>
                <input
                  type="tel"
                  value={footerDraft.phone}
                  onChange={event => handleFooterChange('phone', event.target.value)}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-slate-50 dark:bg-neutral-900 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                />
              </label>
              <label className="flex flex-col text-sm sm:col-span-2">
                <span className="mb-1 text-[var(--drip-muted)]">{t('legalEditor.footerAddress')}</span>
                <textarea
                  value={addressLines}
                  onChange={event => setAddressLines(event.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-slate-50 dark:bg-neutral-900 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)]"
                  placeholder={t('legalEditor.footerAddressPlaceholder')}
                />
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--drip-text)]">{t('legalEditor.legalSection')}</h3>
            {(['impressum', 'privacy', 'terms'] as LegalPageKey[]).map(page => (
              <div key={page} className="space-y-3 border border-neutral-100 dark:border-neutral-800 rounded-2xl p-4 bg-slate-50 dark:bg-neutral-900/60">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-[var(--drip-muted)]/80 dark:text-neutral-500">
                    {t(`legal.title.${page}`)}
                  </p>
                </div>
                <div className="grid gap-4">
                  {LEGAL_LANGUAGES.map(lang => (
                    <label key={`${page}-${lang}`} className="flex flex-col text-sm">
                      <span className="mb-1 text-[var(--drip-muted)]">{LANGUAGE_LABELS[lang] ?? lang}</span>
                      <textarea
                        rows={5}
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                        value={legalDraft[page][lang] ?? ''}
                        onChange={event => handleLegalChange(page, lang, event.target.value)}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-md bg-white dark:bg-black dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-[var(--drip-primary)] resize-y"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {statusMessage && (
            <p className="text-sm text-red-500">
              {statusMessage}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
          >
            {t('legalEditor.cancelButton')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-full bg-[var(--drip-primary)] text-white text-sm font-medium hover:bg-[color:rgba(75,165,134,0.85)] disabled:opacity-60 disabled:pointer-events-none transition-colors"
          >
            {isSaving ? t('legalEditor.saving') : t('legalEditor.saveButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LegalEditorModal;
