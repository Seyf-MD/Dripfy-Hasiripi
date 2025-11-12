import * as React from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import ProfileDropdown from './ProfileDropdown';
import BrandLogo from './BrandLogo';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

    const headerClasses = theme === 'light'
        ? 'bg-[rgba(250,249,246,0.92)] border-[var(--drip-border)]'
        : 'bg-neutral-900/80 border-neutral-800';

    const themeToggleClasses = theme === 'light'
        ? 'bg-[color:rgba(75,165,134,0.1)] border-[var(--drip-primary)] text-[var(--drip-primary)] hover:bg-[var(--drip-primary)] hover:text-white shadow-sm'
        : 'bg-[color:rgba(36,65,55,0.6)] border-[var(--drip-primary)] text-[var(--drip-dark-text)] hover:bg-[var(--drip-primary)] hover:text-white shadow-sm';

    return (
        <header className={`${headerClasses} backdrop-blur-sm sticky top-0 z-30 border-b py-2 sm:py-3`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex flex-col">
                        <BrandLogo className="h-10 w-auto sm:h-12" />
                        <p className={`text-sm tracking-wide mt-1 ${theme === 'light' ? 'text-[var(--drip-muted)]' : 'text-neutral-400'}`}>{t('login.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <LanguageSwitcher />
                        <button
                            onClick={handleThemeToggle}
                            className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors border ${themeToggleClasses}`}
                            aria-label={theme === 'dark' ? 'Activate light mode' : 'Activate dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun size={20} className="text-[var(--drip-dark-text)]" />
                            ) : (
                                <Moon size={20} className="text-[var(--drip-muted)]" />
                            )}
                        </button>
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
        </header>
    );
};

export default Header;
