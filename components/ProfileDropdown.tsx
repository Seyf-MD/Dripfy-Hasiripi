import * as React from 'react';
import { User, Settings, LogOut, Shield, UserCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface ProfileDropdownProps {
    userName: string;
    userEmail: string;
    onLogout: () => void;
    onOpenSettings: (tab: SettingsTab) => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ userName, userEmail, onLogout, onOpenSettings }) => {
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
                className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
            >
                <User size={20} className="text-[color:var(--drip-text-soft)] dark:text-neutral-300" />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 animate-fade-in-up origin-top-right">
                    <div className="p-4 border-b border-slate-200 dark:border-neutral-700">
                        <p className="font-semibold text-[var(--drip-text)] dark:text-white truncate">{userName}</p>
                        <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 truncate">{userEmail}</p>
                    </div>
                    <ul className="py-2">
                        <li>
                            <button
                                onClick={() => handleMenuClick('profile')}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <UserCircle size={16} />
                                <span>{t('profile.menu.profile')}</span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => handleMenuClick('settings')}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <Settings size={16} />
                                <span>{t('profile.menu.settings')}</span>
                            </button>
                        </li>
                         <li>
                            <button
                                onClick={() => handleMenuClick('privacy')}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <Shield size={16} />
                                <span>{t('profile.menu.privacy')}</span>
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => { onLogout(); setIsOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors mt-2 border-t border-slate-200 dark:border-neutral-700"
                            >
                                <LogOut size={16} />
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