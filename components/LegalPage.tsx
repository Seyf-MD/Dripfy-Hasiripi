import * as React from 'react';
import { X } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { legalContent, LEGAL_DEFAULT_LANGUAGE, LegalPageKey } from '../data/legalContent';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

interface LegalPageProps {
    page: LegalPageKey;
    onClose: () => void;
}

const LegalPage: React.FC<LegalPageProps> = ({ page, onClose }) => {
    const { theme, setTheme } = useTheme();
    const { language, t } = useLanguage();
    const direction = language === 'ar' ? 'rtl' : 'ltr';
    const content = legalContent[page][language] ?? legalContent[page][LEGAL_DEFAULT_LANGUAGE];

    const handleToggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    React.useEffect(() => {
        const originalStyle = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, []);

    return (
        <div dir={direction} className="fixed inset-0 z-50 bg-white dark:bg-neutral-950 text-neutral-700 dark:text-neutral-100 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-6">
                        <BrandLogo className="h-10 md:h-12" />
                        <div>
                            <p className="text-xs uppercase tracking-[0.35em] text-[var(--drip-muted)]/80 dark:text-neutral-500">Dripfy Legal</p>
                            <h1 className="text-2xl md:text-3xl font-semibold text-neutral-800 dark:text-neutral-100">
                                {t(`legal.title.${page}`)}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleToggleTheme}
                            className="hidden sm:inline-flex text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            {theme === 'dark' ? t('legal.lightMode') : t('legal.darkMode')}
                        </button>
                        <button
                            onClick={onClose}
                            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                            aria-label="Close legal page"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
                <article className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm shadow-xl overflow-hidden">
                    <div className={`px-6 sm:px-10 py-10 ${direction === 'rtl' ? 'text-right' : ''}`}>
                        <div
                            className="legal-content prose prose-neutral max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:mt-8 prose-headings:mb-4 prose-strong:text-neutral-900 dark:prose-strong:text-neutral-100"
                            dangerouslySetInnerHTML={{ __html: content }}
                        />
                    </div>
                </article>
                <div className="mt-10 flex justify-center">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-medium tracking-wide hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        {t('legal.backToDashboard')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LegalPage;
