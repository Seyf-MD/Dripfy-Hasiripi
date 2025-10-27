import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { SignupRequest } from '../types';

type UserRole = 'admin' | 'user';
interface LoginPageProps {
    onLogin: (role: UserRole) => void;
    onSignupRequest: (signupData: Omit<SignupRequest, 'id' | 'status' | 'timestamp'>) => void;
}

const welcomeMessages = {
    en: "Welcome",
    tr: "Hoş geldiniz",
    de: "Willkommen",
    ru: "Добро пожаловать",
    ar: "أهلاً وسهلاً"
};

const companyPositions = [
    'CEO', 'CTO', 'CFO', 'COO', 'Head of Department', 'Team Lead', 'Project Manager', 'Senior Specialist', 'Junior Specialist', 'Intern'
];

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSignupRequest }) => {
    const { t } = useLanguage();
    const [view, setView] = useState<'login' | 'signup'>('login');
    
    // Login state
    const [loginEmail, setLoginEmail] = useState('demo@dripfy.com');
    const [loginPassword, setLoginPassword] = useState('password');

    // Signup state
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPhone, setSignupPhone] = useState('');
    const [signupPosition, setSignupPosition] = useState(companyPositions[0]);
    const [signupPassword, setSignupPassword] = useState('');

    // Animation state
    const [welcomeIndex, setWelcomeIndex] = useState(0);
    const [fade, setFade] = useState(true);

    const languages = Object.keys(welcomeMessages) as (keyof typeof welcomeMessages)[];

    useEffect(() => {
        const interval = setInterval(() => {
            setFade(false);
            setTimeout(() => {
                setWelcomeIndex((prevIndex) => (prevIndex + 1) % languages.length);
                setFade(true);
            }, 500); // fade out duration
        }, 3000); // 3 seconds per message
        return () => clearInterval(interval);
    }, []);

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
        onSignupRequest({
            name: signupName,
            email: signupEmail,
            phone: signupPhone,
            position: signupPosition,
        });
        // Reset form and switch to login view after submission
        setView('login');
        setSignupName('');
        setSignupEmail('');
        setSignupPhone('');
        setSignupPassword('');
        setSignupPosition(companyPositions[0]);
    };
    
    const inputClass = "appearance-none rounded-none relative block w-full px-3 py-2 border border-neutral-600 bg-neutral-900 text-white placeholder-neutral-500 focus:outline-none focus:ring-[#32ff84] focus:border-[#32ff84] focus:z-10 sm:text-sm";

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center animate-fade-in p-4">
             <div className="absolute top-6 right-6">
                <LanguageSwitcher />
            </div>
            <div className="w-full max-w-md p-8 space-y-6 bg-neutral-800 rounded-xl border border-neutral-700 shadow-2xl">
                <div className="text-center">
                    <div className="h-12 flex items-center justify-center">
                         <h2 className={`text-3xl font-bold text-neutral-300 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                            {welcomeMessages[languages[welcomeIndex]]}
                        </h2>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h1>
                        <p className="mt-2 text-sm text-neutral-500">
                            {t('login.subtitle')}
                        </p>
                    </div>
                </div>
                
                {view === 'login' ? (
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
                ) : (
                    <form className="mt-8 space-y-4" onSubmit={handleSignupSubmit}>
                        <div className="rounded-md shadow-sm -space-y-px">
                            <input type="text" placeholder={t('signup.namePlaceholder')} required value={signupName} onChange={e => setSignupName(e.target.value)} className={`${inputClass} rounded-t-md`} />
                            <input type="email" placeholder={t('signup.emailPlaceholder')} required value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className={inputClass} />
                            <input type="tel" placeholder={t('signup.phonePlaceholder')} required value={signupPhone} onChange={e => setSignupPhone(e.target.value)} className={inputClass} />
                            <select value={signupPosition} onChange={e => setSignupPosition(e.target.value)} className={inputClass}>
                                {companyPositions.map(pos => <option key={pos} value={pos}>{t(`positions.${pos.replace(/ /g, '')}`)}</option>)}
                            </select>
                            <input type="password" placeholder={t('signup.passwordPlaceholder')} required value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className={`${inputClass} rounded-b-md`} />
                        </div>
                        <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#32ff84] hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors">
                             {t('signup.signUpButton')}
                        </button>
                    </form>
                )}
                 <div className="text-sm text-center">
                    <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} className="font-medium text-green-400 hover:text-green-300">
                       {view === 'login' ? t('signup.prompt') : t('signup.loginPrompt')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;