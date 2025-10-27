import React from 'react';
import { useState } from 'react';
import { mockData } from './data/mockData';
import { DashboardData, DataItem, SignupRequest, UserRole, Task } from './types';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import StatCards from './components/StatCards';
import TabNavigation from './components/TabNavigation';
import WeeklyScheduleTab from './components/tabs/WeeklyScheduleTab';
import FinancialsTab from './components/tabs/FinancialsTab';
import ChallengesTab from './components/tabs/ChallengesTab';
import ContactsTab from './components/tabs/ContactsTab';
import TasksTab from './components/tabs/TasksTab';
import AdminPanelTab from './components/tabs/AdminPanelTab';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import DetailModal from './components/DetailModal';
import SettingsModal from './components/SettingsModal';

type SettingsTab = 'profile' | 'settings' | 'privacy';

const App: React.FC = () => {
    const [data, setData] = useState<DashboardData>(mockData);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [activeTab, setActiveTab] = useState('Calendar');
    const [modalState, setModalState] = useState<{
        item: DataItem | Partial<DataItem>;
        type: keyof DashboardData;
        isNew?: boolean;
    } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('profile');

    const handleLogin = (role: UserRole) => {
        setUserRole(role);
    };

    const handleLogout = () => {
        setUserRole(null);
    };
    
    const handleOpenSettingsModal = (tab: SettingsTab) => {
        setSettingsInitialTab(tab);
        setIsSettingsOpen(true);
    };

    const handleOpenModal = (item: DataItem | Partial<DataItem>, type: keyof DashboardData, isNew = false) => {
        setModalState({ item, type, isNew });
    };

    const handleCloseModal = () => {
        setModalState(null);
    };

    const handleSaveItem = (item: DataItem) => {
        if (!modalState) return;
        const { type, isNew } = modalState;

        setData(prevData => {
            const currentTypedArray = prevData[type] as DataItem[];
            let newTypedArray: DataItem[];

            if (isNew) {
                // Add new item with a generated ID
                const newItem = { ...item, id: `${type.slice(0, 1)}${Date.now()}` };
                newTypedArray = [...currentTypedArray, newItem];
            } else {
                // Update existing item
                newTypedArray = currentTypedArray.map(i => (i.id === item.id ? item : i));
            }

            return {
                ...prevData,
                [type]: newTypedArray,
            };
        });

        handleCloseModal();
    };
    
    const handleDeleteItem = (item: DataItem) => {
        if (!modalState) return;
        const { type } = modalState;

        setData(prevData => {
            const currentTypedArray = prevData[type] as DataItem[];
            const newTypedArray = currentTypedArray.filter(i => i.id !== item.id);
            return {
                ...prevData,
                [type]: newTypedArray,
            };
        });
        
        handleCloseModal();
    };

    const handleUpdateTask = (taskId: string, field: keyof Task, value: any) => {
        setData(prevData => {
            const newTasks = prevData.tasks.map(task => 
                task.id === taskId ? { ...task, [field]: value } : task
            );
            return { ...prevData, tasks: newTasks };
        });
    };
    
    const handleSignupRequest = (signupData: Omit<SignupRequest, 'id' | 'status' | 'timestamp'>) => {
        const newRequest: SignupRequest = {
            ...signupData,
            id: `sr${Date.now()}`,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        setData(prev => ({...prev, signupRequests: [...prev.signupRequests, newRequest]}));
        // Optionally show a confirmation message to the user
    };
    
    const handleApproveSignup = (requestId: string) => {
        const request = data.signupRequests.find(r => r.id === requestId);
        if (!request) return;

        const newUser = {
            id: `u${Date.now()}`,
            name: request.name,
            email: request.email,
            role: 'user' as const,
            lastLogin: new Date().toISOString()
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
              tasks: { view: true, edit: false },
            }
        };

        setData(prev => ({
            ...prev,
            users: [...prev.users, newUser],
            userPermissions: [...prev.userPermissions, newUserPermission],
            signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
            auditLog: [...prev.auditLog, {
                id: `l${Date.now()}`,
                user: 'Admin User',
                action: 'Approved',
                targetType: 'SignupRequest',
                targetId: requestId,
                timestamp: new Date().toISOString(),
                details: `Approved signup for ${request.name}`
            }]
        }));
    };
    
    const handleDenySignup = (requestId: string) => {
         const request = data.signupRequests.find(r => r.id === requestId);
         if (!request) return;
        setData(prev => ({
            ...prev,
            signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
            auditLog: [...prev.auditLog, {
                id: `l${Date.now()}`,
                user: 'Admin User',
                action: 'Denied',
                targetType: 'SignupRequest',
                targetId: requestId,
                timestamp: new Date().toISOString(),
                details: `Denied signup for ${request.name}`
            }]
        }));
    };

    if (!userRole) {
        return <LoginPage onLogin={handleLogin} onSignupRequest={handleSignupRequest} />;
    }

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'Calendar':
                return <WeeklyScheduleTab data={data.schedule} userRole={userRole} onOpenModal={(item, type, isNew) => handleOpenModal(item, type, isNew)} />;
            case 'Financials':
                return <FinancialsTab data={data.financials} userRole={userRole} onOpenModal={(item, type, isNew) => handleOpenModal(item, type, isNew)} />;
            case 'Challenges':
                return <ChallengesTab challenges={data.challenges} advantages={data.advantages} userRole={userRole} onOpenModal={(item, type, isNew) => handleOpenModal(item, type, isNew)} />;
            case 'Contacts':
                return <ContactsTab data={data.contacts} userRole={userRole} onOpenModal={(item, type, isNew) => handleOpenModal(item, type, isNew)} />;
            case 'Tasks':
                return <TasksTab data={data.tasks} userRole={userRole} onOpenModal={(item, type, isNew) => handleOpenModal(item, type, isNew)} onUpdateTask={handleUpdateTask} permissions={data.userPermissions} />;
            case 'Admin Panel':
                return userRole === 'admin' ? <AdminPanelTab users={data.users} permissions={data.userPermissions} auditLog={data.auditLog} signupRequests={data.signupRequests} onOpenModal={(item, type) => handleOpenModal(item, type)} onApproveSignup={handleApproveSignup} onDenySignup={handleDenySignup} /> : null;
            default:
                return null;
        }
    };
    
    const dataContext = { activeView: activeTab, ...data };

    return (
        <div className="bg-neutral-900 text-white min-h-screen font-sans">
            <Header userRole={userRole} onLogout={handleLogout} onOpenSettings={handleOpenSettingsModal} />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <StatCards setActiveTab={setActiveTab} />
                <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
                <div className="mt-8">
                    {renderActiveTab()}
                </div>
            </main>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Footer />
            </div>
            <Chatbot dataContext={dataContext} />
            <DetailModal
                isOpen={!!modalState}
                modalState={modalState}
                onClose={handleCloseModal}
                onSave={handleSaveItem}
                onDelete={handleDeleteItem}
                userRole={userRole}
                permissions={data.userPermissions}
            />
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                activeTab={settingsInitialTab}
                setActiveTab={setSettingsInitialTab}
            />
        </div>
    );
};

export default App;