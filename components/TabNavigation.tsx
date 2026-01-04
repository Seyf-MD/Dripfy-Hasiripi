import * as React from 'react';
import { Calendar, Euro, ShieldAlert, Users, ListChecks, Shield, UserCog } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface TabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab }) => {
    const { t } = useLanguage();
    const { theme } = useTheme();
    const { isAdmin } = useAuth();

    const allTabs = [
        { name: 'Calendar', icon: <Calendar size={18} />, label: t('tabs.calendar') },
        { name: 'Financials', icon: <Euro size={18} />, label: t('tabs.financials') },
        { name: 'Challenges', icon: <ShieldAlert size={18} />, label: t('tabs.challenges') },
        { name: 'Contacts', icon: <Users size={18} />, label: t('tabs.contacts') },
        { name: 'Teams', icon: <UserCog size={18} />, label: t('tabs.teams') },
        { name: 'Tasks', icon: <ListChecks size={18} />, label: t('tabs.tasks') },
        { name: 'Admin Panel', icon: <Shield size={18} />, label: t('tabs.adminPanel') },
    ];

    const visibleTabs = isAdmin ? allTabs : allTabs.filter(tab => tab.name !== 'Admin Panel');

    const handleTabClick = React.useCallback((tabName: string) => {
        console.log('Tab clicked:', tabName, 'Current activeTab:', activeTab);
        setActiveTab(tabName);
    }, [activeTab, setActiveTab]);

    return (
        <div className="mt-8 mb-6 animate-slide-in-up" style={{ animationDelay: '600ms' }}>
            <div className="flex justify-center">
                <nav 
                    className={`
                        ios-glass p-1.5 rounded-full flex items-center gap-1 overflow-x-auto max-w-full
                        ${theme === 'light' ? 'bg-white/60' : 'bg-black/40'}
                    `} 
                    aria-label="Tabs"
                    onClick={(e) => e.stopPropagation()}
                >
                    {visibleTabs.map((tab) => {
                        const isActive = activeTab === tab.name;
                        return (
                            <button
                                key={tab.name}
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleTabClick(tab.name);
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className={`
                                    relative px-4 py-2 text-sm font-medium rounded-full transition-all duration-300
                                    flex items-center gap-2
                                    select-none
                                    ${isActive
                                        ? 'text-white shadow-md'
                                        : theme === 'light'
                                            ? 'text-[var(--drip-muted)] hover:text-[var(--drip-text)] hover:bg-[var(--drip-surface)]'
                                            : 'text-neutral-400 hover:text-white hover:bg-white/10'
                                    }
                                `}
                                style={{ 
                                    WebkitTapHighlightColor: 'transparent',
                                    touchAction: 'manipulation'
                                }}
                            >
                                {isActive && (
                                    <div 
                                        className="absolute inset-0 bg-[var(--drip-primary)] rounded-full -z-10 animate-fade-in" 
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
};

export default TabNavigation;
