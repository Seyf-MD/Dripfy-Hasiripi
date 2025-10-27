import * as React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { SignupRequest } from '../types';

type UserRole = 'admin' | 'user';
interface LoginPageProps {
    onLogin: (role: UserRole) => void;
    onSignupRequest: (signupData: Omit<SignupRequest, 'id' | 'status' | 'timestamp'>) => void;
}

const companyPositions = [
    'CEO', 'CTO', 'CFO', 'COO', 'Head of Department', 'Team Lead', 'Project Manager', 'Senior Specialist', 'Junior Specialist', 'Intern'
];

// Mock verification code for demo purposes
const MOCK_VERIFICATION_CODE = "123456";

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignupRequest }) => {
    const { t } = useLanguage();
    const [view, setView] = React.useState<'login' | 'signup' | 'verify'>('login');
    
    // Login state
    const [loginEmail, setLoginEmail] = React.useState('demo@dripfy.com');
    const [loginPassword, setLoginPassword] = React.useState('password');

    // Signup state
    const [signupData, setSignupData] = React.useState({ name: '', email: '', phone: '', position: companyPositions[0] });

    // Verification state
    const [verificationCode, setVerificationCode] = React.useState('');
    const [verificationError, setVerificationError] = React.useState('');

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginEmail === 'admin@dripfy.de' && loginPassword === 'password123') {
            onLogin('admin');
        } else {
            onLogin('user');
        }
    };

    const handleSignupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, you would call an API to send the code.
        // Here, we just switch to the verification view.
        setVerificationError('');
        setView('verify');
    };

    const handleVerifyAndSignup = (e: React.FormEvent) => {
        e.preventDefault();
        if (verificationCode === MOCK_VERIFICATION_CODE) {
            onSignupRequest(signupData);
            // Reset form and switch to login view after successful request
            setView('login');
            setSignupData({ name: '', email: '', phone: '', position: companyPositions[0] });
            setVerificationCode('');
        } else {
            setVerificationError(t('verify.invalidCode'));
        }
    };

    const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setSignupData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const inputClass = "appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-[#32ff84] focus:border-[#32ff84] focus:z-10 sm:text-sm";

    const renderContent = () => {
        if (view === 'verify') {
            return (
                <div>
                     <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-black dark:text-white">{t('verify.title')}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('verify.subtitle').replace('{email}', signupData.email)}</p>
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
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#32ff84] hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                            {t('verify.button')}
                        </button>
                        <button type="button" onClick={() => setView('signup')} className="w-full text-center text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white">
                            {t('verify.backButton')}
                        </button>
                    </form>
                </div>
            );
        }

        if (view === 'login') {
            return (
                <>
                    <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <input id="email-address" name="email" type="email" required className={`${inputClass} rounded-t-md`} placeholder={t('login.emailPlaceholder')} value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                            </div>
                            <div>
                                <input id="password" name="password" type="password" required className={`${inputClass} rounded-b-md`} placeholder={t('login.passwordPlaceholder')} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                            </div>
                        </div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#32ff84] hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                            {t('login.signInButton')}
                        </button>
                    </form>
                    <div className="text-sm text-center">
                        <button onClick={() => setView('signup')} className="font-medium text-green-500 hover:text-green-400 dark:text-green-400 dark:hover:text-green-300">
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
                        <div className="rounded-md shadow-sm -space-y-px">
                            <input type="text" name="name" placeholder={t('signup.namePlaceholder')} required value={signupData.name} onChange={handleSignupChange} className={`${inputClass} rounded-t-md`} />
                            <input type="email" name="email" placeholder={t('signup.emailPlaceholder')} required value={signupData.email} onChange={handleSignupChange} className={inputClass} />
                            <input type="tel" name="phone" placeholder={t('signup.phonePlaceholder')} required value={signupData.phone} onChange={handleSignupChange} className={inputClass} />
                            <select name="position" value={signupData.position} onChange={handleSignupChange} className={inputClass}>
                                {companyPositions.map(pos => <option key={pos} value={pos}>{t(`positions.${pos.replace(/ /g, '')}`)}</option>)}
                            </select>
                            <input type="password" name="password" placeholder={t('signup.passwordPlaceholder')} required className={`${inputClass} rounded-b-md`} />
                        </div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#32ff84] hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                             {t('signup.signUpButton')}
                        </button>
                    </form>
                    <div className="text-sm text-center">
                        <button onClick={() => setView('login')} className="font-medium text-green-500 hover:text-green-400 dark:text-green-400 dark:hover:text-green-300">
                           {t('signup.loginPrompt')}
                        </button>
                    </div>
                </>
            );
        }
    }


    return (
        <div className="min-h-screen bg-slate-100 dark:bg-neutral-900 flex items-center justify-center animate-fade-in p-4">
             <div className="absolute top-6 right-6">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-2xl">
                {view !== 'verify' && (
                    <div className="text-center">
                        <div className="h-12 flex items-center justify-center">
                             <h2 className="text-3xl font-bold text-neutral-600 dark:text-neutral-300">
                                {t('login.welcome')}
                            </h2>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h1>
                            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 tracking-wide">
                                {t('login.subtitle')}
                            </p>
                        </div>
                    </div>
                )}
                
                {renderContent()}

            </div>
        </div>
    );
};

export default LoginPage;