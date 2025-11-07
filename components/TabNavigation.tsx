import * as React from 'react';
import { Calendar, CheckCircle2, Euro, ShieldAlert, Users, ListChecks, Shield, CalendarCheck, LifeBuoy, FileBarChart2, Share2, Sparkles, Handshake } from 'lucide-react';
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
    const { isAdmin, isAuthenticated, isExternalStakeholder } = useAuth();

    const translate = (key: string, fallback: string) => {
        const value = t(key);
        return value === key ? fallback : value;
    };

    const allTabs = [
        { name: 'Calendar', icon: <Calendar size={18} />, label: translate('tabs.calendar', 'Takvim') },
        { name: 'Financials', icon: <Euro size={18} />, label: translate('tabs.financials', 'Finansal Durum') },
        { name: 'Challenges', icon: <ShieldAlert size={18} />, label: translate('tabs.challenges', 'Zorluklar') },
        { name: 'Contacts', icon: <Users size={18} />, label: translate('tabs.contacts', 'Kişiler') },
        { name: 'Segments', icon: <Share2 size={18} />, label: translate('tabs.segments', 'Segmentler') },
        { name: 'Insights', icon: <Sparkles size={18} />, label: translate('tabs.insights', 'İçgörüler') },
        { name: 'Tasks', icon: <ListChecks size={18} />, label: translate('tabs.tasks', 'Görevler') },
        { name: 'Personal Planner', icon: <CalendarCheck size={18} />, label: translate('tabs.personalPlanner', 'Kişisel Planlayıcı') },
        { name: 'Approvals', icon: <CheckCircle2 size={18} />, label: translate('tabs.approvals', 'Onaylar') },
        { name: 'Reports', icon: <FileBarChart2 size={18} />, label: translate('tabs.reports', 'Raporlar') },
        { name: 'Help Center', icon: <LifeBuoy size={18} />, label: translate('tabs.helpCenter', 'Yardım Merkezi') },
        { name: 'Stakeholder Portal', icon: <Handshake size={18} />, label: translate('tabs.stakeholderPortal', 'Paydaş Portalı') },
        { name: 'Admin Panel', icon: <Shield size={18} />, label: translate('tabs.adminPanel', 'Yönetici Paneli') },
    ];

    const visibleTabs = allTabs
        .filter(tab => {
        if (tab.name === 'Admin Panel') {
            return isAdmin;
        }
        if (tab.name === 'Approvals') {
            return isAuthenticated;
        }
        if (isExternalStakeholder) {
            return tab.name === 'Stakeholder Portal' || tab.name === 'Help Center';
        }
        return true;
    })
        .filter((tab, index, arr) => arr.findIndex(item => item.name === tab.name) === index);
    
    return (
        <div className="mt-6 animate-slide-in-up" style={{ animationDelay: '600ms' }}>
            <div className="border-b border-slate-200 dark:border-neutral-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto pb-1" aria-label="Tabs" data-tour-target="dashboard-tab-navigation">
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
