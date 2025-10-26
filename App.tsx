import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import StatCards from './components/StatCards';
import TabNavigation from './components/TabNavigation';
import Chatbot from './components/Chatbot';

import WeeklyScheduleTab from './components/tabs/WeeklyScheduleTab';
import FinancialsTab from './components/tabs/FinancialsTab';
import ChallengesTab from './components/tabs/ChallengesTab';
import ContactsTab from './components/tabs/ContactsTab';
import TasksTab from './components/tabs/TasksTab';
import AdminPanelTab from './components/tabs/AdminPanelTab';
import DetailModal from './components/DetailModal';

import { mockData } from './data/mockData';
import { UserRole, DataItem, DashboardData } from './types';

const App: React.FC = () => {
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [activeTab, setActiveTab] = useState('Tasks');
    const [data, setData] = useState<DashboardData>(mockData);
    const [modalItem, setModalItem] = useState<{item: DataItem | Partial<DataItem>, type: keyof DashboardData, isNew?: boolean} | null>(null);

    const handleLogin = (role: UserRole) => {
        setUserRole(role);
    };

    const handleOpenModal = (item: DataItem | Partial<DataItem>, type: keyof DashboardData, isNew = false) => {
        setModalItem({ item, type, isNew });
    };

    const handleCloseModal = () => {
        setModalItem(null);
    };

    const addLogEntry = (action: 'Created' | 'Updated' | 'Deleted', type: string, item: DataItem) => {
        const title = 'title' in item ? item.title : ('name' in item ? item.name : ('description' in item ? item.description : 'item'));
        const newLog = {
            id: `l${Date.now()}`,
            user: 'Admin User',
            action,
            targetType: type.slice(0,-1),
            targetId: item.id,
            timestamp: new Date().toISOString(),
            details: `${action} ${type.slice(0, -1)}: "${title}"`
        };
        setData(prev => ({...prev, auditLog: [newLog, ...prev.auditLog]}))
    }

    const handleSave = (itemToSave: DataItem) => {
        if (!modalItem) return;
        const { type, isNew } = modalItem;
        
        if (isNew) {
            const newItem = { ...itemToSave, id: `${type.slice(0,1)}${Date.now()}`};
            const items = data[type] as DataItem[];
            setData(prev => ({ ...prev, [type]: [...items, newItem] }));
            addLogEntry('Created', type, newItem);
        } else {
            const items = data[type] as DataItem[];
            setData(prev => ({
                ...prev,
                [type]: items.map(item => item.id === itemToSave.id ? itemToSave : item)
            }));
            addLogEntry('Updated', type, itemToSave);
        }

        handleCloseModal();
    };

    const handleDelete = (itemToDelete: DataItem) => {
        if (!modalItem) return;
        if (window.confirm("Are you sure you want to delete this item?")) {
            const { type } = modalItem;
            const items = data[type] as DataItem[];
            setData(prev => ({
                ...prev,
                [type]: items.filter(item => item.id !== itemToDelete.id)
            }));
            addLogEntry('Deleted', type, itemToDelete);
            handleCloseModal();
        }
    };
    
    const getDataContextForAI = () => {
        return {
            activeView: activeTab,
            dashboardData: data
        };
    };

    if (!userRole) {
        return <LoginPage onLogin={handleLogin} />;
    }

    const renderActiveTab = () => {
        const commonProps = { userRole, onOpenModal: handleOpenModal };
        switch (activeTab) {
            case 'Weekly Schedule':
                return <WeeklyScheduleTab data={data.schedule} {...commonProps} />;
            case 'Financials':
                return <FinancialsTab data={data.financials} {...commonProps} />;
            case 'Challenges':
                return <ChallengesTab challenges={data.challenges} advantages={data.advantages} {...commonProps} />;
            case 'Contacts':
                return <ContactsTab data={data.contacts} {...commonProps} />;
            case 'Tasks':
                return <TasksTab data={data.tasks} {...commonProps} />;
            case 'Admin Panel':
                return userRole === 'admin' ? <AdminPanelTab users={data.users} permissions={data.userPermissions} auditLog={data.auditLog} onOpenModal={(item, type) => handleOpenModal(item, type)} /> : null;
            default:
                return null;
        }
    };

    return (
        <div className="bg-neutral-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <Header />
                <main className="mt-8">
                    <StatCards setActiveTab={setActiveTab} />
                    <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
                    <div className="mt-6">
                        {renderActiveTab()}
                    </div>
                </main>
                <Chatbot dataContext={getDataContextForAI()} />
            </div>
            {modalItem && (
                 <DetailModal
                    key={modalItem.item.id || 'new'}
                    modalState={modalItem}
                    isOpen={!!modalItem}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    userRole={userRole}
                />
            )}
        </div>
    );
};

export default App;