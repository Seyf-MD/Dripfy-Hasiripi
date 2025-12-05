import * as React from 'react';
import { X, UserCircle, Settings as SettingsIcon, Shield, Key } from 'lucide-react';
import { useLanguage, Language } from '../i18n/LanguageContext';
import { NotificationSettings } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
    notificationSettings: NotificationSettings;
    onSaveSettings: (notifications: NotificationSettings) => void;
    onChangePasswordClick: () => void;
    onViewAuditLog: () => void;
    onExportData: () => void;
    onDeleteAccount: () => void;
}

const Toggle: React.FC<{ label: string; enabled: boolean; onToggle: () => void }> = ({ label, enabled, onToggle }) => (
    <div className="flex items-center justify-between w-full py-3 border-b border-white/5 last:border-0">
        <span className="font-medium text-[var(--drip-text)] dark:text-white">{label}</span>
        <button
            onClick={onToggle}
            className={`w-12 h-7 rounded-full p-1 transition-all duration-300 shadow-inner ${enabled ? 'bg-[var(--drip-primary)]' : 'bg-neutral-200 dark:bg-white/10'}`}
        >
            <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-bold text-[var(--drip-muted)]/80 dark:text-neutral-400 mb-2 ml-1">{label}</label>
        {children}
    </div>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, activeTab, setActiveTab, notificationSettings, onSaveSettings, onChangePasswordClick, onViewAuditLog, onExportData, onDeleteAccount }) => {
    const { t, language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    const { user, isAdmin } = useAuth();

    const [localNotifications, setLocalNotifications] = React.useState(notificationSettings);
    const [localTheme, setLocalTheme] = React.useState(theme);
    const [localLanguage, setLocalLanguage] = React.useState(language);

    React.useEffect(() => {
        if (isOpen) {
            setLocalNotifications(notificationSettings);
            setLocalTheme(theme);
            setLocalLanguage(language);
        }
    }, [isOpen, notificationSettings, theme, language]);

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

    const handleNotificationToggle = (key: keyof NotificationSettings) => {
        setLocalNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleThemeToggle = () => {
        setLocalTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    const handleSaveChanges = () => {
        onSaveSettings(localNotifications);
        setTheme(localTheme);
        if (localLanguage !== language) {
            setLanguage(localLanguage);
        }
        onClose();
    };

    if (!isOpen) return null;

    const inputClass = "w-full px-4 py-2.5 bg-white/10 dark:bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none focus:border-[var(--drip-primary)] text-[var(--drip-text)] dark:text-white placeholder:text-[var(--drip-muted)]/40 transition-all backdrop-blur-sm shadow-inner hover:bg-white/20";

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white mb-1">{t('settings.profile.title')}</h3>
                            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 font-medium">{t('settings.profile.subtitle')}</p>
                        </div>
                        <div className="space-y-5">
                            <FormField label={t('settings.profile.name')}>
                                <input type="text" defaultValue={user?.name || ''} className={inputClass} readOnly />
                            </FormField>
                            <FormField label={t('settings.profile.email')}>
                                <input type="email" defaultValue={user?.email || ''} className={inputClass} readOnly />
                            </FormField>
                            <FormField label={t('settings.profile.password')}>
                                <button onClick={onChangePasswordClick} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--drip-primary)]/10 text-[var(--drip-text)] dark:text-white text-sm font-bold rounded-xl hover:bg-[var(--drip-primary)]/20 transition-all active:scale-95 border border-[var(--drip-primary)]/20">
                                    <Key size={18} className="text-[var(--drip-primary)]" />
                                    {t('settings.profile.changePassword')}
                                </button>
                            </FormField>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white mb-1">{t('settings.settings.title')}</h3>
                            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 font-medium">{t('settings.settings.subtitle')}</p>
                        </div>
                        <div className="space-y-4">
                            <FormField label={t('settings.settings.language')}>
                                <select value={localLanguage} onChange={(e) => setLocalLanguage(e.target.value as Language)} className={inputClass}>
                                    <option value="en" className="bg-white dark:bg-neutral-800">English</option>
                                    <option value="tr" className="bg-white dark:bg-neutral-800">Türkçe</option>
                                    <option value="de" className="bg-white dark:bg-neutral-800">Deutsch</option>
                                    <option value="ru" className="bg-white dark:bg-neutral-800">Русский</option>
                                    <option value="ar" className="bg-white dark:bg-neutral-800">العربية</option>
                                </select>
                            </FormField>
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
                                <Toggle label={t('settings.settings.darkMode')} enabled={localTheme === 'dark'} onToggle={handleThemeToggle} />
                                <Toggle label={t('settings.settings.emailNotifications')} enabled={localNotifications.email} onToggle={() => handleNotificationToggle('email')} />
                                <Toggle label={t('settings.settings.pushNotifications')} enabled={localNotifications.push} onToggle={() => handleNotificationToggle('push')} />
                            </div>
                        </div>
                    </div>
                );
            case 'privacy':
                return (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white mb-1">{t('settings.privacy.title')}</h3>
                            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 font-medium">{t('settings.privacy.subtitle')}</p>
                        </div>
                        <div className="space-y-3">
                            {isAdmin && (
                                <button onClick={onViewAuditLog} className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all font-medium border border-white/10 hover:border-white/20">{t('settings.privacy.auditLog')}</button>
                            )}
                            <button onClick={onExportData} className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all font-medium border border-white/10 hover:border-white/20">{t('settings.privacy.exportData')}</button>
                            <button onClick={onDeleteAccount} className="w-full text-left p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-2xl transition-all font-bold border border-red-500/20">{t('settings.privacy.deleteAccount')}</button>
                        </div>
                    </div>
                );
        }
    }

    const tabs = [
        { id: 'profile' as SettingsTab, label: t('settings.tabs.profile'), icon: <UserCircle size={18} /> },
        { id: 'settings' as SettingsTab, label: t('settings.tabs.settings'), icon: <SettingsIcon size={18} /> },
        { id: 'privacy' as SettingsTab, label: t('settings.tabs.privacy'), icon: <Shield size={18} /> },
    ];

    const modalTitleId = 'settings-modal-title';

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div className="ios-glass p-0 rounded-3xl w-full max-w-3xl h-[75vh] flex flex-col shadow-2xl relative overflow-hidden border border-white/20 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <header className="p-5 flex justify-between items-center border-b border-white/10 bg-white/5 flex-shrink-0">
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{t('settings.title')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    <aside className="w-1/3 md:w-1/4 border-r border-white/10 p-4 space-y-2 bg-white/5">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-[var(--drip-primary)]/10 text-[var(--drip-primary)] border border-[var(--drip-primary)]/20 shadow-sm' : 'text-[var(--drip-text)]/70 dark:text-neutral-400 hover:bg-white/10'}`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </aside>
                    <main className="w-2/3 md:w-3/4 p-8 overflow-y-auto scrollbar-hide">
                        {renderContent()}
                    </main>
                </div>
                <footer className="p-5 flex justify-end items-center gap-4 border-t border-white/10 bg-white/5 flex-shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white/10 text-[var(--drip-text)] dark:text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/10">
                        {t('settings.closeButton')}
                    </button>
                    <button onClick={handleSaveChanges} className="px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all active:scale-95">
                        {t('settings.saveButton')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SettingsModal;
