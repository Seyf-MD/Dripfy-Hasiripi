import * as React from 'react';
import { X, UserCircle, Settings as SettingsIcon, Shield, Key } from 'lucide-react';
import { useLanguage, Language } from '../i18n/LanguageContext';
import { UserRole, NotificationSettings } from '../types';
import { useTheme } from '../context/ThemeContext';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface SettingsModalProps {
    isOpen: boolean;
    userRole: UserRole | null;
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
    <div className="flex items-center justify-between w-full">
        <span className="font-medium text-[color:var(--drip-text-soft)] dark:text-neutral-300">{label}</span>
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-[var(--drip-primary)]' : 'bg-slate-200 dark:bg-neutral-700'}`}
        >
            <span className={`block w-4 h-4 rounded-full bg-white transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-[var(--drip-muted)] dark:text-neutral-400 mb-1.5">{label}</label>
        {children}
    </div>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, userRole, onClose, activeTab, setActiveTab, notificationSettings, onSaveSettings, onChangePasswordClick, onViewAuditLog, onExportData, onDeleteAccount }) => {
    const { t, language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();
    
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

    const inputClass = "w-full px-3 py-2 bg-slate-100 dark:bg-neutral-700 border border-slate-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none focus:border-[var(--drip-primary)] text-[var(--drip-text)] dark:text-white placeholder:text-neutral-500";
    
    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">{t('settings.profile.title')}</h3>
                            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{t('settings.profile.subtitle')}</p>
                        </div>
                        <div className="space-y-4">
                            <FormField label={t('settings.profile.name')}>
                                <input type="text" defaultValue="Demo User" className={inputClass} />
                            </FormField>
                            <FormField label={t('settings.profile.email')}>
                                <input type="email" defaultValue="demo@dripfy.com" className={inputClass} />
                            </FormField>
                            <FormField label={t('settings.profile.password')}>
                                <button onClick={onChangePasswordClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-neutral-700 text-[var(--drip-text)] dark:text-white text-sm font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-neutral-600 transition-colors">
                                    <Key size={16}/>
                                    {t('settings.profile.changePassword')}
                                </button>
                            </FormField>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                     <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">{t('settings.settings.title')}</h3>
                            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{t('settings.settings.subtitle')}</p>
                        </div>
                        <div className="space-y-4">
                           <FormField label={t('settings.settings.language')}>
                                <select value={localLanguage} onChange={(e) => setLocalLanguage(e.target.value as Language)} className={inputClass}>
                                    <option value="en">English</option>
                                    <option value="tr">Türkçe</option>
                                    <option value="de">Deutsch</option>
                                    <option value="ru">Русский</option>
                                    <option value="ar">العربية</option>
                                </select>
                            </FormField>
                            <Toggle label={t('settings.settings.darkMode')} enabled={localTheme === 'dark'} onToggle={handleThemeToggle} />
                            <Toggle label={t('settings.settings.emailNotifications')} enabled={localNotifications.email} onToggle={() => handleNotificationToggle('email')} />
                            <Toggle label={t('settings.settings.pushNotifications')} enabled={localNotifications.push} onToggle={() => handleNotificationToggle('push')} />
                        </div>
                    </div>
                );
            case 'privacy':
                 return (
                     <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">{t('settings.privacy.title')}</h3>
                            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{t('settings.privacy.subtitle')}</p>
                        </div>
                        <div className="space-y-3">
                           {userRole === 'admin' && (
                                <button onClick={onViewAuditLog} className="w-full text-left p-3 bg-slate-100 dark:bg-neutral-700/50 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-md transition-colors">{t('settings.privacy.auditLog')}</button>
                           )}
                           <button onClick={onExportData} className="w-full text-left p-3 bg-slate-100 dark:bg-neutral-700/50 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-md transition-colors">{t('settings.privacy.exportData')}</button>
                           <button onClick={onDeleteAccount} className="w-full text-left p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 rounded-md transition-colors">{t('settings.privacy.deleteAccount')}</button>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" 
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div className="bg-white dark:bg-neutral-800 text-[var(--drip-text)] dark:text-white rounded-xl border border-slate-200 dark:border-neutral-700 w-full max-w-3xl h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-neutral-700 flex-shrink-0">
                    <h2 id={modalTitleId} className="text-xl font-bold">{t('settings.title')}</h2>
                    <button onClick={onClose} className="text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    <aside className="w-1/4 border-r border-slate-200 dark:border-neutral-700 p-4 space-y-2 bg-slate-50 dark:bg-neutral-900/50">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[color:rgba(75,165,134,0.12)] text-[var(--drip-primary)] dark:text-[var(--drip-primary)]' : 'text-[color:var(--drip-text-soft)] dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700'}`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </aside>
                    <main className="w-3/4 p-6 overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>
                 <footer className="p-4 flex justify-end items-center gap-4 border-t border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800/50 flex-shrink-0 rounded-b-xl">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-200 dark:bg-neutral-700 text-[var(--drip-text)] dark:text-white text-sm font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-neutral-600 transition-colors">
                        {t('settings.closeButton')}
                    </button>
                    <button onClick={handleSaveChanges} className="px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                        {t('settings.saveButton')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SettingsModal;
