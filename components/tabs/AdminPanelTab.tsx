import React, { useState } from 'react';
import { User, UserPermission, AuditLogEntry, SignupRequest } from '../../types';
import { ShieldCheck, Edit2, Clock, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface AdminPanelTabProps {
    users: User[];
    permissions: UserPermission[];
    auditLog: AuditLogEntry[];
    signupRequests: SignupRequest[];
    onOpenModal: (item: User, type: 'users') => void;
    onApproveSignup: (requestId: string) => void;
    onDenySignup: (requestId: string) => void;
}

type AdminSubTab = 'permissions' | 'audit' | 'requests';

const AdminPanelTab: React.FC<AdminPanelTabProps> = ({ users, permissions, auditLog, signupRequests, onOpenModal, onApproveSignup, onDenySignup }) => {
    const { t } = useLanguage();
    const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>('permissions');
    
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
                            <div key={user.id} onClick={() => onOpenModal(user, 'users')} className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 cursor-pointer hover:bg-neutral-700/50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-semibold text-white">{user.name}</h3>
                                        <p className="text-sm text-neutral-400">{user.email}</p>
                                    </div>
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${user.role === 'admin' ? 'bg-green-500/20 text-[#32ff84]' : 'bg-neutral-700 text-neutral-300'}`}>
                                    {user.role === 'admin' ? <ShieldCheck size={14} className="mx-1.5"/> : <Edit2 size={14} className="mx-1.5"/>} {t(`userRoles.${user.role}`)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'audit':
                return (
                    <div className="space-y-3 bg-neutral-800/50 p-4 rounded-lg border border-neutral-700 max-h-[60vh] overflow-y-auto">
                        {auditLog.map(log => (
                            <div key={log.id} className="text-sm p-3 bg-neutral-800 rounded-md">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-white">
                                        <span className={`font-bold ${
                                            log.action === 'Created' ? 'text-green-400' :
                                            log.action === 'Updated' ? 'text-yellow-400' : 
                                            log.action === 'Approved' ? 'text-green-400' :
                                            log.action === 'Denied' ? 'text-red-400' : 'text-red-400'
                                        }`}>{t(`auditLogActions.${log.action}`)}</span> {t(`dataTypes.${log.targetType}`)}
                                    </p>
                                    <p className="text-xs text-neutral-500">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                                <p className="text-neutral-400 mt-1 break-words">{log.details}</p>
                                <p className="text-xs text-neutral-500 mt-1">{t('admin.by')} {log.user}</p>
                            </div>
                        ))}
                    </div>
                );
            case 'requests':
                return (
                    <div className="space-y-4">
                        {signupRequests.length > 0 ? signupRequests.map(req => (
                            <div key={req.id} className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                                <div className="flex flex-wrap justify-between items-start gap-4">
                                    <div>
                                        <h3 className="font-semibold text-white">{req.name}</h3>
                                        <p className="text-sm text-neutral-400">{req.email}</p>
                                        <p className="text-sm text-neutral-500">{req.phone} &bull; {t(`positions.${req.position.replace(/ /g, '')}`)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => onApproveSignup(req.id)} className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-300 text-xs font-semibold rounded-md hover:bg-green-500/20 transition-colors">
                                            <CheckCircle size={14}/> {t('admin.approve')}
                                        </button>
                                        <button onClick={() => onDenySignup(req.id)} className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-300 text-xs font-semibold rounded-md hover:bg-red-500/20 transition-colors">
                                            <XCircle size={14}/> {t('admin.deny')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-neutral-500 text-center py-4">{t('admin.noRequests')}</p>}
                    </div>
                )
        }
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6 border-b border-neutral-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Admin Tabs">
                    {subTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeSubTab === tab.id
                                    ? 'border-[#32ff84] text-[#32ff84]'
                                    : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-500'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{tab.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
            
            {renderContent()}
        </div>
    );
};

export default AdminPanelTab;