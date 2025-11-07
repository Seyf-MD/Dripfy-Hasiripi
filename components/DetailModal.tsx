import * as React from 'react';
import { DataItem, ScheduleEvent, FinancialRecord, Challenge, Advantage, Contact, Task, User } from '../types';
import { X, Edit, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type ModalType = 'schedule' | 'financials' | 'challenges' | 'advantages' | 'contacts' | 'tasks' | 'users';

interface DetailModalProps {
    item: DataItem;
    type: ModalType;
    canEdit: boolean;
    onClose: () => void;
    onEdit: (item: DataItem, type: ModalType) => void;
    onDelete: (itemId: string, type: ModalType) => void;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={`grid grid-cols-3 gap-4 py-3 border-b border-neutral-200 dark:border-neutral-700/50 ${className}`}>
        <dt className="text-sm font-medium text-[var(--drip-muted)] dark:text-neutral-400">{label}</dt>
        <dd className="text-sm text-[var(--drip-text)] dark:text-white col-span-2">{children}</dd>
    </div>
);


const DetailModal: React.FC<DetailModalProps> = ({ item, type, canEdit, onClose, onEdit, onDelete }) => {
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
                        <DetailRow label="Kapasite">
                            <div className="flex flex-col gap-1 text-sm">
                                <span>
                                    Planlanan: {event.capacity.requiredHours} {event.capacity.unit === 'hours' ? 'saat' : 'seans'}
                                </span>
                                <span>
                                    Bloke: {event.capacity.allocatedHours} {event.capacity.unit === 'hours' ? 'saat' : 'seans'}
                                </span>
                                <span>
                                    Günlük Ekip Kapasitesi: {event.team.capacityHoursPerDay} saat
                                </span>
                            </div>
                        </DetailRow>
                        <DetailRow label="Ekip">
                            <div className="flex flex-col gap-1 text-sm">
                                <span>{event.team.name}</span>
                                {event.team.timezone && <span>Zaman Dilimi: {event.team.timezone}</span>}
                                {event.team.members.length > 0 && (
                                    <span>Üyeler: {event.team.members.join(', ')}</span>
                                )}
                            </div>
                        </DetailRow>
                        <DetailRow label="Lokasyon">
                            <div className="flex flex-col gap-1 text-sm">
                                <span>{event.location.name}</span>
                                <span>Tür: {event.location.type}</span>
                                {event.location.timezone && <span>Saat Dilimi: {event.location.timezone}</span>}
                                {event.location.address && <span>Adres: {event.location.address}</span>}
                                {event.location.room && <span>Alan: {event.location.room}</span>}
                            </div>
                        </DetailRow>
                        {event.notes && <DetailRow label="Notlar">{event.notes}</DetailRow>}
                        {event.tags && event.tags.length > 0 && (
                            <DetailRow label="Etiketler">{event.tags.join(', ')}</DetailRow>
                        )}
                    </dl>
                );
            }
            case 'financials': {
                const record = item as FinancialRecord;
                return (
                    <dl>
                        <DetailRow label={t('financials.amount')}>
                            <span className={record.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(record.amount)}
                            </span>
                        </DetailRow>
                        <DetailRow label={t('financials.status')}>{t(`status.${record.status.toLowerCase()}`)}</DetailRow>
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
                        <DetailRow label={t('challenges.severity')}>{challenge.severity}</DetailRow>
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
                        <DetailRow label={t('tasks.priority')}>{task.priority}</DetailRow>
                        <DetailRow label={t('tasks.status')}>{t(`status.${task.status.toLowerCase().replace(' ', '')}`)}</DetailRow>
                        <DetailRow label={t('tasks.dueDate')}>{new Date(task.dueDate).toLocaleDateString()}</DetailRow>
                        <DetailRow label={t('tasks.assignee')}>{task.assignee}</DetailRow>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white break-all">{getTitle()}</h2>
                    <button onClick={onClose} className="text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white transition-colors flex-shrink-0 ml-4">
                        <X size={24} />
                    </button>
                </header>
                <main className="p-6">
                    {renderDetails()}
                </main>
                {canEdit && (
                     <footer className="p-4 flex justify-end items-center gap-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-xl">
                        <button onClick={() => onDelete(item.id, type)} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-500/20 transition-colors">
                            <Trash2 size={16} /> {t('actions.delete')}
                        </button>
                        <button onClick={() => onEdit(item, type)} className="flex items-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                            <Edit size={16} /> {t('actions.edit')}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default DetailModal;
