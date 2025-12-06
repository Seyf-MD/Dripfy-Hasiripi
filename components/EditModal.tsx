import * as React from 'react';
import { DataItem, ScheduleEvent, FinancialRecord, Challenge, Advantage, Contact, Task, User } from '../types';
import { X, Save, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
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

const getMonthGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0

    const grid: (Date | null)[] = Array(startDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(year, month, i));
    return grid;
};

const IOSDatePicker: React.FC<{
    value: string,
    onChange: (val: string) => void,
    className?: string
}> = ({ value, onChange, className }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [viewDate, setViewDate] = React.useState(new Date());
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = React.useState('');

    // Format YYYY-MM-DD to "15 Aralık 2025"
    const formatDatePretty = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    React.useEffect(() => {
        // Sync internal input value when external value changes
        if (value && !isNaN(new Date(value).getTime())) {
            setViewDate(new Date(value));
            setInputValue(formatDatePretty(value));
        } else {
            setInputValue('');
        }
    }, [value]);

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDateSelect = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const isoDate = `${y}-${m}-${d}`;
        onChange(isoDate);
        setInputValue(formatDatePretty(isoDate)); // Update immediately for responsiveness
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputValue(val);

        // Try parsing DD.MM.YYYY
        const match = val.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
        if (match) {
            const d = match[1].padStart(2, '0');
            const m = match[2].padStart(2, '0');
            const y = match[3];
            onChange(`${y}-${m}-${d}`);
        }
    };

    const changeMonth = (delta: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
    };

    const grid = getMonthGrid(viewDate);
    const weekDays = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="GG.AA.YYYY"
                    className={`${className} pr-10 hover:bg-white/5 focus:bg-white/10 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden font-medium`}
                    onFocus={() => setIsOpen(true)}
                />
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--drip-muted)] hover:text-[var(--drip-primary)] transition-colors"
                >
                    <CalendarIcon size={18} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 ios-glass bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-2xl p-4 shadow-2xl border border-white/10 z-50 animate-fade-in-up origin-top-left">
                    <div className="flex items-center justify-between mb-4">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"><ChevronLeft size={18} /></button>
                        <span className="font-bold text-white text-sm tracking-wide capitalize">
                            {viewDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"><ChevronRight size={18} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2 border-b border-white/10 pb-2">
                        {weekDays.map(d => <div key={d} className="text-center text-[11px] text-white/50 font-bold uppercase">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {grid.map((d, i) => {
                            if (!d) return <div key={i} />;
                            // Check YYYY-MM-DD match
                            const dString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                            const isSelected = value === dString;
                            const isToday = new Date().toDateString() === d.toDateString();
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleDateSelect(d)}
                                    className={`
                                        h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all duration-200
                                        ${isSelected
                                            ? 'bg-[var(--drip-primary)] text-white shadow-lg shadow-[var(--drip-primary)]/30 scale-105 font-bold'
                                            : 'text-white/90 hover:bg-white/10 hover:scale-110 active:scale-95'}
                                        ${isToday && !isSelected ? 'border border-[var(--drip-primary)] text-[var(--drip-primary)]' : ''}
                                    `}
                                >
                                    {d.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

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

    const handleScheduleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = days[date.getDay()];
            setFormData(prev => ({ ...prev, date: value, day: dayName as any }));
        } else {
            setFormData(prev => ({ ...prev, date: value }));
        }
    };

    const renderFormFields = () => {
        switch (type) {
            case 'schedule':
                const event = formData as Partial<ScheduleEvent>;
                const showDateWarning = !isNew && !event.date;
                return (
                    <>
                        {showDateWarning && (
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-2 flex items-start gap-3">
                                <span className="text-xl">📅</span>
                                <div>
                                    <p className="text-sm font-bold text-amber-500">Tarih Belirle</p>
                                    <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 mt-0.5">
                                        Bu etkinlik şu an tekrarlı görünüyor. Belirli bir tarih atayarak tek seferlik hale getirin.
                                    </p>
                                </div>
                            </div>
                        )}
                        <FormField label={t('schedule.title')}><input name="title" value={event.title || ''} onChange={handleChange} className={inputClass} required placeholder={t('schedule.titlePlaceholder')} /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('schedule.date')}>
                                <IOSDatePicker
                                    value={event.date || ''}
                                    onChange={(val) => handleScheduleDateChange({ target: { value: val } } as any)}
                                    className={inputClass}
                                />
                            </FormField>
                            <FormField label={t('schedule.day')}>
                                <select name="day" value={event.day || 'Monday'} onChange={handleChange} className={inputClass}>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d} className="bg-white dark:bg-neutral-800">{t(`days.${d.toLowerCase()}`)}</option>)}
                                </select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('schedule.time')}><input type="time" name="time" value={event.time || ''} onChange={handleChange} className={inputClass} required /></FormField>
                            <FormField label={t('schedule.type')}>
                                <select name="type" value={event.type || 'Meeting'} onChange={handleChange} className={inputClass}>
                                    <option value="Meeting" className="bg-white dark:bg-neutral-800">Meeting</option><option value="Call" className="bg-white dark:bg-neutral-800">Call</option><option value="Event" className="bg-white dark:bg-neutral-800">Event</option>
                                </select>
                            </FormField>
                        </div>
                        <FormField label={t('schedule.participants')}>
                            <input name="participants" value={(event.participants || []).join(', ')} onChange={handleParticipantsChange} className={inputClass} placeholder={t('editModal.participantsPlaceholder')} />
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
