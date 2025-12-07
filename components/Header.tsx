import * as React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import ProfileDropdown from './ProfileDropdown';
import BrandLogo from './BrandLogo';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import MessageButton from './MessageButton';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface HeaderProps {
    onLogout: () => void;
    onOpenSettings: (tab: SettingsTab) => void;
    onOpenLegalEditor?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout, onOpenSettings, onOpenLegalEditor }) => {
    const { t } = useLanguage();
    const { theme, setTheme } = useTheme();
    const { user, isAdmin } = useAuth();
    const userName = user?.name || (isAdmin ? 'Admin' : 'User');
    const userEmail = user?.email || 'noreply@example.com';

    const handleThemeToggle = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    // iOS 26 Header Styles
    const headerClasses = 'ios-glass sticky top-4 z-[9000] mx-4 sm:mx-auto max-w-7xl rounded-2xl transition-all duration-300';

    return (
        <header className={headerClasses}>
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    <div className="flex flex-col justify-center">
                        <BrandLogo className="h-8 w-auto sm:h-10 transition-transform hover:scale-105" />
                        <p className={`text-xs font-medium tracking-wider mt-1 opacity-70 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}>
                            {t('login.subtitle')}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                        <LanguageSwitcher />

                        <button
                            onClick={handleThemeToggle}
                            className={`
                                relative group flex items-center justify-center w-10 h-10 rounded-full 
                                transition-all duration-300 hover:scale-110 active:scale-95
                                ${theme === 'light'
                                    ? 'bg-[var(--drip-card)] hover:bg-[var(--drip-surface)] text-[var(--drip-text)] shadow-sm hover:shadow-md'
                                    : 'bg-white/10 hover:bg-white/20 text-[var(--drip-dark-text)] shadow-inner'}
                            `}
                            aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
                        >
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--drip-primary)]/20 to-[var(--drip-accent)]/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            {theme === 'dark' ? (
                                <Sun size={20} className="relative z-10" />
                            ) : (
                                <Moon size={20} className="relative z-10" />
                            )}
                        </button>

                        <MessageButton />

                        <div className="pl-2 border-l border-gray-200/20">
                            <ProfileDropdown
                                userName={userName}
                                userEmail={userEmail}
                                onLogout={onLogout}
                                onOpenSettings={onOpenSettings}
                                isAdmin={isAdmin}
                                onOpenLegalEditor={onOpenLegalEditor}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
