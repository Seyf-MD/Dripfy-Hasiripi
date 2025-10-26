
import React from 'react';
import { User, UserPermission, AuditLogEntry } from '../../types';
import { ShieldCheck, Edit2, Clock } from 'lucide-react';

interface AdminPanelTabProps {
    users: User[];
    permissions: UserPermission[];
    auditLog: AuditLogEntry[];
    onOpenModal: (item: User, type: 'users') => void;
}

const AdminPanelTab: React.FC<AdminPanelTabProps> = ({ users, permissions, auditLog, onOpenModal }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-blue-300"><ShieldCheck /> User Permissions</h2>
                <div className="space-y-4">
                    {users.map(user => (
                        // FIX: Added onClick handler and cursor styling to allow opening the detail modal for a user.
                        <div key={user.id} onClick={() => onOpenModal(user, 'users')} className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 cursor-pointer hover:bg-neutral-700/50 transition-colors">
                             <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-white">{user.name}</h3>
                                    <p className="text-sm text-neutral-400">{user.email}</p>
                                </div>
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${user.role === 'admin' ? 'bg-green-500/20 text-[#32ff84]' : 'bg-neutral-700 text-neutral-300'}`}>
                                   {user.role === 'admin' ? <ShieldCheck size={14} className="mr-1.5"/> : <Edit2 size={14} className="mr-1.5"/>} {user.role}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
             <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-purple-300"><Clock /> Audit Log</h2>
                <div className="space-y-3 bg-neutral-800/50 p-4 rounded-lg border border-neutral-700 max-h-[60vh] overflow-y-auto">
                    {auditLog.map(log => (
                        <div key={log.id} className="text-sm p-3 bg-neutral-800 rounded-md">
                            <div className="flex justify-between items-center">
                                <p className="font-semibold text-white">
                                    <span className={`font-bold ${
                                        log.action === 'Created' ? 'text-green-400' :
                                        log.action === 'Updated' ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{log.action}</span> {log.targetType}
                                </p>
                                <p className="text-xs text-neutral-500">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                            <p className="text-neutral-400 mt-1">{log.details}</p>
                            <p className="text-xs text-neutral-500 mt-1">by {log.user}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPanelTab;
