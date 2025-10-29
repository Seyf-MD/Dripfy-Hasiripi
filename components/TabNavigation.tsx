import * as React from 'react';
import { Calendar, Euro, ShieldAlert, Users, ListChecks, Shield } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface TabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    userRole: 'admin' | 'user' | null;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab, userRole }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    
    const allTabs = [
        { name: 'Calendar', icon: <Calendar size={18} />, label: t('tabs.calendar') },
        { name: 'Financials', icon: <Euro size={18} />, label: t('tabs.financials') },
        { name: 'Challenges', icon: <ShieldAlert size={18} />, label: t('tabs.challenges') },
        { name: 'Contacts', icon: <Users size={18} />, label: t('tabs.contacts') },
        { name: 'Tasks', icon: <ListChecks size={18} />, label: t('tabs.tasks') },
        { name: 'Admin Panel', icon: <Shield size={18} />, label: t('tabs.adminPanel') },
    ];

    const visibleTabs = userRole === 'admin' ? allTabs : allTabs.filter(tab => tab.name !== 'Admin Panel');
    
    return (
        <div className="mt-6 animate-slide-in-up" style={{ animationDelay: '600ms' }}>
            <div className="border-b border-slate-200 dark:border-neutral-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1" aria-label="Tabs">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`whitespace-nowrap pt-3 pb-6 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                activeTab === tab.name
                                    ? 'border-[var(--drip-primary)] text-[var(--drip-primary)] dark:text-[var(--drip-primary)]'
                                    : theme === 'light'
                                        ? 'border-transparent text-[var(--drip-muted)] hover:text-[var(--drip-primary)] hover:border-[var(--drip-primary-muted)]'
                                        : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-500'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default TabNavigation;
