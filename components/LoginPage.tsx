import * as React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import BrandLogo from './BrandLogo';
import { LegalPageKey } from '../data/legalContent';
import { requestSignupCode, SignupFinalizePayload } from '../services/signupService';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
    onSignupRequest: (payload: { email: string; code: string }) => Promise<SignupFinalizePayload>;
    onOpenLegal: (page: LegalPageKey) => void;
}

interface SignupFormData {
    firstName: string;
    lastName: string;
    email: string;
    countryCode: string;
    country: string;
    phone: string;
    position: string;
    company: string;
}

interface SignupFormErrors {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
    position?: string;
}

const companyPositions = [
    'CEO', 'CTO', 'CFO', 'COO', 'Head of Department', 'Team Lead', 'Project Manager', 'Senior Specialist', 'Junior Specialist', 'Intern'
];

const phoneCountries = [
    { code: '+90', label: 'Türkiye (+90)', country: 'Türkiye' },
    { code: '+49', label: 'Deutschland (+49)', country: 'Germany' },
    { code: '+44', label: 'United Kingdom (+44)', country: 'United Kingdom' },
    { code: '+971', label: 'United Arab Emirates (+971)', country: 'United Arab Emirates' },
    { code: '+1', label: 'United States (+1)', country: 'United States' }
];

/**
 * Giriş ve kayıt akışını yönetir. Kayıt formu önce kod ister (`requestSignupCode`),
 * kullanıcı kodu girdikten sonra `onSignupRequest` ile üst komponenti bilgilendirir.
 */
const LoginPage: React.FC<LoginPageProps> = ({ onSignupRequest, onOpenLegal }) => {
    const { t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const { login } = useAuth();
    const [view, setView] = React.useState<'login' | 'signup' | 'verify'>('login');
    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };
    
    // Login state
    const [loginEmail, setLoginEmail] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');
    const [isLoggingIn, setIsLoggingIn] = React.useState(false);
    const [loginError, setLoginError] = React.useState<string | null>(null);

    // Signup state
    const [signupData, setSignupData] = React.useState<SignupFormData>({
        firstName: '',
        lastName: '',
        email: '',
        countryCode: phoneCountries[0].code,
        country: phoneCountries[0].country,
        phone: '',
        position: companyPositions[0],
        company: '',
    });
    const [formErrors, setFormErrors] = React.useState<SignupFormErrors>({});

    // Verification state
    const [verificationCode, setVerificationCode] = React.useState('');
    const [verificationError, setVerificationError] = React.useState('');
    const [isVerifying, setIsVerifying] = React.useState(false);
    const [isSendingCode, setIsSendingCode] = React.useState(false);
    const [notification, setNotification] = React.useState<{ type: 'success' | 'error'; message: string; detail?: string } | null>(null);

    const sanitizePhone = React.useCallback((value: string) => value.replace(/[^0-9]/g, ''), []);

    const dismissNotification = React.useCallback(() => setNotification(null), []);

    const getCountryOption = React.useCallback(
        (code: string) => phoneCountries.find(option => option.code === code) || phoneCountries[0],
        []
    );

    const validateSignupForm = React.useCallback((data: SignupFormData): SignupFormErrors => {
        const errors: SignupFormErrors = {};

        if (!data.firstName.trim() || data.firstName.trim().length < 2) {
            errors.firstName = t('signup.errors.firstName');
        }

        if (!data.lastName.trim() || data.lastName.trim().length < 2) {
            errors.lastName = t('signup.errors.lastName');
        }

        if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
            errors.email = t('signup.errors.email');
        }

        const sanitizedPhone = sanitizePhone(data.phone);
        if (!sanitizedPhone || sanitizedPhone.length < 6) {
            errors.phone = t('signup.errors.phone');
        }

        if (!data.countryCode) {
            errors.countryCode = t('signup.errors.countryCode');
        }

        if (!data.position) {
            errors.position = t('signup.errors.position');
        }

        return errors;
    }, [sanitizePhone, t]);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setIsLoggingIn(true);
        try {
            await login(loginEmail.trim(), loginPassword);
        } catch (error) {
            console.error('Login failed:', error);
            const enrichedError = error as Error & { code?: string };
            if (enrichedError.code === 'INVALID_CREDENTIALS') {
                setLoginError(t('login.errors.invalidCredentials'));
            } else {
                setLoginError(t('login.errors.generic'));
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanedData: SignupFormData = { ...signupData, phone: sanitizePhone(signupData.phone) };
        const errors = validateSignupForm(cleanedData);
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        const countryOption = getCountryOption(cleanedData.countryCode);
        const payload = {
            ...cleanedData,
            country: countryOption.country,
        };

        setIsSendingCode(true);
        try {
            await requestSignupCode(payload);
            setSignupData(payload);
            setFormErrors({});
            setVerificationError('');
            setNotification({ type: 'success', message: t('signup.notification.codeSentTitle'), detail: t('signup.notification.codeSentBody') });
            setView('verify');
        } catch (error) {
            console.error('Signup code request failed:', error);
            const message = error instanceof Error ? error.message : null;
            setNotification({ type: 'error', message: t('signup.notification.errorTitle'), detail: message || t('signup.notification.errorBody') });
        } finally {
            setIsSendingCode(false);
        }
    };

    const handleVerifyAndSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!verificationCode.trim()) {
            setVerificationError(t('verify.invalidCode'));
            return;
        }

        setVerificationError('');
        setIsVerifying(true);
        try {
            await onSignupRequest({
                email: signupData.email.trim(),
                code: verificationCode.trim(),
            });
            // Reset form and switch to login view after successful request
            setView('login');
            setSignupData({
                firstName: '',
                lastName: '',
                email: '',
                countryCode: phoneCountries[0].code,
                country: phoneCountries[0].country,
                phone: '',
                position: companyPositions[0],
                company: '',
            });
            setVerificationCode('');
            setNotification({ type: 'success', message: t('signup.notification.successTitle'), detail: t('signup.notification.successBody') });
        } catch (error) {
            console.error('Signup request failed:', error);
            const message = error instanceof Error ? error.message : null;
            setNotification({ type: 'error', message: t('signup.notification.errorTitle'), detail: message || t('signup.notification.errorBody') });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSignupData(prev => {
            if (name === 'phone') {
                return { ...prev, phone: sanitizePhone(value) } as SignupFormData;
            }
            if (name === 'countryCode') {
                const option = getCountryOption(value);
                return { ...prev, countryCode: value, country: option.country } as SignupFormData;
            }
            return { ...prev, [name]: value } as SignupFormData;
        });

        if (formErrors[name as keyof SignupFormErrors]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };
    
    const inputClass = "appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-[var(--drip-text)] dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:z-10 sm:text-sm";

    const renderContent = () => {
        if (view === 'verify') {
            return (
                <div className="space-y-4">
                     <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('verify.title')}</h3>
                        <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 mt-1">{t('verify.subtitle').replace('{email}', signupData.email)}</p>
                    </div>
                    <form className="space-y-4" onSubmit={handleVerifyAndSignup}>
                        <input 
                            type="text" 
                            placeholder={t('verify.codePlaceholder')}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            required
                            className={`${inputClass} rounded-md text-center tracking-[0.5em]`}
                        />
                        {verificationError && <p className="text-red-500 text-xs text-center">{verificationError}</p>}
                        <button type="submit" disabled={isVerifying} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--drip-primary)] hover:bg-[var(--drip-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--drip-primary)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                            {isVerifying ? t('verify.button') + '...' : t('verify.button')}
                        </button>
                        <button type="button" onClick={() => setView('signup')} className="w-full text-center text-sm text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white">
                            {t('verify.backButton')}
                        </button>
                    </form>
                </div>
            );
        }

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
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <input id="email-address" name="email" type="email" required className={`${inputClass} rounded-t-md`} placeholder={t('login.emailPlaceholder')} value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                            </div>
                            <div>
                                <input id="password" name="password" type="password" required className={`${inputClass} rounded-b-md`} placeholder={t('login.passwordPlaceholder')} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                            </div>
                        </div>
                        {loginError && (
                            <p className="text-sm text-red-500">{loginError}</p>
                        )}
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
                <>
                    <form className="mt-8 space-y-4" onSubmit={handleSignupSubmit}>
                        <div className="space-y-3">
                            <div>
                                <input type="text" name="firstName" placeholder={t('signup.firstNamePlaceholder')} required value={signupData.firstName} onChange={handleSignupChange} className={`${inputClass} rounded-md`} />
                                {formErrors.firstName && <p className="mt-1 text-xs text-red-500">{formErrors.firstName}</p>}
                            </div>
                            <div>
                                <input type="text" name="lastName" placeholder={t('signup.lastNamePlaceholder')} required value={signupData.lastName} onChange={handleSignupChange} className={`${inputClass} rounded-md`} />
                                {formErrors.lastName && <p className="mt-1 text-xs text-red-500">{formErrors.lastName}</p>}
                            </div>
                            <div>
                                <input type="email" name="email" placeholder={t('signup.emailPlaceholder')} required value={signupData.email} onChange={handleSignupChange} className={`${inputClass} rounded-md`} />
                                {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
                            </div>
                            <div>
                                <input type="text" name="company" placeholder={t('signup.companyPlaceholder')} value={signupData.company} onChange={handleSignupChange} className={`${inputClass} rounded-md`} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <select name="countryCode" aria-label={t('signup.countryCodeLabel')} value={signupData.countryCode} onChange={handleSignupChange} className={`${inputClass} rounded-md`}>
                                        {phoneCountries.map(option => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                    {formErrors.countryCode && <p className="mt-1 text-xs text-red-500">{formErrors.countryCode}</p>}
                                </div>
                                <div className="col-span-2">
                                    <input type="tel" name="phone" placeholder={t('signup.phonePlaceholder')} required value={signupData.phone} onChange={handleSignupChange} inputMode="tel" pattern="[0-9]*" className={`${inputClass} rounded-md`} />
                                    {formErrors.phone && <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>}
                                </div>
                            </div>
                            <div>
                                <select name="position" value={signupData.position} onChange={handleSignupChange} className={`${inputClass} rounded-md`}>
                                    {companyPositions.map(pos => <option key={pos} value={pos}>{t(`positions.${pos.replace(/ /g, '')}`)}</option>)}
                                </select>
                                {formErrors.position && <p className="mt-1 text-xs text-red-500">{formErrors.position}</p>}
                            </div>
                        </div>
                        <button type="submit" disabled={isSendingCode} className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[var(--drip-primary)] hover:bg-[var(--drip-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--drip-primary)] transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                             {isSendingCode ? t('verify.button') + '...' : t('signup.signUpButton')}
                        </button>
                    </form>
                    <div className="text-sm text-center">
                        <button onClick={() => setView('login')} className="font-medium text-[var(--drip-primary)] hover:text-[var(--drip-primary-dark)] dark:text-[var(--drip-primary)] dark:hover:text-[rgba(75,165,134,0.8)]">
                           {t('signup.loginPrompt')}
                        </button>
                    </div>
                </>
            );
        }
    }


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
        <div className="min-h-screen bg-slate-100 dark:bg-neutral-900 flex items-center justify-center animate-fade-in p-2 sm:p-4 w-full">
            {renderNotification()}
             <div className="absolute top-6 right-6 flex items-center gap-3">
                <LanguageSwitcher />
                <button
                    onClick={handleThemeToggle}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors border ${theme === 'light'
                        ? 'bg-[color:rgba(75,165,134,0.1)] border-[var(--drip-primary)] text-[var(--drip-primary)] hover:bg-[var(--drip-primary)] hover:text-white shadow-sm'
                        : 'bg-[color:rgba(36,65,55,0.6)] border-[var(--drip-primary)] text-[var(--drip-dark-text)] hover:bg-[var(--drip-primary)] hover:text-white shadow-sm'
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
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-2xl">
                {view !== 'verify' && (
                    <div className="flex flex-col items-center text-center">
                        <BrandLogo className="h-12 w-auto" />
                        <p className="mt-2 text-sm text-[var(--drip-muted)] dark:text-neutral-400 tracking-wide">
                            {t('login.subtitle')}
                        </p>
                    </div>
                )}

                {renderContent()}

                <div className="pt-4 border-t border-slate-200 dark:border-neutral-700">
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[var(--drip-muted)]/80 dark:text-neutral-500">
                        <button
                            type="button"
                            onClick={() => onOpenLegal('impressum')}
                            className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            {t('footer.imprint')}
                        </button>
                        <span aria-hidden="true">•</span>
                        <button
                            type="button"
                            onClick={() => onOpenLegal('privacy')}
                            className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            {t('footer.privacy')}
                        </button>
                        <span aria-hidden="true">•</span>
                        <button
                            type="button"
                            onClick={() => onOpenLegal('terms')}
                            className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            {t('footer.terms')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default LoginPage;
