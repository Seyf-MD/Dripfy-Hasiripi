import * as React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import ProfileDropdown from './ProfileDropdown';
import { UserRole } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface HeaderProps {
    userRole: UserRole | null;
    onLogout: () => void;
    onOpenSettings: (tab: SettingsTab) => void;
}

const Header: React.FC<HeaderProps> = ({ userRole, onLogout, onOpenSettings }) => {
    const { t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const userName = userRole === 'admin' ? 'Admin User' : 'Demo User';
    const userEmail = userRole === 'admin' ? 'admin@dripfy.de' : 'demo@dripfy.com';

    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-40 border-b border-slate-200 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div>
                         <h1 className="text-4xl font-bold text-[#32ff84] brand-glow">dripfy<span className="text-neutral-400">.</span></h1>
                         <p className="text-sm text-neutral-500 dark:text-neutral-400 tracking-wide -mt-0.5">{t('login.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <button
                            onClick={handleThemeToggle}
                            className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                            aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun size={20} className="text-neutral-600 dark:text-neutral-300" />
                            ) : (
                                <Moon size={20} className="text-neutral-600 dark:text-neutral-300" />
                            )}
                        </button>
                        <ProfileDropdown 
                            userName={userName}
                            userEmail={userEmail}
                            onLogout={onLogout}
                            onOpenSettings={onOpenSettings}
                        />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;