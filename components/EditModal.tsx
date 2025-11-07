import * as React from 'react';
import { DataItem, ScheduleEvent, FinancialRecord, Challenge, Advantage, Contact, Task, User, SegmentDefinition } from '../types';
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
    segmentDefinitions?: SegmentDefinition[];
}

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-[var(--drip-muted)] dark:text-neutral-400 mb-1.5">{label}</label>
        {children}
    </div>
);

const EditModal: React.FC<EditModalProps> = ({ item, type, isNew, onClose, onSave, segmentDefinitions = [] }) => {
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
        if (name === 'revenueContribution') {
            const numericValue = value === '' ? undefined : Number(value);
            setFormData(prev => ({ ...prev, [name]: numericValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (name === 'country') {
            setSelectedCountry(value);
            // Reset city if country changes
            setFormData(prev => ({ ...prev, city: locationData.countries.find(c => c.name === value)?.cities[0] || '' }));
        }
    };

    const handleSegmentToggle = (segmentId: string) => {
        setFormData(prev => {
            const current = new Set((prev as Contact)?.segmentIds ?? []);
            if (current.has(segmentId)) {
                current.delete(segmentId);
            } else {
                current.add(segmentId);
            }
            return {
                ...prev,
                segmentIds: Array.from(current),
            } as Partial<Contact>;
        });
    };

    const handleParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, participants: value.split(',').map(p => p.trim()) }));
    };

    const ensureScheduleCapacity = (event?: Partial<ScheduleEvent>) => {
        return event?.capacity ?? { requiredHours: 1, allocatedHours: 1, unit: 'hours' as const };
    };

    const ensureScheduleTeam = (event?: Partial<ScheduleEvent>) => {
        return event?.team ?? { id: '', name: '', members: [], capacityHoursPerDay: 24, timezone: '' };
    };

    const ensureScheduleLocation = (event?: Partial<ScheduleEvent>) => {
        return event?.location ?? { id: '', name: '', type: 'onsite', timezone: '', address: '', room: '' };
    };

    const handleCapacityFieldChange = (field: 'requiredHours' | 'allocatedHours' | 'unit', value: string) => {
        setFormData(prev => {
            const event = prev as Partial<ScheduleEvent>;
            const current = ensureScheduleCapacity(event);
            const next = {
                ...current,
                [field]: field === 'unit' ? (value as ScheduleEvent['capacity']['unit']) : Number(value || 0),
            };
            return { ...prev, capacity: next } as Partial<ScheduleEvent>;
        });
    };

    const handleTeamFieldChange = (field: 'id' | 'name' | 'timezone', value: string) => {
        setFormData(prev => {
            const event = prev as Partial<ScheduleEvent>;
            const current = ensureScheduleTeam(event);
            const next = { ...current, [field]: value };
            return { ...prev, team: next } as Partial<ScheduleEvent>;
        });
    };

    const handleTeamCapacityChange = (value: string) => {
        setFormData(prev => {
            const event = prev as Partial<ScheduleEvent>;
            const current = ensureScheduleTeam(event);
            const next = { ...current, capacityHoursPerDay: Number(value || 0) };
            return { ...prev, team: next } as Partial<ScheduleEvent>;
        });
    };

    const handleTeamMembersChange = (value: string) => {
        setFormData(prev => {
            const event = prev as Partial<ScheduleEvent>;
            const current = ensureScheduleTeam(event);
            const members = value
                .split(',')
                .map(member => member.trim())
                .filter(Boolean);
            const next = { ...current, members };
            return { ...prev, team: next } as Partial<ScheduleEvent>;
        });
    };

    const handleLocationFieldChange = (field: 'id' | 'name' | 'type' | 'timezone' | 'address' | 'room', value: string) => {
        setFormData(prev => {
            const event = prev as Partial<ScheduleEvent>;
            const current = ensureScheduleLocation(event);
            const next = {
                ...current,
                [field]: field === 'type' ? (value as ScheduleEvent['location']['type']) : value,
            };
            return { ...prev, location: next } as Partial<ScheduleEvent>;
        });
    };

    const handleTagsChange = (value: string) => {
        setFormData(prev => {
            const tags = value
                .split(',')
                .map(tag => tag.trim())
                .filter(Boolean);
            return { ...prev, tags } as Partial<ScheduleEvent>;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as DataItem, type);
    };
    
    const inputClass = "w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white placeholder:text-neutral-500";

    const renderFormFields = () => {
        switch (type) {
            case 'schedule':
                const event = formData as Partial<ScheduleEvent>;
                const capacity = ensureScheduleCapacity(event);
                const team = ensureScheduleTeam(event);
                const location = ensureScheduleLocation(event);
                return (
                    <>
                        <FormField label={t('schedule.title')}><input name="title" value={event.title || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('schedule.day')}>
                                <select name="day" value={event.day || 'Monday'} onChange={handleChange} className={inputClass}>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{t(`days.${d.toLowerCase()}`)}</option>)}
                                </select>
                            </FormField>
                            <FormField label={t('schedule.time')}><input type="time" name="time" value={event.time || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        </div>
                        <FormField label={t('schedule.participants')}>
                             <input name="participants" value={(event.participants || []).join(', ')} onChange={handleParticipantsChange} className={inputClass} placeholder={t('editModal.participantsPlaceholder')} />
                        </FormField>
                        <FormField label={t('schedule.type')}>
                            <select name="type" value={event.type || 'Meeting'} onChange={handleChange} className={inputClass}>
                                <option value="Meeting">Meeting</option><option value="Call">Call</option><option value="Event">Event</option>
                            </select>
                        </FormField>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FormField label="Planlanan Kapasite (saat)">
                                <input
                                    type="number"
                                    step="0.25"
                                    value={capacity.requiredHours}
                                    onChange={(e) => handleCapacityFieldChange('requiredHours', e.target.value)}
                                    className={inputClass}
                                    min={0}
                                />
                            </FormField>
                            <FormField label="Bloke Edilen Kapasite (saat)">
                                <input
                                    type="number"
                                    step="0.25"
                                    value={capacity.allocatedHours}
                                    onChange={(e) => handleCapacityFieldChange('allocatedHours', e.target.value)}
                                    className={inputClass}
                                    min={0}
                                />
                            </FormField>
                            <FormField label="Kapasite Birimi">
                                <select
                                    value={capacity.unit}
                                    onChange={(e) => handleCapacityFieldChange('unit', e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="hours">Saat</option>
                                    <option value="sessions">Seans</option>
                                </select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField label="Ekip Adı">
                                <input value={team.name} onChange={(e) => handleTeamFieldChange('name', e.target.value)} className={inputClass} placeholder="Örn. Operasyon" />
                            </FormField>
                            <FormField label="Ekip Kimliği">
                                <input value={team.id} onChange={(e) => handleTeamFieldChange('id', e.target.value)} className={inputClass} placeholder="team-id" />
                            </FormField>
                            <FormField label="Ekip Üyeleri">
                                <input value={team.members.join(', ')} onChange={(e) => handleTeamMembersChange(e.target.value)} className={inputClass} placeholder="Üyeleri virgülle ayırın" />
                            </FormField>
                            <FormField label="Ekip Günlük Kapasitesi (saat)">
                                <input
                                    type="number"
                                    min={0}
                                    step="0.5"
                                    value={team.capacityHoursPerDay}
                                    onChange={(e) => handleTeamCapacityChange(e.target.value)}
                                    className={inputClass}
                                />
                            </FormField>
                            <FormField label="Ekip Saat Dilimi">
                                <input value={team.timezone || ''} onChange={(e) => handleTeamFieldChange('timezone', e.target.value)} className={inputClass} placeholder="Europe/Istanbul" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField label="Lokasyon Adı">
                                <input value={location.name} onChange={(e) => handleLocationFieldChange('name', e.target.value)} className={inputClass} placeholder="Merkez Ofis" />
                            </FormField>
                            <FormField label="Lokasyon Türü">
                                <select value={location.type} onChange={(e) => handleLocationFieldChange('type', e.target.value)} className={inputClass}>
                                    <option value="onsite">Ofis</option>
                                    <option value="remote">Uzaktan</option>
                                    <option value="hybrid">Hibrit</option>
                                </select>
                            </FormField>
                            <FormField label="Saat Dilimi">
                                <input value={location.timezone || ''} onChange={(e) => handleLocationFieldChange('timezone', e.target.value)} className={inputClass} placeholder="Europe/Berlin" />
                            </FormField>
                            <FormField label="Adres">
                                <input value={location.address || ''} onChange={(e) => handleLocationFieldChange('address', e.target.value)} className={inputClass} placeholder="Adres bilgisi" />
                            </FormField>
                            <FormField label="Oda / Alan">
                                <input value={location.room || ''} onChange={(e) => handleLocationFieldChange('room', e.target.value)} className={inputClass} placeholder="Toplantı Salonu" />
                            </FormField>
                        </div>
                        <FormField label="Notlar">
                            <textarea name="notes" value={event.notes || ''} onChange={handleChange} className={inputClass} rows={3} placeholder="Ek ayrıntılar" />
                        </FormField>
                        <FormField label="Etiketler">
                            <input value={(event.tags || []).join(', ')} onChange={(e) => handleTagsChange(e.target.value)} className={inputClass} placeholder="Etiketleri virgülle ayırın" />
                        </FormField>
                    </>
                );
            case 'financials':
                const record = formData as Partial<FinancialRecord>;
                return (
                    <>
                        <FormField label={t('financials.description')}><input name="description" value={record.description || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('financials.amount')}><input type="number" name="amount" value={record.amount || 0} onChange={handleChange} className={inputClass} required /></FormField>
                            <FormField label={t('financials.dueDate')}><input type="date" name="dueDate" value={record.dueDate || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('financials.status')}>
                                <select name="status" value={record.status || 'Pending'} onChange={handleChange} className={inputClass}>
                                    <option value="Pending">{t('status.pending')}</option><option value="Paid">{t('status.paid')}</option><option value="Overdue">{t('status.overdue')}</option>
                                </select>
                            </FormField>
                            <FormField label={t('financials.type')}>
                                <select name="type" value={record.type || 'Outgoing'} onChange={handleChange} className={inputClass}>
                                    <option value="Incoming">{t('financials.incoming')}</option><option value="Outgoing">{t('financials.outgoing')}</option>
                                </select>
                            </FormField>
                        </div>
                    </>
                );
            case 'challenges':
                const challenge = formData as Partial<Challenge>;
                return (
                    <>
                        <FormField label={t('challenges.title')}><input name="title" value={challenge.title || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <FormField label={t('challenges.description')}><textarea name="description" value={challenge.description || ''} onChange={handleChange} className={inputClass} rows={3}></textarea></FormField>
                        <FormField label={t('challenges.severity')}>
                            <select name="severity" value={challenge.severity || 'Medium'} onChange={handleChange} className={inputClass}>
                                <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                            </select>
                        </FormField>
                    </>
                );
            case 'advantages':
                 const advantage = formData as Partial<Advantage>;
                return (
                    <>
                        <FormField label={t('advantages.title')}><input name="title" value={advantage.title || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <FormField label={t('advantages.description')}><textarea name="description" value={advantage.description || ''} onChange={handleChange} className={inputClass} rows={3}></textarea></FormField>
                    </>
                );
            case 'contacts':
                const contact = formData as Partial<Contact>;
                const cities = locationData.countries.find(c => c.name === selectedCountry)?.cities || [];
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.firstName')}><input name="firstName" value={contact.firstName || ''} onChange={handleChange} className={inputClass} required /></FormField>
                            <FormField label={t('contacts.lastName')}><input name="lastName" value={contact.lastName || ''} onChange={handleChange} className={inputClass} /></FormField>
                        </div>
                        <FormField label={t('contacts.email')}><input type="email" name="email" value={contact.email || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <FormField label={t('contacts.role')}><input name="role" value={contact.role || ''} onChange={handleChange} className={inputClass} /></FormField>
                         <FormField label={t('contacts.type')}>
                            <select name="type" value={contact.type || 'Individual'} onChange={handleChange} className={inputClass}>
                                <option value="Individual">Individual</option><option value="Company">Company</option>
                            </select>
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.country')}>
                                <select name="country" value={selectedCountry} onChange={handleChange} className={inputClass}>
                                    {locationData.countries.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                </select>
                            </FormField>
                             <FormField label={t('contacts.city')}>
                                <select name="city" value={contact.city || ''} onChange={handleChange} className={inputClass}>
                                    {cities.map(city => <option key={city} value={city}>{city}</option>)}
                                </select>
                            </FormField>
                        </div>
                        <FormField label={t('contacts.sector')}>
                            <input name="sector" value={(contact.sector ?? '')} onChange={handleChange} className={inputClass} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('contacts.revenueContribution')}>
                                <input type="number" name="revenueContribution" value={contact.revenueContribution ?? ''} onChange={handleChange} className={inputClass} min={0} step={1000} />
                            </FormField>
                            <FormField label={t('contacts.touchFrequency')}>
                                <select name="touchFrequency" value={contact.touchFrequency || 'monthly'} onChange={handleChange} className={inputClass}>
                                    {['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'adHoc'].map(option => {
                                        const key = `contacts.touchFrequencyOptions.${option}`;
                                        const label = t(key);
                                        return <option key={option} value={option}>{label === key ? option : label}</option>;
                                    })}
                                </select>
                            </FormField>
                        </div>
                        {segmentDefinitions.length > 0 && (
                            <FormField label={t('contacts.segments')}>
                                <div className="grid gap-2">
                                    {segmentDefinitions.map((segment) => {
                                        const checked = (contact.segmentIds ?? []).includes(segment.id);
                                        return (
                                            <label key={segment.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => handleSegmentToggle(segment.id)}
                                                    className="h-4 w-4 rounded border-slate-300 text-[var(--drip-primary)] focus:ring-[var(--drip-primary)]"
                                                />
                                                <span>{segment.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </FormField>
                        )}
                    </>
                );
            case 'tasks':
                const task = formData as Partial<Task>;
                return (
                    <>
                        <FormField label={t('tasks.title')}><input name="title" value={task.title || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('tasks.assignee')}><input name="assignee" value={task.assignee || ''} onChange={handleChange} className={inputClass} /></FormField>
                            <FormField label={t('tasks.dueDate')}><input type="date" name="dueDate" value={task.dueDate || ''} onChange={handleChange} className={inputClass} /></FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('tasks.priority')}>
                                <select name="priority" value={task.priority || 'Medium'} onChange={handleChange} className={inputClass}>
                                    <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
                                </select>
                            </FormField>
                             <FormField label={t('tasks.status')}>
                                <select name="status" value={task.status || 'To Do'} onChange={handleChange} className={inputClass}>
                                    <option value="To Do">{t('status.todo')}</option><option value="In Progress">{t('status.inprogress')}</option><option value="Done">{t('status.done')}</option>
                                </select>
                            </FormField>
                        </div>
                    </>
                );
             case 'users':
                const user = formData as Partial<User>;
                return (
                     <>
                        <FormField label={t('users.name')}><input name="name" value={user.name || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <FormField label={t('users.email')}><input type="email" name="email" value={user.email || ''} onChange={handleChange} className={inputClass} required /></FormField>
                        <FormField label={t('users.role')}>
                            <select name="role" value={user.role || 'user'} onChange={handleChange} className={inputClass}>
                                <option value="user">{t('userRoles.user')}</option><option value="admin">{t('userRoles.admin')}</option>
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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
        >
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-neutral-200 dark:border-neutral-700">
                    <h2 id={modalTitleId} className="text-xl font-bold text-[var(--drip-text)] dark:text-white">{title}</h2>
                    <button onClick={onClose} className="text-[var(--drip-muted)] dark:text-neutral-400 hover:text-[var(--drip-text)] dark:hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>
                <form onSubmit={handleSubmit}>
                    <main className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        {renderFormFields()}
                    </main>
                    <footer className="p-4 flex justify-end items-center gap-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-[var(--drip-text)] dark:text-white text-sm font-semibold rounded-lg hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors">
                            {t('actions.cancel')}
                        </button>
                        <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                            <Save size={16} /> {t('actions.save')}
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default EditModal;
