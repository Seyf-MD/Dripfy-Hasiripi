import * as React from 'react';
import { X, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { ReleaseNote } from '../data/releaseNotes';

interface ReleaseNotesModalProps {
    isOpen: boolean;
    onClose: (dontShowAgain: boolean) => void;
    note: ReleaseNote;
}

const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose, note }) => {
    const { language, t } = useLanguage();
    const { theme } = useTheme();
    const [dontShowAgain, setDontShowAgain] = React.useState(false);

    if (!isOpen) return null;

    const langKey = language;
    const title = note.title[langKey] || note.title['en'];
    const description = note.description[langKey] || note.description['en'];
    const features = note.features[langKey] || note.features['en'];

    const handleClose = () => {
        onClose(dontShowAgain);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-md transition-opacity animate-fade-in"
                onClick={handleClose}
            />

            {/* Modal Card */}
            <div className="relative w-full max-w-3xl bg-[#0a0a0a] dark:bg-black rounded-[32px] overflow-hidden shadow-2xl animate-scale-in border border-white/10 flex flex-col max-h-[90vh]">

                {/* Header Image / Gradient Area */}
                <div className="relative min-h-[180px] sm:min-h-[220px] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 flex items-end p-6 sm:p-8 overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3"></div>

                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-md transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className="relative z-10 w-full animate-slide-up flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">

                        {/* Logo & Subtitle (Left Side) */}
                        <div className="flex flex-col opacity-90 mb-1">
                            <BrandLogo variant="wordmark" className="h-8 sm:h-10 brightness-0 invert" />
                            <p className="text-white/70 text-xs font-medium tracking-wider mt-2 ml-1">
                                {t('login.subtitle')}
                            </p>
                        </div>

                        {/* Title & Version (Right Side) */}
                        <div className="text-left sm:text-right max-w-md">
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mb-3">
                                {title}
                            </h2>
                            <div className="flex items-center sm:justify-end gap-3 opacity-90">
                                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold text-white border border-white/20 shadow-lg">
                                    v{note.version}
                                </span>
                                <span className="text-white/90 text-sm font-medium tracking-wide">
                                    {new Date(note.date).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content - SCROLLABLE */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 ios-scrollbar bg-white dark:bg-[#0a0a0a]">
                    <p className="text-lg text-[var(--drip-text)] dark:text-neutral-300 leading-relaxed mb-8 font-medium">
                        {description}
                    </p>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--drip-muted)] opacity-70 mb-4 flex items-center gap-2">
                            <Sparkles size={16} />
                            {language === 'tr' ? 'Yenilikler' : 'Highlights'}
                        </h3>

                        <div className="grid gap-3 sm:gap-4 pb-4">
                            {features.map((feature, idx) => (
                                <div
                                    key={idx}
                                    className="group flex items-start gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-white/5 border border-neutral-100 dark:border-white/5 hover:border-[var(--drip-primary)]/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                                    style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                    <div className="mt-1 p-2 rounded-xl bg-[var(--drip-primary)]/10 text-[var(--drip-primary)] group-hover:scale-110 transition-transform shrink-0">
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[var(--drip-text)] dark:text-neutral-200 font-medium leading-relaxed">
                                            {feature}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-neutral-100 dark:border-white/10 bg-white dark:bg-[#0a0a0a] flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">

                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className={`
                            w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                            ${dontShowAgain
                                ? 'bg-[var(--drip-primary)] border-[var(--drip-primary)]'
                                : 'border-neutral-400 dark:border-neutral-500 group-hover:border-[var(--drip-primary)]'}
                        `}>
                            {dontShowAgain && <CheckCircle2 size={16} className="text-white" />}
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                            />
                        </div>
                        <span className="text-sm font-medium text-[var(--drip-text)] dark:text-neutral-300 select-none group-hover:text-[var(--drip-primary)] transition-colors">
                            {t('releaseNotes.dontShowAgain')}
                        </span>
                    </label>

                    <button
                        onClick={handleClose}
                        className="group flex items-center gap-2 px-8 py-3 bg-[var(--drip-primary)] hover:bg-[var(--drip-primary-dark)] text-white font-bold rounded-full shadow-lg shadow-[var(--drip-primary)]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full sm:w-auto justify-center"
                    >
                        <span>{t('releaseNotes.awesome')}</span>
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReleaseNotesModal;
