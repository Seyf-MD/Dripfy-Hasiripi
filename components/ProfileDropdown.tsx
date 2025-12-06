import * as React from 'react';
import { User, Settings, LogOut, Shield, UserCircle, FileText, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface ProfileDropdownProps {
    userName: string;
    userEmail: string;
    onLogout: () => void;
    onOpenSettings: (tab: SettingsTab) => void;
    isAdmin?: boolean;
    onOpenLegalEditor?: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ userName, userEmail, onLogout, onOpenSettings, isAdmin, onOpenLegalEditor }) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMenuClick = (tab: SettingsTab) => {
        onOpenSettings(tab);
        setIsOpen(false);
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ios-glass hover:scale-105 active:scale-95 shadow-md border border-white/20"
                aria-label="Profile menu"
            >
                <User size={20} className="text-[var(--drip-text)] dark:text-white" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 ios-glass bg-white/90 dark:bg-neutral-900/95 rounded-2xl shadow-2xl z-50 animate-fade-in-up origin-top-right border border-white/20 overflow-hidden backdrop-blur-3xl">
                    <div className="p-5 border-b border-white/10 bg-white/5">
                        <p className="font-bold text-[var(--drip-text)] dark:text-white truncate text-lg">{userName}</p>
                        <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 truncate font-medium">{userEmail}</p>
                    </div>
                    <ul className="py-2">
                        <li>
                            <button
                                onClick={() => handleMenuClick('profile')}
                                className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm font-medium text-[var(--drip-text)] dark:text-neutral-200 hover:bg-white/10 transition-colors"
                            >
                                <UserCircle size={18} className="text-[var(--drip-primary)]" />
                                <span>{t('profile.menu.profile')}</span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuClick('settings')}
                                className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm font-medium text-[var(--drip-text)] dark:text-neutral-200 hover:bg-white/10 transition-colors"
                            >
                                <Settings size={18} className="text-[var(--drip-primary)]" />
                                <span>{t('profile.menu.settings')}</span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuClick('privacy')}
                                className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm font-medium text-[var(--drip-text)] dark:text-neutral-200 hover:bg-white/10 transition-colors"
                            >
                                <Shield size={18} className="text-[var(--drip-primary)]" />
                                <span>{t('profile.menu.privacy')}</span>
                            </button>
                        </li>
                        {isAdmin && onOpenLegalEditor && (
                            <li>
                                <button
                                    onClick={() => { onOpenLegalEditor(); setIsOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm font-medium text-[var(--drip-text)] dark:text-neutral-200 hover:bg-white/10 transition-colors"
                                >
                                    <FileText size={18} className="text-[var(--drip-primary)]" />
                                    <span>{t('profile.menu.legalEditor')}</span>
                                </button>
                            </li>
                        )}
                        <li className="mt-2 border-t border-white/10">
                            <button
                                onClick={() => { onLogout(); setIsOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={18} />
                                <span>{t('profile.menu.logout')}</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ProfileDropdown;
