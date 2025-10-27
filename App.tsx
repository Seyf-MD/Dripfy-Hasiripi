import React, { useState } from 'react';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import StatCards from './components/StatCards';
import TabNavigation from './components/TabNavigation';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';

import CalendarTab from './components/tabs/WeeklyScheduleTab';
import FinancialsTab from './components/tabs/FinancialsTab';
import ChallengesTab from './components/tabs/ChallengesTab';
import ContactsTab from './components/tabs/ContactsTab';
import TasksTab from './components/tabs/TasksTab';
import AdminPanelTab from './components/tabs/AdminPanelTab';
import DetailModal from './components/DetailModal';

import { mockData } from './data/mockData';
import { UserRole, DataItem, DashboardData, Task, SignupRequest } from './types';
import { useLanguage } from './i18n/LanguageContext';

const App: React.FC = () => {
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [activeTab, setActiveTab] = useState('Tasks');
    const [data, setData] = useState<DashboardData>(mockData);
    const [modalItem, setModalItem] = useState<{item: DataItem | Partial<DataItem>, type: keyof DashboardData, isNew?: boolean} | null>(null);
    const { direction, t } = useLanguage();

    const currentUser = data.users.find(u => u.role === userRole);

    const handleLogin = (role: UserRole) => {
        setUserRole(role);
    };

    const handleOpenModal = (item: DataItem | Partial<DataItem>, type: keyof DashboardData, isNew = false) => {
        setModalItem({ item, type, isNew });
    };

    const handleCloseModal = () => {
        setModalItem(null);
    };

    const addLogEntry = (action: 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Denied', type: string, item: DataItem | SignupRequest, details?: string) => {
        const title = 'title' in item ? item.title : ('name' in item ? item.name : ('description' in item ? item.description : 'item'));
        const defaultDetails = `${t(`auditLogActions.${action}`)} ${t(`dataTypes.${type.slice(0, -1)}`)}: "${title}"`;
        const newLog = {
            id: `l${Date.now()}`,
            user: currentUser?.name || 'System',
            action,
            targetType: type.slice(0,-1),
            targetId: item.id,
            timestamp: new Date().toISOString(),
            details: details || defaultDetails
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
        if (window.confirm(t('confirmDelete'))) {
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
    
    const handleUpdateTaskField = (taskId: string, field: keyof Task, value: any) => {
        let updatedTask: Task | undefined;
        const newTasks = data.tasks.map(task => {
            if (task.id === taskId) {
                updatedTask = { ...task, [field]: value };
                return updatedTask;
            }
            return task;
        });

        if (updatedTask) {
            const details = t('auditLogMessages.updateTask', { title: updatedTask.title, field: String(field), value });
            addLogEntry('Updated', 'tasks', updatedTask, details);
            setData(prev => ({ ...prev, tasks: newTasks }));
        }
    };
    
    const handleSignupRequest = (signupData: Omit<SignupRequest, 'id' | 'status' | 'timestamp'>) => {
        const newRequest: SignupRequest = {
            ...signupData,
            id: `sr${Date.now()}`,
            status: 'pending',
            timestamp: new Date().toISOString(),
        };
        setData(prev => ({ ...prev, signupRequests: [...prev.signupRequests, newRequest] }));
        addLogEntry('Created', 'signupRequests', newRequest, t('auditLogMessages.newSignup', { name: newRequest.name }));
        alert(t('signup.requestReceived'));
    };

    const handleApproveSignup = (requestId: string) => {
        const request = data.signupRequests.find(r => r.id === requestId);
        if (!request) return;

        const newUser = {
            id: `u${Date.now()}`,
            name: request.name,
            email: request.email,
            role: 'user' as UserRole,
            lastLogin: new Date().toISOString(),
        };

        const newUserPermission = {
            userId: newUser.id,
            userName: newUser.name,
            permissions: {
                schedule: { view: true, edit: false },
                financials: { view: true, edit: false },
                challenges: { view: true, edit: false },
                advantages: { view: true, edit: false },
                contacts: { view: true, edit: false },
                tasks: { view: true, edit: true },
            }
        };
        
        setData(prev => ({
            ...prev,
            users: [...prev.users, newUser],
            userPermissions: [...prev.userPermissions, newUserPermission],
            signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
        }));
        
        addLogEntry('Approved', 'signupRequests', request, t('auditLogMessages.approvedSignup', { name: request.name }));
    };

    const handleDenySignup = (requestId: string) => {
        const request = data.signupRequests.find(r => r.id === requestId);
        if (!request) return;

        setData(prev => ({
            ...prev,
            signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
        }));
        addLogEntry('Denied', 'signupRequests', request, t('auditLogMessages.deniedSignup', { name: request.name }));
    };


    const getDataContextForAI = () => {
        return {
            activeView: activeTab,
            dashboardData: data
        };
    };

    if (!userRole) {
        return <LoginPage onLogin={handleLogin} onSignupRequest={handleSignupRequest} />;
    }

    const renderActiveTab = () => {
        const commonProps = { userRole, onOpenModal: handleOpenModal };
        switch (activeTab) {
            case 'Calendar':
                return <CalendarTab data={data.schedule} {...commonProps} />;
            case 'Financials':
                return <FinancialsTab data={data.financials} {...commonProps} />;
            case 'Challenges':
                return <ChallengesTab challenges={data.challenges} advantages={data.advantages} {...commonProps} />;
            case 'Contacts':
                return <ContactsTab data={data.contacts} {...commonProps} />;
            case 'Tasks':
                return <TasksTab 
                    data={data.tasks} 
                    {...commonProps} 
                    onUpdateTask={handleUpdateTaskField}
                    permissions={data.userPermissions}
                />;
            case 'Admin Panel':
                return userRole === 'admin' ? (
                     <AdminPanelTab
                        users={data.users}
                        permissions={data.userPermissions}
                        auditLog={data.auditLog}
                        signupRequests={data.signupRequests}
                        onOpenModal={(item: any, type: 'users') => handleOpenModal(item, type)}
                        onApproveSignup={handleApproveSignup}
                        onDenySignup={handleDenySignup}
                    />
                 ) : null;
            default:
                return null;
        }
    };

    return (
        <div dir={direction} className="bg-neutral-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <Header />
                <main className="mt-8">
                    <StatCards setActiveTab={setActiveTab} />
                    <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
                    <div className="mt-6">
                        {renderActiveTab()}
                    </div>
                </main>
                <Footer />
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
                    permissions={data.userPermissions}
                />
            )}
        </div>
    );
};

export default App;