import React, { useState } from 'react';
import { X, UserCircle, Settings as SettingsIcon, Shield, Bell, Moon, Key, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type SettingsTab = 'profile' | 'settings' | 'privacy';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeTab: SettingsTab;
    setActiveTab: (tab: SettingsTab) => void;
}

const Toggle: React.FC<{ label: string; enabled: boolean; onToggle: () => void }> = ({ label, enabled, onToggle }) => (
    <div className="flex items-center justify-between w-full">
        <span className="font-medium text-neutral-300">{label}</span>
        <button
            onClick={onToggle}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${enabled ? 'bg-[#32ff84]' : 'bg-neutral-700'}`}
        >
            <span className={`block w-4 h-4 rounded-full bg-white transform transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
);

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-neutral-400 mb-1.5">{label}</label>
        {children}
    </div>
);


const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, activeTab, setActiveTab }) => {
    const { t, language, setLanguage } = useLanguage();
    const [settings, setSettings] = React.useState({
        darkMode: true,
        emailNotifications: false,
        pushNotifications: true,
    });
    const [showPassword, setShowPassword] = useState(false);

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({...prev, [key]: !prev[key]}));
    }

    if (!isOpen) return null;

    const inputClass = "w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-white placeholder:text-neutral-500";
    
    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">{t('settings.profile.title')}</h3>
                            <p className="text-sm text-neutral-400">{t('settings.profile.subtitle')}</p>
                        </div>
                        <div className="space-y-4">
                            <FormField label={t('settings.profile.name')}>
                                <input type="text" defaultValue="Demo User" className={inputClass} />
                            </FormField>
                            <FormField label={t('settings.profile.email')}>
                                <input type="email" defaultValue="demo@dripfy.com" className={inputClass} />
                            </FormField>
                            <FormField label={t('settings.profile.newPassword')}>
                                <div className="relative">
                                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" className={`${inputClass} pr-10`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-neutral-400 hover:text-white">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </FormField>
                        </div>
                    </div>
                );
            case 'settings':
                return (
                     <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">{t('settings.settings.title')}</h3>
                            <p className="text-sm text-neutral-400">{t('settings.settings.subtitle')}</p>
                        </div>
                        <div className="space-y-4">
                           <FormField label={t('settings.settings.language')}>
                                <select value={language} onChange={(e) => setLanguage(e.target.value as any)} className={inputClass}>
                                    <option value="en">English</option>
                                    <option value="tr">Türkçe</option>
                                    <option value="de">Deutsch</option>
                                    <option value="ru">Русский</option>
                                    <option value="ar">العربية</option>
                                </select>
                            </FormField>
                            <Toggle label={t('settings.settings.darkMode')} enabled={settings.darkMode} onToggle={() => handleToggle('darkMode')} />
                            <Toggle label={t('settings.settings.emailNotifications')} enabled={settings.emailNotifications} onToggle={() => handleToggle('emailNotifications')} />
                            <Toggle label={t('settings.settings.pushNotifications')} enabled={settings.pushNotifications} onToggle={() => handleToggle('pushNotifications')} />
                        </div>
                    </div>
                );
            case 'privacy':
                 return (
                     <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">{t('settings.privacy.title')}</h3>
                            <p className="text-sm text-neutral-400">{t('settings.privacy.subtitle')}</p>
                        </div>
                        <div className="space-y-3">
                           <button className="w-full text-left p-3 bg-neutral-700/50 hover:bg-neutral-700 rounded-md transition-colors">{t('settings.privacy.auditLog')}</button>
                           <button className="w-full text-left p-3 bg-neutral-700/50 hover:bg-neutral-700 rounded-md transition-colors">{t('settings.privacy.exportData')}</button>
                           <button className="w-full text-left p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors">{t('settings.privacy.deleteAccount')}</button>
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

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 w-full max-w-3xl h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-neutral-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white">{t('settings.title')}</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>
                <div className="flex flex-grow overflow-hidden">
                    <aside className="w-1/4 border-r border-neutral-700 p-4 space-y-2">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#32ff84]/10 text-[#32ff84]' : 'text-neutral-300 hover:bg-neutral-700'}`}>
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </aside>
                    <main className="w-3/4 p-6 overflow-y-auto">
                        {renderContent()}
                    </main>
                </div>
                 <footer className="p-4 flex justify-end items-center gap-4 border-t border-neutral-700 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-neutral-700 text-white text-sm font-semibold rounded-lg hover:bg-neutral-600 transition-colors">
                        {t('settings.closeButton')}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        {t('settings.saveButton')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SettingsModal;
