import * as React from 'react';
import { User, UserPermission, AuditLogEntry, SignupRequest, AdminSubTab } from '../../types';
import { ShieldCheck, Edit2, Clock, UserPlus, CheckCircle, XCircle, Archive, Download, RotateCcw, Plus, Database } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import InviteUserModal from '../InviteUserModal';

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
    const [showInviteModal, setShowInviteModal] = React.useState(false);
    const [backups, setBackups] = React.useState<any[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = React.useState(false);
    const [notification, setNotification] = React.useState<{ type: 'success' | 'error', message: string } | null>(null);

    React.useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const subTabs: { id: AdminSubTab, label: string, icon: React.ReactNode, count?: number }[] = [
        { id: 'permissions', label: t('admin.userPermissions'), icon: <ShieldCheck size={18} /> },
        { id: 'audit', label: t('admin.auditLog'), icon: <Clock size={18} /> },
        { id: 'requests', label: t('admin.signupRequests'), icon: <UserPlus size={18} />, count: signupRequests.length },
        { id: 'backups', label: t('admin.backups'), icon: <Database size={18} /> },
    ];

    React.useEffect(() => {
        if (activeSubTab === 'backups') {
            fetchBackups();
        }
    }, [activeSubTab]);

    const fetchBackups = async () => {
        setIsLoadingBackups(true);
        try {
            const res = await fetch('/api/admin/backups');
            const data = await res.json();
            if (data.ok) {
                setBackups(data.backups);
            }
        } catch (error) {
            console.error('Failed to fetch backups', error);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            const res = await fetch('/api/admin/backups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Manual backup from Admin Panel' })
            });
            const data = await res.json();
            if (data.ok) {
                alert(t('admin.backupCreated'));
                fetchBackups();
            }
        } catch (error) {
            console.error('Failed to create backup', error);
        }
    };

    const handleRestoreBackup = async (id: string) => {
        if (!window.confirm(t('admin.restoreConfirm'))) return;
        try {
            const res = await fetch(`/api/admin/backups/${id}/restore`, { method: 'POST' });
            const data = await res.json();
            if (data.ok) {
                alert(t('admin.backupRestored'));
                window.location.reload(); // Reload to reflect data changes
            }
        } catch (error) {
            console.error('Failed to restore backup', error);
        }
    };

    const handleInviteUser = async (data: any) => {
        const res = await fetch('/api/admin/users/invite/index.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error);
        setNotification({ type: 'success', message: 'User invited successfully' });
        // Don't reload immediately so user sees message
        setTimeout(() => window.location.reload(), 2000);
    };

    const handleDownloadAllData = async () => {
        const collections = ['users', 'people', 'financials', 'tasks', 'calendar', 'challenges', 'advantages'];
        for (const name of collections) {
            try {
                const res = await fetch(`/api/admin/collections/${name}/export`);
                const json = await res.json();
                if (json.ok) {
                    const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${name}_${new Date().toISOString().slice(0, 10)}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            } catch (err) {
                console.error(`Failed to download ${name}`, err);
            }
        }
    };

    const renderContent = () => {
        switch (activeSubTab) {
            case 'permissions':
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                            <div>
                                <h3 className="text-lg font-bold text-[var(--drip-text)] dark:text-white">{t('admin.userPermissions')}</h3>
                                <p className="text-xs text-[var(--drip-muted)] opacity-70">Manage user access and roles</p>
                            </div>
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white rounded-xl text-sm font-bold shadow-lg hover:bg-[#3d8b6f] transition-all active:scale-95"
                            >
                                <UserPlus size={16} />
                                {t('admin.inviteUser')}
                            </button>
                        </div>
                        {users.map(user => (
                            <div key={user.id} onClick={() => onOpenModal(user, 'users')}
                                className="ios-card bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/60 dark:hover:bg-white/10 transition-all shadow-sm group hover:-translate-y-0.5"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${user.role === 'admin' ? 'bg-[var(--drip-primary)]/20 text-[var(--drip-primary)]' : 'bg-slate-200 dark:bg-neutral-700 text-slate-500'}`}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--drip-text)] dark:text-white capitalize">{user.name}</h3>
                                            <p className="text-sm text-[var(--drip-muted)]/80 dark:text-neutral-400">{user.email}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-[rgba(75,165,134,0.15)] text-[var(--drip-primary)] border border-[var(--drip-primary)]/20' : 'bg-slate-100 dark:bg-neutral-700/50 text-slate-500 border border-slate-200 dark:border-neutral-700'}`}>
                                        {user.role === 'admin' ? <ShieldCheck size={14} className="mx-1.5" /> : <Edit2 size={14} className="mx-1.5" />} {t(`userRoles.${user.role}`)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'audit':
                return (
                    <div className="space-y-3 bg-white/5 dark:bg-neutral-800/20 p-4 rounded-3xl border border-white/10 max-h-[60vh] overflow-y-auto scrollbar-hide">
                        {auditLog.map(log => (
                            <div key={log.id} className="text-sm p-4 bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm rounded-2xl border border-white/5 hover:bg-white/60 dark:hover:bg-neutral-800/60 transition-colors">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-[var(--drip-text)] dark:text-white flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${log.action === 'Created' || log.action === 'Approved' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                            log.action === 'Updated' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
                                                'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                                            }`} />
                                        <span>{t(`auditLogActions.${log.action}`)}</span>
                                        <span className="opacity-50">•</span>
                                        <span className="opacity-80 font-normal">{t(`dataTypes.${log.targetType}`)}</span>
                                    </p>
                                    <p className="text-xs text-[var(--drip-muted)]/60 dark:text-neutral-500 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                                <p className="text-[var(--drip-muted)] dark:text-neutral-300 break-words leading-relaxed pl-4 border-l-2 border-white/10">{log.details}</p>
                                <p className="text-xs text-[var(--drip-muted)]/50 dark:text-neutral-600 mt-3 text-right font-medium italic">{t('admin.by')} {log.user}</p>
                            </div>
                        ))}
                    </div>
                );
            case 'requests':
                return (
                    <div className="space-y-4">
                        {signupRequests.length > 0 ? signupRequests.map(req => (
                            <div key={req.id} className="ios-card bg-white/40 dark:bg-neutral-800/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-wrap justify-between items-start gap-4 hover:shadow-lg transition-all">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-bold text-lg text-[var(--drip-text)] dark:text-white">{req.name}</h3>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-xs font-bold uppercase">{t(`positions.${req.position.replace(/ /g, '')}`)}</span>
                                    </div>
                                    <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 font-medium">{req.email}</p>
                                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-[var(--drip-muted)]/70 dark:text-neutral-500 font-medium">
                                        <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">{req.phone}</span>
                                        {req.country && <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">{req.country}</span>}
                                        {req.company && <span className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">{req.company}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <button onClick={() => onDenySignup(req.id)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-all hover:scale-110 active:scale-95"><XCircle size={22} /></button>
                                    <button onClick={() => onApproveSignup(req.id)} className="p-2.5 rounded-xl bg-[var(--drip-primary)]/10 hover:bg-[var(--drip-primary)]/20 text-[var(--drip-primary)] transition-all hover:scale-110 active:scale-95"><CheckCircle size={22} /></button>
                                </div>
                            </div>
                        )) : <div className="flex flex-col items-center justify-center py-12 text-[var(--drip-muted)]/40"><UserPlus size={48} className="mb-4 opacity-50" /><p>{t('admin.noRequests')}</p></div>}
                    </div>
                );
            case 'backups':
                return (
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-[var(--drip-primary)]/10 to-transparent p-6 rounded-3xl border border-[var(--drip-primary)]/20 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                            <div>
                                <h3 className="text-xl font-bold text-[var(--drip-text)] dark:text-white mb-2">{t('admin.backups')} & Data</h3>
                                <p className="text-sm text-[var(--drip-muted)] max-w-md">Create backups of your system data or download raw JSON files for manual safekeeping.</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDownloadAllData}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[var(--drip-text)] dark:text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
                                >
                                    <Download size={16} /> {t('admin.downloadData')}
                                </button>
                                <button
                                    onClick={handleCreateBackup}
                                    className="px-4 py-2 bg-[var(--drip-primary)] hover:bg-[#3d8b6f] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                                >
                                    <Plus size={16} /> {t('admin.createBackup')}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {isLoadingBackups ? (
                                <div className="text-center py-10 opacity-50">Loading backups...</div>
                            ) : backups.length === 0 ? (
                                <div className="text-center py-10 opacity-50">No backups found.</div>
                            ) : (
                                backups.map((backup: any) => (
                                    <div key={backup.id} className="ios-card bg-white/40 dark:bg-neutral-800/40 p-4 rounded-2xl border border-white/10 flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                                <Archive size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-[var(--drip-text)] dark:text-white">{backup.reason || 'Manual Backup'}</h4>
                                                <p className="text-xs text-[var(--drip-muted)] opacity-70 font-mono">{new Date(backup.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRestoreBackup(backup.id)}
                                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <RotateCcw size={14} /> {t('admin.restoreBackup')}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }

    return (
        <div className="animate-fade-in flex flex-col lg:flex-row gap-8 relative">
            {notification && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 animate-fade-in-up ${notification.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-300'
                        : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-300'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
                        <XCircle size={16} />
                    </button>
                </div>
            )}
            <aside className="lg:w-1/4">
                <nav className="flex flex-row lg:flex-col gap-3 sticky top-24">
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-bold transition-all duration-300 border ${activeSubTab === tab.id ? 'bg-[var(--drip-primary)] text-white shadow-lg border-[var(--drip-primary)] translate-x-1' : 'bg-white/40 dark:bg-neutral-800/40 hover:bg-white/60 dark:hover:bg-neutral-800/60 border-white/10 hover:border-white/20 text-[var(--drip-muted)] dark:text-neutral-400'}`}
                        >
                            <div className="flex items-center gap-3">
                                {tab.icon}
                                <span>{tab.label}</span>
                            </div>
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm ${activeSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-[var(--drip-primary)] text-white'}`}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 ios-glass rounded-3xl p-6 border border-white/20 shadow-xl min-h-[500px]">
                {renderContent()}
            </main>
            {showInviteModal && <InviteUserModal onClose={() => setShowInviteModal(false)} onInvite={handleInviteUser} />}
        </div>
    );
};

export default AdminPanelTab;
