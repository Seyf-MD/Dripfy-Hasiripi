import * as React from 'react';
import LoginPage from './components/LoginPage';
import Header from './components/Header';
import StatCards from './components/StatCards';
import TabNavigation from './components/TabNavigation';
import KnowledgeBase from './components/help/KnowledgeBase';
import KPIBoard from './components/dashboard/KPIBoard';
import CalendarTab from './components/tabs/WeeklyScheduleTab';
import FinancialsTab from './components/tabs/FinancialsTab';
import ChallengesTab from './components/tabs/ChallengesTab';
import ContactsTab from './components/tabs/ContactsTab';
import TasksTab from './components/tabs/TasksTab';
import AdminPanelTab from './components/tabs/AdminPanelTab';
import ApprovalsTab from './components/tabs/ApprovalsTab';
import PersonalPlanner from './components/tasks/PersonalPlanner';
import Chatbot from './components/Chatbot';
import Footer from './components/Footer';
import DetailModal from './components/DetailModal';
import EditModal from './components/EditModal';
import SettingsModal from './components/SettingsModal';
import PasswordChangeModal from './components/PasswordChangeModal';
import LegalPage from './components/LegalPage';
import { LegalPageKey } from './data/legalContent';
import OfflineBanner from './components/layout/OfflineBanner';

import { mockData } from './data/mockData';
import {
  DashboardData,
  DataItem,
  SignupRequest,
  ScheduleEvent,
  FinancialRecord,
  Challenge,
  Advantage,
  Contact,
  Task,
  User,
  UserPermission,
  AdminSubTab,
  NotificationSettings,
  OKRRecord,
  ApprovalFlowSummary,
  ApprovalFlowType,
} from './types';
import { useLanguage } from './i18n/LanguageContext';
import { useTheme } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { finalizeSignup, fetchSignupRequests, resolveSignupRequest, SignupFinalizePayload } from './services/signupService';
import { fetchApprovalFlows, submitApprovalDecision } from './services/approvals';
import { useAuth } from './context/AuthContext';
import { useTour } from './context/TourContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { useOfflineQueue } from './hooks/useOfflineQueue';

type ModalType = 'schedule' | 'financials' | 'challenges' | 'advantages' | 'contacts' | 'tasks' | 'users';
type SettingsPanelTab = 'profile' | 'settings' | 'integrations' | 'privacy';

function App() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user, isAuthenticated, isAdmin, token, logout } = useAuth();
  const { registerPage } = useTour();
  const { isOnline } = useNetworkStatus();
  const [queueState, retryQueue] = useOfflineQueue();
  const [dashboardData, setDashboardData] = React.useState<DashboardData>(mockData);
  const [activeTab, setActiveTab] = React.useState<string>('Calendar');
  const [adminPanelSubTab, setAdminPanelSubTab] = React.useState<AdminSubTab>('permissions');
  const [activeLegalPage, setActiveLegalPage] = React.useState<LegalPageKey | null>(null);
  
  // App-wide settings
  const [notificationSettings, setNotificationSettings] = React.useState<NotificationSettings>({
    email: false,
    push: true,
  });

  React.useEffect(() => {
    if (!isAdmin) {
      return;
    }

    let active = true;
    const loadRequests = async () => {
      try {
        const requests = await fetchSignupRequests(token || undefined);
        if (!active || !Array.isArray(requests)) return;
        setDashboardData(prev => {
          const remoteIds = new Set(requests.map(req => req.id));
          const mappedRequests = requests.map(req => ({
            ...req,
            timestamp: req.timestamp ?? new Date().toISOString(),
          }));
          const localRemainder = prev.signupRequests.filter(req => !remoteIds.has(req.id));
          return {
            ...prev,
            signupRequests: [...mappedRequests, ...localRemainder],
          };
        });
      } catch (error) {
        console.error('Signup requests fetch failed:', error);
      }
    };
    loadRequests();
    return () => {
      active = false;
    };
  }, [isAdmin, token]);

  // Modal States
  const [detailModalItem, setDetailModalItem] = React.useState<{ item: DataItem, type: ModalType } | null>(null);
  const [editModalItem, setEditModalItem] = React.useState<{ item: Partial<DataItem>, type: ModalType, isNew: boolean } | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = React.useState<SettingsPanelTab>('profile');
  const [passwordChangeModalOpen, setPasswordChangeModalOpen] = React.useState(false);
  
  const [financialsDateFilter, setFinancialsDateFilter] = React.useState<'week' | 'month' | null>(null);

  const [approvalFlows, setApprovalFlows] = React.useState<ApprovalFlowSummary[]>([]);
  const [isApprovalsLoading, setIsApprovalsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      return;
    }
    retryQueue().catch((error) => console.error('[App] Offline queue flush failed', error));
  }, [isOnline, retryQueue]);

  const currentUser = React.useMemo(() => {
    if (!user) return null;
    const match = dashboardData.users.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (match) {
      return match;
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin ?? new Date().toISOString(),
      operationalRole: user.role === 'admin' ? 'admin' : 'operations',
      department: user.role === 'admin' ? 'Expansion' : 'Operations',
    } as User;
  }, [user, dashboardData.users]);
  const currentUserPermissions = React.useMemo(
    () => dashboardData.userPermissions.find(p => p.userId === currentUser?.id)?.permissions,
    [currentUser, dashboardData.userPermissions],
  );

  const loadApprovalFlows = React.useCallback(
    async (showSpinner = true) => {
      if (!isAuthenticated) {
        setApprovalFlows([]);
        return;
      }

      if (showSpinner) {
        setIsApprovalsLoading(true);
      }
      try {
        const flows = await fetchApprovalFlows({ token: token || undefined });
        setApprovalFlows(flows);
      } catch (error) {
        console.error('Approval flows fetch failed:', error);
      } finally {
        if (showSpinner) {
          setIsApprovalsLoading(false);
        }
      }
    },
    [isAuthenticated, token],
  );

  React.useEffect(() => {
    loadApprovalFlows().catch(error => console.error('Approval flow load failed:', error));
  }, [loadApprovalFlows]);

  const handleRefreshApprovals = React.useCallback(() => {
    loadApprovalFlows().catch(error => console.error('Approval refresh failed:', error));
  }, [loadApprovalFlows]);

  const handleApprovalDecision = React.useCallback(
    async (flowId: string, stepId: string, decision: 'approved' | 'rejected', comment?: string) => {
      const [flowType, ...rest] = flowId.split(':');
      const entityId = rest.join(':');
      if (!flowType || !entityId) {
        console.error('Approval decision failed: invalid flow identifier', flowId);
        return;
      }

      setIsApprovalsLoading(true);
      try {
        const updatedFlow = await submitApprovalDecision({
          flowType: flowType as ApprovalFlowType,
          entityId,
          stepId,
          payload: { decision, comment },
          token: token || undefined,
        });
        setApprovalFlows(prev => {
          const remaining = prev.filter(item => item.id !== updatedFlow.id);
          return [updatedFlow, ...remaining];
        });
        await loadApprovalFlows(false);
      } catch (error) {
        console.error('Approval decision failed:', error);
        throw error;
      } finally {
        setIsApprovalsLoading(false);
      }
    },
    [token, loadApprovalFlows],
  );

  type PermissionableView = keyof NonNullable<UserPermission['permissions']>;

  const canEdit = (view: ModalType): boolean => {
    if (isAdmin) return true;
    if (!currentUserPermissions) return false;
    
    const permissionKey = view as PermissionableView;
    if (currentUserPermissions[permissionKey]) {
        return currentUserPermissions[permissionKey].edit;
    }

    return false;
  };

  const handleLogout = React.useCallback(() => {
    logout().catch(error => console.error('Logout failed:', error));
    setActiveTab('Calendar');
    setActiveLegalPage(null);
  }, [logout]);

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
  
  const handleSaveSettings = (newNotifications: NotificationSettings) => {
      setNotificationSettings(newNotifications);
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
        lastLogin: new Date().toISOString(),
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
        },
      };

      const newAuditLog = {
        id: `l${Date.now()}`,
        user: user?.name || 'Admin',
        action: 'Approved' as const,
        targetType: 'SignupRequest',
        targetId: requestId,
        timestamp: new Date().toISOString(),
        details: `Approved signup for ${request.name} and created new user.`,
        label: 'signup-approved',
        sourceModule: 'admin',
        criticality: 'medium' as const,
      };

      const newContact: Contact = {
        id: `c${Date.now()}`,
        firstName: request.firstName || request.name,
        lastName: request.lastName || '',
        role: request.position,
        type: 'Individual',
        email: request.email,
        phone: request.phone,
        country: request.country,
      };

      resolveSignupRequest(requestId, token || undefined).catch(error => console.error('Signup request resolve failed:', error));

      return {
        ...prev,
        users: [...prev.users, newUser],
        userPermissions: [...prev.userPermissions, newPermission],
        signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
        contacts: [newContact, ...prev.contacts],
        auditLog: [newAuditLog, ...prev.auditLog],
      };
    });
  }

  const handleDenySignup = (requestId: string) => {
    setDashboardData(prev => {
      const request = prev.signupRequests.find(r => r.id === requestId);
      if (!request) return prev;

      const newAuditLog = {
        id: `l${Date.now()}`,
        user: user?.name || 'Admin',
        action: 'Denied' as const,
        targetType: 'SignupRequest',
        targetId: requestId,
        timestamp: new Date().toISOString(),
        details: `Denied signup request for ${request.name}.`,
        label: 'signup-denied',
        sourceModule: 'admin',
        criticality: 'high' as const,
      };

      resolveSignupRequest(requestId, token || undefined).catch(error => console.error('Signup request resolve failed:', error));

      return {
        ...prev,
        signupRequests: prev.signupRequests.filter(r => r.id !== requestId),
        auditLog: [newAuditLog, ...prev.auditLog],
      };
    });
  }

  const handleSignupRequest = async ({ email, code }: { email: string; code: string }): Promise<SignupRequest> => {
    try {
      const payload: SignupFinalizePayload = await finalizeSignup(email, code);
      const fullName = payload.name?.trim() || `${payload.firstName ?? ''} ${payload.lastName ?? ''}`.trim();

      const normalized: SignupRequest = {
        id: payload.id,
        name: fullName,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        countryCode: payload.countryCode,
        country: payload.country,
        company: payload.company,
        position: payload.position,
        status: 'pending',
        timestamp: payload.timestamp || new Date().toISOString(),
      };

      setDashboardData(prev => {
        const existing = prev.signupRequests.filter(req => req.id !== normalized.id);
        return {
          ...prev,
          signupRequests: [normalized, ...existing],
        };
      });

      return normalized;
    } catch (error) {
      console.error('Signup request failed:', error);
      const fallback = t('signup.requestError');
      if (error instanceof Error) {
        throw new Error(error.message || fallback);
      }
      throw new Error(fallback);
    }
  };

  const handleViewAuditLog = () => {
    if (isAdmin) {
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

  const handleOpenLegalPage = (page: LegalPageKey) => {
    setActiveLegalPage(page);
  };

  const handleCloseLegalPage = () => {
    setActiveLegalPage(null);
  };

  const handleSyncOkrs = React.useCallback((nextOkrs: OKRRecord[]) => {
    setDashboardData(prev => ({
      ...prev,
      okrs: nextOkrs,
    }));
  }, []);


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
      case 'Personal Planner':
        return (
          <PersonalPlanner
            userId={currentUser?.id ?? user?.id ?? null}
            timezone={undefined}
          />
        );
      case 'Approvals':
        return (
          <ApprovalsTab
            flows={approvalFlows}
            onDecision={handleApprovalDecision}
            onRefresh={handleRefreshApprovals}
            currentUserRole={currentUser?.role ?? user?.role ?? null}
            isLoading={isApprovalsLoading}
          />
        );
      case 'Help Center':
        return <KnowledgeBase />;
      case 'Admin Panel':
        if (isAdmin) {
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
                authToken={token}
            />;
        }
        return null;
      default:
        return null;
    }
  };
  
  React.useEffect(() => {
    const pageId = activeTab === 'Help Center' ? 'help-center' : 'dashboard';
    registerPage(pageId);
  }, [activeTab, registerPage]);

  React.useEffect(() => {
    // If user is not admin and on Admin Panel tab, switch to Calendar
    if (!isAdmin && activeTab === 'Admin Panel') {
      setActiveTab('Calendar');
    }
  }, [isAdmin, activeTab]);

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          onSignupRequest={handleSignupRequest}
          onOpenLegal={handleOpenLegalPage}
        />
        {activeLegalPage && (
          <LegalPage page={activeLegalPage} onClose={handleCloseLegalPage} />
        )}
      </>
    );
  }

  const shouldOffsetForBanner = !isOnline || queueState.queueLength > 0;
  const baseContainerClass = `min-h-screen min-h-[100svh] min-h-[100dvh] font-sans w-full ${
    theme === 'light'
      ? 'bg-[var(--drip-surface)] text-[var(--drip-text)]'
      : 'bg-[var(--drip-dark-surface)] text-[var(--drip-dark-text)]'
  } ${shouldOffsetForBanner ? 'pt-24 md:pt-28' : ''}`;

  return (
    <UserProvider user={currentUser}>
      <OfflineBanner
        isOnline={isOnline}
        queueLength={queueState.queueLength}
        lastSyncedAt={queueState.lastSyncedAt}
        onRetry={() => retryQueue().catch((error) => console.error('[App] Manual queue retry failed', error))}
      />
      <div className={baseContainerClass}>
        <div className="isolate w-full">
          <Header
            onLogout={handleLogout}
            onOpenSettings={handleOpenSettings}
          />

          <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
            <StatCards schedule={dashboardData.schedule} contacts={dashboardData.contacts} tasks={dashboardData.tasks} financials={dashboardData.financials} setActiveTab={setActiveTab} onPendingPaymentsClick={() => { setActiveTab('Financials'); setFinancialsDateFilter('week'); }} />
            <KPIBoard initialOkrs={dashboardData.okrs} onOkrsChange={handleSyncOkrs} />
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="mt-8">
                {renderActiveTab()}
            </div>
          </main>

          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <Footer onNavigateLegal={handleOpenLegalPage} />
          </div>
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
          onClose={() => setSettingsModalOpen(false)}
          activeTab={settingsActiveTab}
          setActiveTab={setSettingsActiveTab}
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

        {activeLegalPage && (
          <LegalPage page={activeLegalPage} onClose={handleCloseLegalPage} />
        )}

      </div>
    </UserProvider>
  );
}

export default App;
