import React, { useState, useEffect } from 'react';
import { DataItem, DashboardData, UserRole, UserPermission } from '../types';
import { X, Save, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface DetailModalProps {
    modalState: {
        item: DataItem | Partial<DataItem>;
        type: keyof DashboardData;
        isNew?: boolean;
    } | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: DataItem) => void;
    onDelete: (item: DataItem) => void;
    userRole: UserRole | null;
    permissions: UserPermission[];
}

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-4">
        <label className="block text-sm font-medium text-neutral-400 mb-1">{label}</label>
        {children}
    </div>
);

const getSingularName = (pluralName: string) => {
    if (pluralName === 'schedule') return 'schedule';
    if (pluralName.endsWith('s')) return pluralName.slice(0, -1);
    return pluralName;
};

const DetailModal: React.FC<DetailModalProps> = ({ modalState, isOpen, onClose, onSave, onDelete, userRole, permissions }) => {
    const [formData, setFormData] = useState<DataItem | Partial<DataItem> | null>(null);
    const { t, language } = useLanguage();

    useEffect(() => {
        if (modalState) {
            setFormData(modalState.item);
        }
    }, [modalState]);

    if (!isOpen || !modalState || !formData) return null;

    const { type, isNew } = modalState;

    const isReadOnly = (() => {
        if (userRole === 'admin') {
            return false;
        }
        if (userRole === 'user') {
            const userPerms = permissions.find(p => p.userName === 'Demo User');
            if (userPerms && type in userPerms.permissions) {
                return !userPerms.permissions[type as keyof typeof userPerms.permissions].edit;
            }
            return true; 
        }
        return true; 
    })();


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type: inputType } = e.target;
        
        let finalValue: any = value;
        if (inputType === 'number') {
            finalValue = parseFloat(value) || 0;
        }
        if (name === 'participants') {
            finalValue = value.split(',').map(p => p.trim()).filter(Boolean);
        }

        setFormData(prev => prev ? { ...prev, [name]: finalValue } : null);
    };

    const handleSave = () => {
        if(formData) onSave(formData as DataItem);
    };

    const handleDelete = () => {
        if(formData) onDelete(formData as DataItem);
    };
    
    const renderFormFields = () => {
        const item = formData as any;
        const inputClass = "w-full px-3 py-2 bg-neutral-900 border border-neutral-600 rounded-md focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-white placeholder:text-neutral-500 disabled:bg-neutral-800 disabled:cursor-not-allowed";

        switch (type) {
            case 'schedule':
                return (
                    <>
                        <FormField label={t('modal.schedule.title')}>
                            <input type="text" name="title" value={item.title || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('modal.schedule.day')}>
                                <select name="day" value={item.day || 'Monday'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{t(`days.${d.toLowerCase()}`)}</option>)}
                                </select>
                            </FormField>
                            <FormField label={t('modal.schedule.time')}>
                                <input type="time" name="time" value={item.time || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                            </FormField>
                        </div>
                        <FormField label={t('modal.schedule.participants')}>
                             <input type="text" name="participants" value={(item.participants || []).join(', ')} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} placeholder="Marcus, PR Team" />
                        </FormField>
                         <FormField label={t('modal.type')}>
                            <select name="type" value={item.type || 'Meeting'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                {['Meeting', 'Call', 'Event'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </FormField>
                    </>
                );
            case 'financials':
                return (
                    <>
                        <FormField label={t('modal.financials.description')}>
                            <input type="text" name="description" value={item.description || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('modal.financials.amount')}>
                                <input type="number" name="amount" value={item.amount || 0} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                            </FormField>
                            <FormField label={t('modal.type')}>
                                 <select name="type" value={item.type || 'Outgoing'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                    {['Incoming', 'Outgoing'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('modal.status')}>
                                 <select name="status" value={item.status || 'Pending'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                    {['Paid', 'Pending', 'Overdue'].map(s => <option key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</option>)}
                                </select>
                            </FormField>
                            <FormField label={t('modal.dueDate')}>
                                <input type="date" name="dueDate" value={item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                            </FormField>
                        </div>
                    </>
                );
            case 'challenges':
                return (
                    <>
                        <FormField label={t('modal.challenges.title')}>
                            <input type="text" name="title" value={item.title || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.challenges.description')}>
                            <textarea name="description" value={item.description || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} rows={3}></textarea>
                        </FormField>
                        <FormField label={t('modal.challenges.severity')}>
                            <select name="severity" value={item.severity || 'Medium'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                {['High', 'Medium', 'Low'].map(s => <option key={s} value={s}>{t(`priority.${s.toLowerCase()}`)}</option>)}
                            </select>
                        </FormField>
                    </>
                );
            case 'advantages':
                return (
                    <>
                        <FormField label={t('modal.advantages.title')}>
                            <input type="text" name="title" value={item.title || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.advantages.description')}>
                            <textarea name="description" value={item.description || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} rows={3}></textarea>
                        </FormField>
                    </>
                );
            case 'contacts':
                return (
                    <>
                        <FormField label={t('modal.contacts.name')}>
                            <input type="text" name="name" value={item.name || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.contacts.role')}>
                            <input type="text" name="role" value={item.role || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.contacts.email')}>
                            <input type="email" name="email" value={item.email || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.contacts.phone')}>
                            <input type="tel" name="phone" value={item.phone || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.type')}>
                            <select name="type" value={item.type || 'Individual'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                {['Company', 'Individual'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </FormField>
                    </>
                );
            case 'tasks':
                return (
                    <>
                        <FormField label={t('modal.tasks.title')}>
                            <input type="text" name="title" value={item.title || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.tasks.assignee')}>
                            <input type="text" name="assignee" value={item.assignee || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label={t('modal.tasks.priority')}>
                                <select name="priority" value={item.priority || 'Medium'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                    {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{t(`priority.${p.toLowerCase()}`)}</option>)}
                                </select>
                            </FormField>
                             <FormField label={t('modal.status')}>
                                 <select name="status" value={item.status || 'To Do'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                    {['To Do', 'In Progress', 'Done'].map(s => <option key={s} value={s}>{t(`taskStatus.${s.replace(' ', '')}`)}</option>)}
                                </select>
                            </FormField>
                        </div>
                         <FormField label={t('modal.dueDate')}>
                            <input type="date" name="dueDate" value={item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                    </>
                );
            case 'users':
                 return (
                    <>
                        <FormField label={t('modal.users.name')}>
                            <input type="text" name="name" value={item.name || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.users.email')}>
                            <input type="email" name="email" value={item.email || ''} onChange={handleInputChange} className={inputClass} disabled={isReadOnly} />
                        </FormField>
                        <FormField label={t('modal.users.role')}>
                            <select name="role" value={item.role || 'user'} onChange={handleInputChange} className={inputClass} disabled={isReadOnly}>
                                {['admin', 'user'].map(r => <option key={r} value={r}>{t(`userRoles.${r}`)}</option>)}
                            </select>
                        </FormField>
                    </>
                );
            default:
                return <p className="text-neutral-400">{t('modal.noFields')}</p>;
        }
    }

    const titleType = t(`dataTypes.${getSingularName(type)}`);
    
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-neutral-800 rounded-xl border border-neutral-700 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-neutral-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white capitalize">{isNew ? t('modal.createNew') : t('modal.edit')} {titleType}</h2>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                        {renderFormFields()}
                    </form>
                </main>
                {!isReadOnly && (
                    <footer className="p-4 flex justify-end items-center gap-4 border-t border-neutral-700 flex-shrink-0">
                        {!isNew && (
                            <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-300 text-sm font-semibold rounded-lg hover:bg-red-600/30 transition-colors">
                                <Trash2 size={16} /> {t('modal.delete')}
                            </button>
                        )}
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                            <Save size={16} /> {isNew ? t('modal.create') : t('modal.save')}
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default DetailModal;