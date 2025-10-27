import * as React from 'react';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import StatCards from './components/StatCards';
import TabNavigation from './components/TabNavigation';
import CalendarTab from './components/tabs/WeeklyScheduleTab';
import FinancialsTab from './components/tabs/FinancialsTab';
import ChallengesTab from './components/tabs/ChallengesTab';
import ContactsTab from './components/tabs/ContactsTab';
import TasksTab from './components/tabs/TasksTab';
import AdminPanelTab from './components/tabs/AdminPanelTab';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import DetailModal from './components/DetailModal';
import EditModal from './components/EditModal';
import SettingsModal from './components/SettingsModal';
import PasswordChangeModal from './components/PasswordChangeModal';

import { mockData } from './data/mockData';
import { DashboardData, UserRole, DataItem, SignupRequest, ScheduleEvent, FinancialRecord, Challenge, Advantage, Contact, Task, User, UserPermission, AdminSubTab, Theme, NotificationSettings } from './types';
import { useLanguage } from './i18n/LanguageContext';

type ModalType = 'schedule' | 'financials' | 'challenges' | 'advantages' | 'contacts' | 'tasks' | 'users';
type SettingsPanelTab = 'profile' | 'settings' | 'privacy';

function App() {
  const { t } = useLanguage();
  const [userRole, setUserRole] = React.useState<UserRole | null>(null);
  const [dashboardData, setDashboardData] = React.useState<DashboardData>(mockData);
  const [activeTab, setActiveTab] = React.useState<string>('Calendar');
  const [adminPanelSubTab, setAdminPanelSubTab] = React.useState<AdminSubTab>('permissions');
  
  // App-wide settings
  const [theme, setTheme] = React.useState<Theme>('dark');
  const [notificationSettings, setNotificationSettings] = React.useState<NotificationSettings>({
    email: false,
    push: true,
  });

  // Modal States
  const [detailModalItem, setDetailModalItem] = React.useState<{ item: DataItem, type: ModalType } | null>(null);
  const [editModalItem, setEditModalItem] = React.useState<{ item: Partial<DataItem>, type: ModalType, isNew: boolean } | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = React.useState<SettingsPanelTab>('profile');
  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = React.useState(false);
  
  const [financialsDateFilter, setFinancialsDateFilter] = React.useState<'week' | 'month' | null>(null);

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const currentUser = React.useMemo(() => dashboardData.users.find(u => u.role === userRole), [userRole, dashboardData.users]);
  const currentUserPermissions = React.useMemo(() => dashboardData.userPermissions.find(p => p.userId === currentUser?.id)?.permissions, [currentUser, dashboardData.userPermissions]);

  type PermissionableView = keyof NonNullable<UserPermission['permissions']>;

  const canEdit = (view: ModalType): boolean => {
    if (userRole === 'admin') return true;
    if (!currentUserPermissions) return false;
    
    const permissionKey = view as PermissionableView;
    if (currentUserPermissions[permissionKey]) {
        return currentUserPermissions[permissionKey].edit;
    }

    return false;
  };

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
  };

  const handleLogout = () => {
    setUserRole(null);
    setActiveTab('Calendar');
  };

  const handleOpenDetailModal = (item: DataItem, type: ModalType) => {
    setDetailModalItem({ item, type });
  };

  const handleOpenEditModal = (item: Partial<DataItem>, type: ModalType, isNew = false) => {
    setDetailModalItem(null); // Close detail modal if open
    setEditModalItem({ item, type, isNew });
  };
  
  const handleOpenSettings = (tab: SettingsPanelTab) => {
    setSettingsActiveTab(tab);
    setSettingsModalOpen(true);
  }
  
  const handleSaveSettings = (settings: { theme: Theme; notifications: NotificationSettings; }) => {
      setTheme(settings.theme);
      setNotificationSettings(settings.notifications);
  };

  const handleUpdateItem = (updatedItem: DataItem, type: ModalType) => {
    setDashboardData(prevData => {
        const key = type as keyof DashboardData;
        if (!Array.isArray(prevData[key])) return prevData;

        const updatedList = (prevData[key] as DataItem[]).map(item =>
            item.id === updatedItem.id ? updatedItem : item
        );
        return { ...prevData, [key]: updatedList };
    });
    setEditModalItem(null);
  };

  const handleCreateItem = (newItem: Omit<DataItem, 'id'>, type: ModalType) => {
     setDashboardData(prevData => {
        const key = type as keyof DashboardData;
        if (!Array.isArray(prevData[key])) return prevData;

        const createdItem = { ...newItem, id: `${type.slice(0,1)}${Date.now()}` } as DataItem;
        
        const updatedList = [...(prevData[key] as DataItem[]), createdItem];
        return { ...prevData, [key]: updatedList };
    });
    setEditModalItem(null);
  };

  const handleDeleteItem = (itemId: string, type: ModalType) => {
      setDashboardData(prevData => {
        const key = type as keyof DashboardData;
        if (!Array.isArray(prevData[key])) return prevData;

        const updatedList = (prevData[key] as DataItem[]).filter(item => item.id !== itemId);
        return { ...prevData, [key]: updatedList };
    });
    setDetailModalItem(null);
  };
  
  // FIX: Changed `field` type from `keyof DataItem` to `string`.
  // `keyof DataItem` resolves to only keys common to all types in the union (i.e., 'id'), which was too restrictive.
  // Using `string` is more flexible and allows updating any field on any data item type.
  const handleQuickUpdate = (itemId: string, type: ModalType, field: string, value: any) => {
    setDashboardData(prevData => {
      const key = type as keyof DashboardData;
      if (!Array.isArray(prevData[key])) return prevData;

      const updatedList = (prevData[key] as DataItem[]).map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
      return { ...prevData, [key]: updatedList };
    });
  }
  
  const handleApproveSignup = (requestId: string) => {
     setDashboardData(prev => {
        const request = prev.signupRequests.find(r => r.id === requestId);
        if (!request) return prev;

        const newUser: User = {
            id: `u${Date.now()}`,
            name: request.name,
            email: request.email,
            role: 'user' as UserRole,
            lastLogin: new Date().toISOString()
        };
        
        const newPermission = {
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

        const newAuditLog = {
            id: `l${Date.now()}`,
            user: 'Admin User',
            action: 'Approved' as const,
            targetType: 'SignupRequest',
            targetId: requestId,
            timestamp: new Date().toISOString(),
            details: `Approved signup for ${request.name} and created new user.`
        };

        return {
            ...prev,
            users: [...prev.users, newUser],
            userPermissions: [...prev.userPermissions, newPermission],
            signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
            auditLog: [newAuditLog, ...prev.auditLog]
        }
    });
  }

  const handleDenySignup = (requestId: string) => {
      setDashboardData(prev => {
        const request = prev.signupRequests.find(r => r.id === requestId);
        if (!request) return prev;
        
        const newAuditLog = {
            id: `l${Date.now()}`,
            user: 'Admin User',
            action: 'Denied' as const,
            targetType: 'SignupRequest',
            targetId: requestId,
            timestamp: new Date().toISOString(),
            details: `Denied signup request for ${request.name}.`
        };

        return {
            ...prev,
            signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
            auditLog: [newAuditLog, ...prev.auditLog]
        }
    });
  }

  const handleSignupRequest = (signupData: Omit<SignupRequest, 'id' | 'status' | 'timestamp'>) => {
      // For demo, just show an alert. In a real app, this would be an async operation.
      alert(t('signup.requestReceived'));
  };

  const handleViewAuditLog = () => {
    if (userRole === 'admin') {
        setSettingsModalOpen(false);
        setActiveTab('Admin Panel');
        setAdminPanelSubTab('audit');
    }
  };

  const handleExportData = () => {
      if (!currentUser) return;
      const userData = {
          profile: currentUser,
          permissions: currentUserPermissions,
          tasks: dashboardData.tasks.filter(t => t.assignee === currentUser.name),
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(userData, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "dripfy_user_data.json";
      link.click();
      setSettingsModalOpen(false);
  };

  const handleDeleteAccount = () => {
      if (window.confirm(t('settings.privacy.deleteAccountConfirm'))) {
          handleLogout();
      }
  };


  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Calendar':
        return <CalendarTab data={dashboardData.schedule} canEdit={canEdit('schedule')} onOpenModal={handleOpenEditModal as any} />;
      case 'Financials':
        return <FinancialsTab 
                    data={dashboardData.financials} 
                    canEdit={canEdit('financials')}
                    onOpenModal={handleOpenEditModal as any} 
                    onUpdate={(id, field, value) => handleQuickUpdate(id, 'financials', field, value)}
                    dateFilter={financialsDateFilter}
                />;
      case 'Challenges':
        return <ChallengesTab 
                    challenges={dashboardData.challenges} 
                    advantages={dashboardData.advantages}
                    canEditChallenges={canEdit('challenges')}
                    canEditAdvantages={canEdit('advantages')}
                    onOpenModal={handleOpenEditModal as any}
                    onUpdateChallenge={(id, field, value) => handleQuickUpdate(id, 'challenges', field, value)}
                    onUpdateAdvantage={(id, field, value) => handleQuickUpdate(id, 'advantages', field, value)}
                />;
      case 'Contacts':
        return <ContactsTab 
                    data={dashboardData.contacts} 
                    canEdit={canEdit('contacts')}
                    onOpenModal={handleOpenEditModal as any}
                    onUpdate={(id, field, value) => handleQuickUpdate(id, 'contacts', field, value)}
                />;
      case 'Tasks':
        return <TasksTab 
                    data={dashboardData.tasks} 
                    canEdit={canEdit('tasks')}
                    onOpenModal={handleOpenDetailModal as any}
                    onUpdateStatus={(taskId, newStatus) => handleQuickUpdate(taskId, 'tasks', 'status', newStatus)}
                />;
      case 'Admin Panel':
        if (userRole === 'admin') {
            return <AdminPanelTab 
                users={dashboardData.users}
                permissions={dashboardData.userPermissions}
                auditLog={dashboardData.auditLog}
                signupRequests={dashboardData.signupRequests}
                activeSubTab={adminPanelSubTab}
                setActiveSubTab={setAdminPanelSubTab}
                onOpenModal={handleOpenDetailModal as any}
                onApproveSignup={handleApproveSignup}
                onDenySignup={handleDenySignup}
            />;
        }
        return null;
      default:
        return null;
    }
  };
  
  React.useEffect(() => {
    // If user is not admin and on Admin Panel tab, switch to Calendar
    if (userRole !== 'admin' && activeTab === 'Admin Panel') {
      setActiveTab('Calendar');
    }
  }, [userRole, activeTab]);

  if (!userRole) {
    return <LoginPage onLogin={handleLogin} onSignupRequest={handleSignupRequest} />;
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 min-h-screen font-sans">
      <Header 
        userRole={userRole} 
        onLogout={handleLogout} 
        onOpenSettings={handleOpenSettings}
        theme={theme}
        setTheme={setTheme}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold animate-slide-in-up" style={{ animationDelay: '100ms' }}>{t('dashboard.title')}</h1>
        <StatCards setActiveTab={setActiveTab} onPendingPaymentsClick={() => { setActiveTab('Financials'); setFinancialsDateFilter('week'); }} />
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
        
        <div className="mt-8">
            {renderActiveTab()}
        </div>
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Footer />
      </div>

      <Chatbot dataContext={{ ...dashboardData, activeView: activeTab }} />
      
      {detailModalItem && (
        <DetailModal 
            item={detailModalItem.item} 
            type={detailModalItem.type}
            canEdit={canEdit(detailModalItem.type)}
            onClose={() => setDetailModalItem(null)} 
            onEdit={handleOpenEditModal as any}
            onDelete={handleDeleteItem}
        />
      )}

      {editModalItem && (
          <EditModal
              item={editModalItem.item}
              type={editModalItem.type}
              isNew={editModalItem.isNew}
              onClose={() => setEditModalItem(null)}
              onSave={editModalItem.isNew ? handleCreateItem as any : handleUpdateItem as any}
          />
      )}

      <SettingsModal 
        isOpen={settingsModalOpen}
        userRole={userRole}
        onClose={() => setSettingsModalOpen(false)}
        activeTab={settingsActiveTab}
        setActiveTab={setSettingsActiveTab}
        theme={theme}
        notificationSettings={notificationSettings}
        onSaveSettings={handleSaveSettings}
        onChangePasswordClick={() => {
            setSettingsModalOpen(false);
            setPasswordChangeModalOpen(true);
        }}
        onViewAuditLog={handleViewAuditLog}
        onExportData={handleExportData}
        onDeleteAccount={handleDeleteAccount}
      />
      
      <PasswordChangeModal
        isOpen={passwordChangeModalOpen}
        onClose={() => setPasswordChangeModalOpen(false)}
      />

    </div>
  );
}

export default App;