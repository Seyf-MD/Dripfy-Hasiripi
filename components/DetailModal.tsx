import * as React from 'react';
import { DataItem, ScheduleEvent, FinancialRecord, Challenge, Advantage, Contact, Task, User, Team } from '../types';
import { X, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type ModalType = 'schedule' | 'financials' | 'challenges' | 'advantages' | 'contacts' | 'teams' | 'tasks' | 'users';

interface DetailModalProps {
    item: DataItem;
    type: ModalType;
    canEdit: boolean;
    onClose: () => void;
    onEdit: (item: DataItem, type: ModalType) => void;
    onDelete: (itemId: string, type: ModalType) => void;
    teams?: Team[];
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={`grid grid-cols-3 gap-4 py-4 border-b border-white/10 ${className}`}>
        <dt className="text-sm font-semibold text-[var(--drip-muted)] dark:text-neutral-400">{label}</dt>
        <dd className="text-sm font-medium text-[var(--drip-text)] dark:text-white col-span-2 break-words leading-relaxed">{children}</dd>
    </div>
);


const DetailModal: React.FC<DetailModalProps> = ({ item, type, canEdit, onClose, onEdit, onDelete, teams = [] }) => {
    const { t } = useLanguage();

    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const renderDetails = () => {
        switch (type) {
            case 'schedule': {
                const event = item as ScheduleEvent;
                return (
                    <dl>
                        <DetailRow label={t('schedule.day')}>{t(`days.${event.day.toLowerCase()}`)}</DetailRow>
                        <DetailRow label={t('schedule.time')}>{event.time}</DetailRow>
                        <DetailRow label={t('schedule.participants')}>{event.participants.join(', ')}</DetailRow>
                        <DetailRow label={t('schedule.type')}>{event.type}</DetailRow>
                    </dl>
                );
            }
            case 'financials': {
                const record = item as FinancialRecord;
                return (
                    <dl>
                        <DetailRow label={t('financials.amount')}>
                            <span className={record.amount < 0 ? 'text-red-500 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400 font-bold'}>
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(record.amount)}
                            </span>
                        </DetailRow>
                        <DetailRow label={t('financials.status')}>
                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-bold border border-white/10">
                                {t(`status.${record.status.toLowerCase()}`)}
                            </span>
                        </DetailRow>
                        <DetailRow label={t('financials.dueDate')}>{new Date(record.dueDate).toLocaleDateString()}</DetailRow>
                        <DetailRow label={t('financials.type')}>{record.type === 'Incoming' ? t('financials.incoming') : t('financials.outgoing')}</DetailRow>
                    </dl>
                );
            }
            case 'challenges': {
                const challenge = item as Challenge;
                return (
                    <dl>
                        <DetailRow label={t('challenges.description')}>{challenge.description}</DetailRow>
                        <DetailRow label={t('challenges.severity')}>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${challenge.severity === 'High' ? 'bg-red-500/10 text-red-500' :
                                    challenge.severity === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                {challenge.severity}
                            </span>
                        </DetailRow>
                    </dl>
                );
            }
            case 'advantages': {
                const advantage = item as Advantage;
                return (
                    <dl>
                        <DetailRow label={t('advantages.description')}>{advantage.description}</DetailRow>
                    </dl>
                );
            }
            case 'contacts': {
                const contact = item as Contact;
                return (
                    <dl>
                        <DetailRow label={t('contacts.role')}>{contact.role}</DetailRow>
                        <DetailRow label={t('contacts.type')}>{contact.type}</DetailRow>
                        <DetailRow label={t('contacts.email')}>{contact.email}</DetailRow>
                        {contact.phone && <DetailRow label={t('contacts.phone')}>{contact.phone}</DetailRow>}
                        {contact.address && <DetailRow label={t('contacts.address')}>{`${contact.address}, ${contact.city}, ${contact.country}`}</DetailRow>}
                    </dl>
                );
            }
            case 'tasks': {
                const task = item as Task;
                return (
                    <dl>
                        <DetailRow label={t('tasks.priority')}>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${task.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                                    task.priority === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                {task.priority}
                            </span>
                        </DetailRow>
                        <DetailRow label={t('tasks.status')}>{t(`status.${task.status.toLowerCase().replace(' ', '')}`)}</DetailRow>
                        <DetailRow label={t('tasks.dueDate')}>{new Date(task.dueDate).toLocaleDateString()}</DetailRow>
                        <DetailRow label={t('tasks.assignee')}>{task.assignee || '-'}</DetailRow>
                        {task.teamIds && task.teamIds.length > 0 && (
                            <DetailRow label={t('tasks.teams')}>
                                {task.teamIds.map((teamId, idx) => {
                                    const team = teams.find(t => t.id === teamId);
                                    return (
                                        <span key={teamId}>
                                            {team ? team.name : teamId}{idx < task.teamIds!.length - 1 ? ', ' : ''}
                                        </span>
                                    );
                                })}
                            </DetailRow>
                        )}
                    </dl>
                );
            }
            case 'users': {
                const user = item as User;
                return (
                    <dl>
                        <DetailRow label={t('users.email')}>{user.email}</DetailRow>
                        <DetailRow label={t('users.role')}>{user.role}</DetailRow>
                        <DetailRow label={t('users.lastLogin')}>{new Date(user.lastLogin).toLocaleString()}</DetailRow>
                    </dl>
                );
            }
            case 'teams': {
                const team = item as Team;
                return (
                    <dl>
                        {team.description && <DetailRow label={t('teams.description')}>{team.description}</DetailRow>}
                        <DetailRow label={t('teams.members')}>{team.memberIds.length}</DetailRow>
                    </dl>
                );
            }
            default:
                return <p>No details available.</p>;
        }
    };

    const getTitle = () => {
        if ('title' in item) return item.title;
        if ('name' in item) return item.name;
        if ('firstName' in item && 'lastName' in item) return `${item.firstName} ${item.lastName}`;
        if ('description' in item) return (item as FinancialRecord).description;
        return t('detailModal.details');
    }

    const modalTitleId = 'detail-modal-title';

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div
                className="ios-glass p-0 rounded-3xl w-full max-w-lg flex flex-col shadow-2xl relative overflow-hidden border border-white/20 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-center border-b border-white/10 bg-white/5">
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white break-all">{getTitle()}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </header>
                <main className="p-6">
                    {renderDetails()}
                </main>
                {canEdit && (
                    <footer className="p-6 flex justify-end items-center gap-4 border-t border-white/10 bg-white/5">
                        <button onClick={() => onDelete(item.id, type)} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-500 dark:text-red-400 text-sm font-bold rounded-xl hover:bg-red-500/20 transition-all hover:scale-105 active:scale-95">
                            <Trash2 size={18} /> {t('actions.delete')}
                        </button>
                        <button onClick={() => onEdit(item, type)} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all active:scale-95">
                            <Edit size={18} /> {t('actions.edit')}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default DetailModal;
