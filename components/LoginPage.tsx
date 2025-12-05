import * as React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import BrandLogo from './BrandLogo';
import { LegalPageKey } from '../data/legalContent';
import { SignupFinalizePayload } from '../services/signupService';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SignupForm from './SignupForm';
import ForgotPasswordDialog from './ForgotPasswordDialog';

const REMEMBER_EMAIL_STORAGE_KEY = 'dripfy_remember_email';
const REMEMBER_PASSWORD_STORAGE_KEY = 'dripfy_remember_password';

interface LoginPageProps {
    onSignupRequest: (payload: { email: string; code: string }) => Promise<SignupFinalizePayload>;
    onOpenLegal: (page: LegalPageKey) => void;
}

/**
 * Giriş ve kayıt akışını yönetir. Kayıt formu önce kod ister (`requestSignupCode`),
 * kullanıcı kodu girdikten sonra `onSignupRequest` ile üst komponenti bilgilendirir.
 */
const LoginPage: React.FC<LoginPageProps> = ({ onSignupRequest, onOpenLegal }) => {
    const { t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const { login } = useAuth();
    const [view, setView] = React.useState<'login' | 'signup'>('login');
    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // Login state
    const [loginEmail, setLoginEmail] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');
    const [isLoggingIn, setIsLoggingIn] = React.useState(false);
    const [loginErrorKey, setLoginErrorKey] = React.useState<string | null>(null);

    const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string; detail?: string } | null>(null);
    const loginErrorHintKey = 'login.errors.hint';
    const loginErrorHintRaw = t(loginErrorHintKey);
    const loginErrorHint = loginErrorHintRaw !== loginErrorHintKey ? loginErrorHintRaw : '';
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [rememberMe, setRememberMe] = React.useState(false);
    const [autoLoginAttempted, setAutoLoginAttempted] = React.useState(false);
    const [isAutoLoggingIn, setIsAutoLoggingIn] = React.useState(false);

    // Populate saved email/password when available
    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const storedEmail = window.localStorage.getItem(REMEMBER_EMAIL_STORAGE_KEY);
        const storedPassword = window.localStorage.getItem(REMEMBER_PASSWORD_STORAGE_KEY);
        if (storedEmail) {
            setLoginEmail(storedEmail);
            setRememberMe(true);
        }
        if (storedEmail && storedPassword) {
            setAutoLoginAttempted(true);
            const decodedPassword = atob(storedPassword);
            (async () => {
                setIsAutoLoggingIn(true);
                try {
                    await login(storedEmail, decodedPassword);
                } catch (error) {
                    setLoginErrorKey('login.errors.invalidCredentials');
                } finally {
                    setIsAutoLoggingIn(false);
                }
            })();
        }
    }, [login]);

    const dismissNotification = React.useCallback(() => setNotification(null), []);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginErrorKey(null);
        setIsLoggingIn(true);
        try {
            const trimmedEmail = loginEmail.trim();
            await login(trimmedEmail, loginPassword);
            if (typeof window !== 'undefined') {
                if (rememberMe) {
                    window.localStorage.setItem(REMEMBER_EMAIL_STORAGE_KEY, trimmedEmail);
                    window.localStorage.setItem(REMEMBER_PASSWORD_STORAGE_KEY, btoa(loginPassword));
                } else {
                    window.localStorage.removeItem(REMEMBER_EMAIL_STORAGE_KEY);
                    window.localStorage.removeItem(REMEMBER_PASSWORD_STORAGE_KEY);
                }
            }
        } catch (error) {
            console.error('Login failed:', error);
            const enrichedError = error as Error & { code?: string };
            if (enrichedError.code === 'INVALID_CREDENTIALS') {
                setLoginErrorKey('login.errors.invalidCredentials');
            } else {
                setLoginErrorKey('login.errors.generic');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const inputClass = "appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[var(--drip-text)] dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:z-10 sm:text-sm";

    const handleSignupSuccess = React.useCallback(() => {
        setNotification({ type: 'success', message: t('signup.notification.successTitle'), detail: t('signup.notification.successBody') });
        setView('login');
    }, [t]);

    const handlePasswordResetSuccess = React.useCallback((message: { title: string; detail?: string }) => {
        setNotification({ type: 'success', message: message.title, detail: message.detail });
    }, []);

    const renderContent = () => {
        if (view === 'login') {
            return (
                <>
                    {notification && (
                        <div className={`mb-4 rounded-2xl px-4 py-3 border text-sm shadow-lg ${notification.type === 'success' ? 'bg-green-500/10 border-green-400 text-green-200' : 'bg-red-500/10 border-red-400 text-red-200'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-semibold tracking-wide uppercase text-xs">{notification.message}</p>
                                    {notification.detail && <p className="mt-1 text-white/80">{notification.detail}</p>}
                                </div>
                                <button type="button" onClick={dismissNotification} className="text-xs font-medium uppercase tracking-wider hover:opacity-70">{t('actions.close')}</button>
                            </div>
                        </div>
                    )}
                    <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                        <div className="rounded-md shadow-sm">
                            <div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    required
                                    className={`${inputClass} rounded-t-md`}
                                    placeholder={t('login.emailPlaceholder')}
                                    value={loginEmail}
                                    onChange={(e) => setLoginEmail(e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className={`${inputClass} rounded-b-md pr-20`}
                                    placeholder={t('login.passwordPlaceholder')}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute inset-y-0 right-2 flex items-center px-2 text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] focus:outline-none z-20"
                                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        {loginErrorKey && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-sm dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-100">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500 dark:text-red-200" />
                                    <div>
                                        <p className="font-semibold tracking-wide">{t(loginErrorKey)}</p>
                                        {loginErrorHint && (
                                            <p className="mt-1 text-xs text-red-500/80 dark:text-red-100/80">
                                                {loginErrorHint}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 text-[var(--drip-muted)] dark:text-neutral-400">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(event) => setRememberMe(event.target.checked)}
                                    className="h-4 w-4 rounded border border-neutral-300 dark:border-neutral-600 text-[var(--drip-primary)] focus:ring-[var(--drip-primary)]"
                                />
                                {t('login.rememberMe')}
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsForgotPasswordOpen(true)}
                                className="font-medium text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] dark:text-[var(--drip-primary)] dark:hover:text-[rgba(75,165,134,0.8)]"
                            >
                                {t('login.forgotPassword')}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--drip-primary)] hover:bg-[var(--drip-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--drip-primary)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isLoggingIn ? `${t('login.signInButton')}...` : t('login.signInButton')}
                        </button>
                    </form>
                    <div className="text-sm text-center">
                        <button onClick={() => setView('signup')} className="font-medium text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] dark:text-[var(--drip-primary)] dark:hover:text-[rgba(75,165,134,0.8)]">
                            {t('signup.prompt')}
                        </button>
                    </div>
                </>
            );
        }

        if (view === 'signup') {
            return (
                <div className="mt-8">
                    <SignupForm
                        onSignupRequest={onSignupRequest}
                        onSuccess={handleSignupSuccess}
                        onCancel={() => setView('login')}
                    />
                </div>
            );
        }

        return null;
    };
    const renderNotification = () => {
        if (!notification) return null;
        const baseClasses = notification.type === 'success'
            ? 'bg-neutral-900/90 border border-green-400/30 text-green-100'
            : 'bg-red-500/15 border border-red-500/40 text-red-50';

        return (
            <div className={`fixed top-6 left-1/2 z-50 w-[min(90vw,420px)] -translate-x-1/2 sm:right-6 sm:left-auto sm:translate-x-0 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur ${baseClasses}`}>
                <div className="flex items-start gap-3">
                    <div className="flex-1">
                        <p className="text-sm font-semibold tracking-wide uppercase">{notification.message}</p>
                        {notification.detail && (
                            <p className="mt-1 text-sm text-white/80 dark:text-white/70">
                                {notification.detail}
                            </p>
                        )}
                    </div>
                    <button onClick={dismissNotification} className="text-xs font-medium uppercase tracking-wider hover:opacity-70">
                        {t('actions.close', { defaultValue: 'Close' })}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="min-h-screen flex items-center justify-center animate-fade-in p-4 w-full relative overflow-hidden bg-[var(--drip-surface)] dark:bg-[var(--drip-dark-surface)] transition-colors duration-500">
                {/* Background Elements */}
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--drip-primary)]/20 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--drip-accent)]/20 blur-[120px] pointer-events-none" />

                {renderNotification()}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
                    <LanguageSwitcher />
                    <button
                        onClick={handleThemeToggle}
                        className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 border ${theme === 'light'
                            ? 'bg-[var(--drip-card)] border-[var(--drip-border)] text-[var(--drip-text)] hover:bg-[var(--drip-surface)] hover:shadow-lg'
                            : 'bg-black/20 border-white/10 text-[var(--drip-dark-text)] hover:bg-white/10 hover:shadow-lg'
                            }`}
                        aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun size={18} />
                        ) : (
                            <Moon size={18} />
                        )}
                    </button>
                </div>

                <div className="w-full max-w-md p-8 space-y-8 ios-glass rounded-3xl shadow-2xl relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <BrandLogo className="h-14 w-auto mb-2" />
                        <p className="text-sm font-medium tracking-wide opacity-60">
                            {t('login.subtitle')}
                        </p>
                    </div>

                    {renderContent()}

                    <div className="pt-6 border-t border-gray-200/20">
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs opacity-50 hover:opacity-80 transition-opacity">
                            <button
                                type="button"
                                onClick={() => onOpenLegal('impressum')}
                                className="hover:underline transition-all"
                            >
                                {t('footer.imprint')}
                            </button>
                            <span aria-hidden="true">•</span>
                            <button
                                type="button"
                                onClick={() => onOpenLegal('privacy')}
                                className="hover:underline transition-all"
                            >
                                {t('footer.privacy')}
                            </button>
                            <span aria-hidden="true">•</span>
                            <button
                                type="button"
                                onClick={() => onOpenLegal('terms')}
                                className="hover:underline transition-all"
                            >
                                {t('footer.terms')}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
            <ForgotPasswordDialog
                isOpen={isForgotPasswordOpen}
                defaultEmail={loginEmail}
                onClose={() => setIsForgotPasswordOpen(false)}
                onCompleted={handlePasswordResetSuccess}
            />
        </>
    );
};

export default LoginPage;
