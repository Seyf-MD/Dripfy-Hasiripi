import * as React from 'react';
import { User, UserPermission, AuditLogEntry, SignupRequest, AdminSubTab } from '../../types';
import { ShieldCheck, Edit2, Clock, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface AdminPanelTabProps {
    users: User[];
    permissions: UserPermission[];
    auditLog: AuditLogEntry[];
    signupRequests: SignupRequest[];
    activeSubTab: AdminSubTab;
    setActiveSubTab: (tab: AdminSubTab) => void;
    onOpenModal: (item: User, type: 'users') => void;
    onApproveSignup: (requestId: string) => void;
    onDenySignup: (requestId: string) => void;
}

const AdminPanelTab: React.FC<AdminPanelTabProps> = ({ users, permissions, auditLog, signupRequests, activeSubTab, setActiveSubTab, onOpenModal, onApproveSignup, onDenySignup }) => {
    const { t } = useLanguage();
    
    const subTabs: { id: AdminSubTab, label: string, icon: React.ReactNode, count?: number }[] = [
        { id: 'permissions', label: t('admin.userPermissions'), icon: <ShieldCheck size={18} /> },
        { id: 'audit', label: t('admin.auditLog'), icon: <Clock size={18} /> },
        { id: 'requests', label: t('admin.signupRequests'), icon: <UserPlus size={18} />, count: signupRequests.length },
    ]

    const renderContent = () => {
        switch(activeSubTab) {
            case 'permissions':
                return (
                     <div className="space-y-4">
                        {users.map(user => (
                            <div key={user.id} onClick={() => onOpenModal(user, 'users')} className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-slate-200 dark:border-neutral-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-700/50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-black dark:text-white">{user.name}</h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{user.email}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${user.role === 'admin' ? 'bg-green-500/20 text-[#32ff84]' : 'bg-slate-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'}`}>
                                    {user.role === 'admin' ? <ShieldCheck size={14} className="mx-1.5"/> : <Edit2 size={14} className="mx-1.5"/>} {t(`userRoles.${user.role}`)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'audit':
                return (
                    <div className="space-y-3 bg-slate-100 dark:bg-neutral-800/50 p-4 rounded-lg border border-slate-200 dark:border-neutral-700 max-h-[60vh] overflow-y-auto">
                        {auditLog.map(log => (
                            <div key={log.id} className="text-sm p-3 bg-white dark:bg-neutral-800 rounded-md">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-black dark:text-white">
                                        <span className={`font-bold ${
                                            log.action === 'Created' || log.action === 'Approved' ? 'text-green-500 dark:text-green-400' :
                                            log.action === 'Updated' ? 'text-yellow-500 dark:text-yellow-400' :
                                            'text-red-500 dark:text-red-400'
                                        }`}>{t(`auditLogActions.${log.action}`)}</span> {t(`dataTypes.${log.targetType}`)}
                                    </p>
                                    <p className="text-xs text-neutral-400 dark:text-neutral-500">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                                <p className="text-neutral-600 dark:text-neutral-400 mt-1 break-words">{log.details}</p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">{t('admin.by')} {log.user}</p>
                            </div>
                        ))}
                    </div>
                );
            case 'requests':
                return (
                    <div className="space-y-4">
                        {signupRequests.length > 0 ? signupRequests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-slate-200 dark:border-neutral-700">
                                <div className="flex flex-wrap justify-between items-start gap-4">
                                    <div>
                                        <h3 className="font-semibold text-black dark:text-white">{req.name}</h3>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{req.email}</p>
                                        <p className="text-sm text-neutral-400 dark:text-neutral-500">{req.phone} &bull; {t(`positions.${req.position.replace(/ /g, '')}`)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => onDenySignup(req.id)} className="p-2 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors"><XCircle size={20}/></button>
                                        <button onClick={() => onApproveSignup(req.id)} className="p-2 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 dark:text-green-400 transition-colors"><CheckCircle size={20}/></button>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">{t('admin.noRequests')}</p>}
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="animate-fade-in flex flex-col lg:flex-row gap-8">
            <aside className="lg:w-1/4">
                <nav className="flex flex-row lg:flex-col gap-2">
                    {subTabs.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-semibold transition-colors ${activeSubTab === tab.id ? 'bg-[#32ff84] text-black' : 'bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700'}`}
                        >
                            <div className="flex items-center gap-3">
                                {tab.icon}
                                <span>{tab.label}</span>
                            </div>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${activeSubTab === tab.id ? 'bg-black/20' : 'bg-[#32ff84] text-black'}`}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1">
                {renderContent()}
            </main>
        </div>
    );
};

export default AdminPanelTab;