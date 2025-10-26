// FIX: Implemented the TabNavigation component to provide navigation between dashboard sections.
import React from 'react';
import { Calendar, Euro, ShieldAlert, Users, ListChecks, Shield } from 'lucide-react';

const tabs = [
    { name: 'Weekly Schedule', icon: <Calendar size={18} /> },
    { name: 'Financials', icon: <Euro size={18} /> },
    { name: 'Challenges', icon: <ShieldAlert size={18} /> },
    { name: 'Contacts', icon: <Users size={18} /> },
    { name: 'Tasks', icon: <ListChecks size={18} /> },
    { name: 'Admin Panel', icon: <Shield size={18} /> },
];

interface TabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab }) => {
    return (
        <div className="mt-6 animate-slide-in-up" style={{ animationDelay: '600ms' }}>
            <div className="border-b border-neutral-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`
                                ${activeTab === tab.name
                                    ? 'border-[#32ff84] text-[#32ff84]'
                                    : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-500'
                                }
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                            `}
                        >
                            {tab.icon}
                            {tab.name}
                        </button>
                    ))}
                </nav>
            </div>
        </div>
    );
};

export default TabNavigation;
