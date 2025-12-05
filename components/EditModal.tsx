import * as React from 'react';
import { DataItem, ScheduleEvent, FinancialRecord, Challenge, Advantage, Contact, Task, User } from '../types';
import { X, Save } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { locationData } from '../data/locationData';

type ModalType = 'schedule' | 'financials' | 'challenges' | 'advantages' | 'contacts' | 'tasks' | 'users';

interface EditModalProps {
    item: Partial<DataItem>;
    type: ModalType;
    isNew: boolean;
    onClose: () => void;
    onSave: (item: DataItem | Omit<DataItem, 'id'>, type: ModalType) => void;
}

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-bold text-[var(--drip-muted)]/80 dark:text-neutral-400 mb-2 ml-1">{label}</label>
        {children}
    </div>
);

const EditModal: React.FC<EditModalProps> = ({ item, type, isNew, onClose, onSave }) => {
    const { t } = useLanguage();
    const [formData, setFormData] = React.useState<Partial<DataItem>>(item);
    const [selectedCountry, setSelectedCountry] = React.useState<string>('');

    React.useEffect(() => {
        setFormData(item);
        if (type === 'contacts' && (item as Contact)?.country) {
            setSelectedCountry((item as Contact).country!);
        } else if (type === 'contacts') {
            setSelectedCountry(locationData.countries[0].name);
        }
    }, [item, type]);

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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'country') {
            setSelectedCountry(value);
            // Reset city if country changes
            setFormData(prev => ({ ...prev, city: locationData.countries.find(c => c.name === value)?.cities[0] || '' }));
        }
    };

    const handleParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, participants: value.split(',').map(p => p.trim()) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as DataItem, type);
    };

    const inputClass = "w-full px-4 py-3 bg-white/10 dark:bg-black/20 border border-white/20 rounded-2xl focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white placeholder:text-[var(--drip-muted)]/40 transition-all backdrop-blur-sm shadow-inner hover:bg-white/20";

    const renderFormFields = () => {
        switch (type) {
            case 'schedule':
                const event = formData as Partial<ScheduleEvent>;
                return (
                    <>
                        <FormField label={t('schedule.title')}><input name="title" value={event.title || ''} onChange={handleChange} className={inputClass} required placeholder="Meeting title" /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('schedule.day')}>
                                <select name="day" value={event.day || 'Monday'} onChange={handleChange} className={inputClass}>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d} className="bg-white dark:bg-neutral-800">{t(`days.${d.toLowerCase()}`)}</option>)}
                                </select>
                            </FormField>
                            <FormField label={t('schedule.time')}><input type="time" name="time" value={event.time || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        </div>
                        <FormField label={t('schedule.participants')}>
                            <input name="participants" value={(event.participants || []).join(', ')} onChange={handleParticipantsChange} className={inputClass} placeholder={t('editModal.participantsPlaceholder')} />
                        </FormField>
                        <FormField label={t('schedule.type')}>
                            <select name="type" value={event.type || 'Meeting'} onChange={handleChange} className={inputClass}>
                                <option value="Meeting" className="bg-white dark:bg-neutral-800">Meeting</option><option value="Call" className="bg-white dark:bg-neutral-800">Call</option><option value="Event" className="bg-white dark:bg-neutral-800">Event</option>
                            </select>
                        </FormField>
                    </>
                );
            case 'financials':
                const record = formData as Partial<FinancialRecord>;
                return (
                    <>
                        <FormField label={t('financials.description')}><input name="description" value={record.description || ''} onChange={handleChange} className={inputClass} required placeholder="Transaction description" /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('financials.amount')}><input type="number" name="amount" value={record.amount || 0} onChange={handleChange} className={inputClass} required /></FormField>
                            <FormField label={t('financials.dueDate')}><input type="date" name="dueDate" value={record.dueDate || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('financials.status')}>
                                <select name="status" value={record.status || 'Pending'} onChange={handleChange} className={inputClass}>
                                    <option value="Pending" className="bg-white dark:bg-neutral-800">{t('status.pending')}</option><option value="Paid" className="bg-white dark:bg-neutral-800">{t('status.paid')}</option><option value="Overdue" className="bg-white dark:bg-neutral-800">{t('status.overdue')}</option>
                                </select>
                            </FormField>
                            <FormField label={t('financials.type')}>
                                <select name="type" value={record.type || 'Outgoing'} onChange={handleChange} className={inputClass}>
                                    <option value="Incoming" className="bg-white dark:bg-neutral-800">{t('financials.incoming')}</option><option value="Outgoing" className="bg-white dark:bg-neutral-800">{t('financials.outgoing')}</option>
                                </select>
                            </FormField>
                        </div>
                    </>
                );
            case 'challenges':
                const challenge = formData as Partial<Challenge>;
                return (
                    <>
                        <FormField label={t('challenges.title')}><input name="title" value={challenge.title || ''} onChange={handleChange} className={inputClass} required placeholder="Challenge title" /></FormField>
                        <FormField label={t('challenges.description')}><textarea name="description" value={challenge.description || ''} onChange={handleChange} className={inputClass} rows={3} placeholder="Describe the challenge..."></textarea></FormField>
                        <FormField label={t('challenges.severity')}>
                            <select name="severity" value={challenge.severity || 'Medium'} onChange={handleChange} className={inputClass}>
                                <option value="High" className="bg-white dark:bg-neutral-800">High</option><option value="Medium" className="bg-white dark:bg-neutral-800">Medium</option><option value="Low" className="bg-white dark:bg-neutral-800">Low</option>
                            </select>
                        </FormField>
                    </>
                );
            case 'advantages':
                const advantage = formData as Partial<Advantage>;
                return (
                    <>
                        <FormField label={t('advantages.title')}><input name="title" value={advantage.title || ''} onChange={handleChange} className={inputClass} required placeholder="Advantage title" /></FormField>
                        <FormField label={t('advantages.description')}><textarea name="description" value={advantage.description || ''} onChange={handleChange} className={inputClass} rows={3} placeholder="Describe the advantage..."></textarea></FormField>
                    </>
                );
            case 'contacts':
                const contact = formData as Partial<Contact>;
                const cities = locationData.countries.find(c => c.name === selectedCountry)?.cities || [];
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.firstName')}><input name="firstName" value={contact.firstName || ''} onChange={handleChange} className={inputClass} required placeholder="First Name" /></FormField>
                            <FormField label={t('contacts.lastName')}><input name="lastName" value={contact.lastName || ''} onChange={handleChange} className={inputClass} placeholder="Last Name" /></FormField>
                        </div>
                        <FormField label={t('contacts.email')}><input type="email" name="email" value={contact.email || ''} onChange={handleChange} className={inputClass} required placeholder="email@example.com" /></FormField>
                        <FormField label={t('contacts.role')}><input name="role" value={contact.role || ''} onChange={handleChange} className={inputClass} placeholder="Job Title / Role" /></FormField>
                        <FormField label={t('contacts.type')}>
                            <select name="type" value={contact.type || 'Individual'} onChange={handleChange} className={inputClass}>
                                <option value="Individual" className="bg-white dark:bg-neutral-800">Individual</option><option value="Company" className="bg-white dark:bg-neutral-800">Company</option>
                            </select>
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.country')}>
                                <select name="country" value={selectedCountry} onChange={handleChange} className={inputClass}>
                                    {locationData.countries.map(c => <option key={c.name} value={c.name} className="bg-white dark:bg-neutral-800">{c.name}</option>)}
                                </select>
                            </FormField>
                            <FormField label={t('contacts.city')}>
                                <select name="city" value={contact.city || ''} onChange={handleChange} className={inputClass}>
                                    {cities.map(city => <option key={city} value={city} className="bg-white dark:bg-neutral-800">{city}</option>)}
                                </select>
                            </FormField>
                        </div>
                    </>
                );
            case 'tasks':
                const task = formData as Partial<Task>;
                return (
                    <>
                        <FormField label={t('tasks.title')}><input name="title" value={task.title || ''} onChange={handleChange} className={inputClass} required placeholder="Task title" /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('tasks.assignee')}><input name="assignee" value={task.assignee || ''} onChange={handleChange} className={inputClass} placeholder="Assignee Name" /></FormField>
                            <FormField label={t('tasks.dueDate')}><input type="date" name="dueDate" value={task.dueDate || ''} onChange={handleChange} className={inputClass} /></FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('tasks.priority')}>
                                <select name="priority" value={task.priority || 'Medium'} onChange={handleChange} className={inputClass}>
                                    <option value="High" className="bg-white dark:bg-neutral-800">High</option><option value="Medium" className="bg-white dark:bg-neutral-800">Medium</option><option value="Low" className="bg-white dark:bg-neutral-800">Low</option>
                                </select>
                            </FormField>
                            <FormField label={t('tasks.status')}>
                                <select name="status" value={task.status || 'To Do'} onChange={handleChange} className={inputClass}>
                                    <option value="To Do" className="bg-white dark:bg-neutral-800">{t('status.todo')}</option><option value="In Progress" className="bg-white dark:bg-neutral-800">{t('status.inprogress')}</option><option value="Done" className="bg-white dark:bg-neutral-800">{t('status.done')}</option>
                                </select>
                            </FormField>
                        </div>
                    </>
                );
            case 'users':
                const user = formData as Partial<User>;
                return (
                    <>
                        <FormField label={t('users.name')}><input name="name" value={user.name || ''} onChange={handleChange} className={inputClass} required placeholder="Full Name" /></FormField>
                        <FormField label={t('users.email')}><input type="email" name="email" value={user.email || ''} onChange={handleChange} className={inputClass} required placeholder="email@example.com" /></FormField>
                        <FormField label={t('users.role')}>
                            <select name="role" value={user.role || 'user'} onChange={handleChange} className={inputClass}>
                                <option value="user" className="bg-white dark:bg-neutral-800">{t('userRoles.user')}</option><option value="admin" className="bg-white dark:bg-neutral-800">{t('userRoles.admin')}</option>
                            </select>
                        </FormField>
                    </>
                );
            default: return null;
        }
    }

    const modalTitleId = 'edit-modal-title';
    // FIX: The translation function `t` only accepts one argument. The original code passed a second argument for replacement, which is not supported.
    // The fix involves getting the translated string first and then using string.replace() for the placeholder.
    const title = isNew ? t(`editModal.new.${type}`) : t('editModal.editTitle').replace('{type}', t(`dataTypes.${type}`));

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
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-[var(--drip-muted)] hover:text-[var(--drip-text)] dark:text-neutral-400 dark:hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </header>
                <form onSubmit={handleSubmit}>
                    <main className="p-6 space-y-5 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        {renderFormFields()}
                    </main>
                    <footer className="p-6 flex justify-end items-center gap-4 border-t border-white/10 bg-white/5">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white/10 text-[var(--drip-text)] dark:text-white text-sm font-bold rounded-xl hover:bg-white/20 transition-colors border border-white/10">
                            {t('actions.cancel')}
                        </button>
                        <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-xl shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all active:scale-95">
                            <Save size={18} /> {t('actions.save')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default EditModal;
