import * as React from 'react';
import { X, Key, CheckCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PasswordChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
}

const MOCK_VERIFICATION_CODE = "123456";

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose, email: initialEmail }) => {
    const { t } = useLanguage();
    const [step, setStep] = React.useState<'email' | 'verify' | 'success'>('email');
    const [email, setEmail] = React.useState(initialEmail);
    const [code, setCode] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setStep('email');
            setEmail(initialEmail);
            setCode('');
            setNewPassword('');
            setConfirmPassword('');
            setError('');
        }
    }, [isOpen]);

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);


    const handleSendCode = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate sending code
        setError('');
        setStep('verify');
    };

    const handleUpdatePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (code !== MOCK_VERIFICATION_CODE) {
            setError(t('passwordChange.error.code'));
            return;
        }
        if (newPassword !== confirmPassword) {
            setError(t('passwordChange.error.match'));
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.'); // Simple validation
            return;
        }
        setError('');
        // In a real app, call API to update password
        setStep('success');
        setTimeout(() => {
            onClose();
        }, 2000);
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none focus:border-[var(--drip-primary)] text-[var(--drip-text)] dark:text-white placeholder:text-[var(--drip-muted)]/40 transition-all backdrop-blur-sm shadow-inner hover:bg-white/20 text-center";
    const modalTitleId = 'password-change-modal-title';

    const renderContent = () => {
        if (step === 'success') {
            return (
                <div className="text-center p-8 flex flex-col items-center justify-center animate-fade-in-up">
                    <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6 ring-4 ring-green-500/10">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--drip-text)] dark:text-white mb-2">{t('passwordChange.success')}</h3>
                </div>
            )
        }
        if (step === 'verify') {
            return (
                <form onSubmit={handleUpdatePassword} className="space-y-5 animate-fade-in-up">
                    <p className="text-sm text-center text-[var(--drip-muted)] dark:text-neutral-400 font-medium">{t('passwordChange.subtitleCode').replace('{email}', email)}</p>
                    <input type="text" placeholder={t('verify.codePlaceholder')} value={code} onChange={e => setCode(e.target.value)} required className={`${inputClass} tracking-widest text-lg font-bold`} maxLength={6} />
                    <input type="password" placeholder={t('passwordChange.newPassword')} value={newPassword} onChange={e => setNewPassword(e.target.value)} required className={inputClass} />
                    <input type="password" placeholder={t('passwordChange.confirmPassword')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={inputClass} />
                    {error && <p className="text-red-500 text-sm text-center font-bold bg-red-500/10 py-2 rounded-xl border border-red-500/20">{error}</p>}
                    <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all active:scale-95">
                        <Key size={18} /> {t('passwordChange.updateButton')}
                    </button>
                </form>
            )
        }
        return ( // step === 'email'
            <form onSubmit={handleSendCode} className="space-y-6 animate-fade-in-up">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 rounded-full bg-[var(--drip-primary)]/10 flex items-center justify-center mx-auto mb-4">
                        <Key size={32} className="text-[var(--drip-primary)]" />
                    </div>
                    <p className="text-sm text-center text-[var(--drip-muted)] dark:text-neutral-400 font-medium px-4">{t('passwordChange.subtitleEmail')}</p>
                </div>
                <input type="email" placeholder={t('login.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                <button type="submit" className="w-full flex items-center justify-center px-4 py-3.5 bg-white/10 text-[var(--drip-text)] dark:text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-all border border-white/10 hover:border-white/20">
                    {t('passwordChange.sendCodeButton')}
                </button>
            </form>
        )
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div className="ios-glass p-0 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden border border-white/20 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <header className="p-5 flex justify-between items-center border-b border-white/10 bg-white/5">
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('passwordChange.title')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </header>
                <main className="p-8">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default PasswordChangeModal;
