import * as React from 'react';
import { X, Key, CheckCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PasswordChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_VERIFICATION_CODE = "123456";

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const [step, setStep] = React.useState<'email' | 'verify' | 'success'>('email');
    const [email, setEmail] = React.useState('demo@dripfy.com');
    const [code, setCode] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [error, setError] = React.useState('');

    React.useEffect(() => {
        if (isOpen) {
            // Reset state when modal opens
            setStep('email');
            setEmail('demo@dripfy.com');
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

    const inputClass = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white placeholder:text-neutral-500";
    const modalTitleId = 'password-change-modal-title';

    const renderContent = () => {
        if (step === 'success') {
            return (
                <div className="text-center p-8 flex flex-col items-center justify-center">
                    <CheckCircle size={48} className="text-green-400 mb-4" />
                    <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('passwordChange.success')}</h3>
                </div>
            )
        }
        if (step === 'verify') {
            return (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                    <p className="text-sm text-center text-[var(--drip-muted)] dark:text-neutral-400 -mt-2 mb-4">{t('passwordChange.subtitleCode').replace('{email}', email)}</p>
                    <input type="text" placeholder={t('verify.codePlaceholder')} value={code} onChange={e => setCode(e.target.value)} required className={`${inputClass} text-center`} />
                    <input type="password" placeholder={t('passwordChange.newPassword')} value={newPassword} onChange={e => setNewPassword(e.target.value)} required className={inputClass} />
                    <input type="password" placeholder={t('passwordChange.confirmPassword')} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className={inputClass} />
                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}
                    <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                        <Key size={16} /> {t('passwordChange.updateButton')}
                    </button>
                </form>
            )
        }
        return ( // step === 'email'
            <form onSubmit={handleSendCode} className="space-y-4">
                 <p className="text-sm text-center text-[var(--drip-muted)] dark:text-neutral-400 -mt-2 mb-4">{t('passwordChange.subtitleEmail')}</p>
                 <input type="email" placeholder={t('login.emailPlaceholder')} value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
                 <button type="submit" className="w-full flex items-center justify-center px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-[var(--drip-text)] dark:text-white text-sm font-semibold rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                    {t('passwordChange.sendCodeButton')}
                </button>
            </form>
        )
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-sm flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('passwordChange.title')}</h2>
                    <button onClick={onClose} className="text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>
                <main className="p-6">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default PasswordChangeModal;
