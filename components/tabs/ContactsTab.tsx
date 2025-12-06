import * as React from 'react';
import { Contact } from '../../types';
import { Building, User, PlusCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

type SortKey = keyof Contact | 'fullName';
type SortDirection = 'asc' | 'desc';

interface ContactsTabProps {
    data: Contact[];
    canEdit: boolean;
    onOpenModal: (item: Contact | Partial<Contact>, type: 'contacts', isNew?: boolean) => void;
    onUpdate: (itemId: string, field: keyof Contact, value: any) => void;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ data, canEdit, onOpenModal, onUpdate }) => {
    const { t } = useLanguage();
    const [editingItem, setEditingItem] = React.useState<{ id: string, field: keyof Contact } | null>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: SortDirection }>({ key: 'firstName', direction: 'asc' });

    // Updated glassmorphism input style
    const inputClasses = "w-full bg-white/10 dark:bg-neutral-800/30 border border-white/10 focus:bg-white/20 rounded-xl p-2 text-sm focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white backdrop-blur-sm transition-all";

    const sortedAndFilteredData = React.useMemo(() => {
        let filtered = data.filter(contact => {
            const search = searchTerm.toLowerCase();
            return (
                contact.firstName.toLowerCase().includes(search) ||
                contact.lastName.toLowerCase().includes(search) ||
                contact.role.toLowerCase().includes(search) ||
                contact.email.toLowerCase().includes(search) ||
                (contact.city && contact.city.toLowerCase().includes(search)) ||
                (contact.country && contact.country.toLowerCase().includes(search))
            );
        });

        filtered.sort((a, b) => {
            const { key, direction } = sortConfig;
            let aValue: any = key === 'fullName' ? `${a.firstName} ${a.lastName}` : a[key as keyof Contact];
            let bValue: any = key === 'fullName' ? `${b.firstName} ${b.lastName}` : b[key as keyof Contact];

            if (aValue === undefined || aValue === null) aValue = '';
            if (bValue === undefined || bValue === null) bValue = '';

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [data, searchTerm, sortConfig]);

    const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const [key, direction] = value.split('-') as [SortKey, SortDirection];
        setSortConfig({ key, direction });
    };

    const handleCellClick = (e: React.MouseEvent, id: string, field: keyof Contact) => {
        e.stopPropagation();
        if (canEdit) {
            setEditingItem({ id, field });
        }
    };

    const handleUpdate = (id: string, field: keyof Contact, value: any) => {
        onUpdate(id, field, value);
        setEditingItem(null);
    };

    const handleAddNew = () => {
        onOpenModal({ firstName: '', lastName: '', role: '', type: 'Individual', email: '' }, 'contacts', true);
    }

    const sortOptions: { label: string, value: string }[] = [
        { label: t('contacts.sort.firstNameAsc'), value: 'firstName-asc' },
        { label: t('contacts.sort.firstNameDesc'), value: 'firstName-desc' },
        { label: t('contacts.sort.lastNameAsc'), value: 'lastName-asc' },
        { label: t('contacts.sort.lastNameDesc'), value: 'lastName-desc' },
        { label: t('contacts.sort.countryAsc'), value: 'country-asc' },
        { label: t('contacts.sort.cityAsc'), value: 'city-asc' },
        { label: t('contacts.sort.roleAsc'), value: 'role-asc' },
    ];

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="w-full sm:w-auto flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder={t('contacts.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${inputClasses} px-4 py-2.5 shadow-sm`}
                    />
                </div>
                <div className="w-full sm:w-auto flex items-center gap-4">
                    <select
                        onChange={handleSortChange}
                        defaultValue={`${sortConfig.key}-${sortConfig.direction}`}
                        className={`${inputClasses} px-4 py-2.5 shadow-sm appearance-none cursor-pointer`}
                        style={{ backgroundImage: 'none' }}
                    >
                        {sortOptions.map(opt => <option key={opt.value} value={opt.value} className="bg-white dark:bg-neutral-800">{opt.label}</option>)}
                    </select>
                    {canEdit && (
                        <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-full shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all">
                            <PlusCircle size={18} /> {t('contacts.newContact')}
                        </button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedAndFilteredData.map((contact) => (
                    <div
                        key={contact.id}
                        onClick={() => editingItem ? null : onOpenModal(contact, 'contacts')}
                        className="ios-glass ios-card p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:border-[var(--drip-primary)]/30 hover:shadow-2xl hover:-translate-y-1 relative group cursor-pointer border border-white/20"
                    >
                        {/* Gradient Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--drip-primary)]/0 to-[var(--drip-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 mr-4">
                                    <h3 onClick={(e) => handleCellClick(e, contact.id, 'firstName')} className="text-lg font-bold text-[var(--drip-text)] dark:text-white truncate group-hover:text-[var(--drip-primary)] transition-colors">{contact.firstName} {contact.lastName}</h3>
                                    <p onClick={(e) => handleCellClick(e, contact.id, 'role')} className="text-sm text-[var(--drip-muted)]/70 dark:text-neutral-400 truncate font-medium">{contact.role}</p>
                                </div>
                                <div className="p-2.5 bg-white/10 dark:bg-white/5 rounded-2xl flex-shrink-0 backdrop-blur-md shadow-sm border border-white/10">
                                    {contact.type === 'Company' ? <Building size={20} className="text-[var(--drip-primary)]" /> : <User size={20} className="text-[var(--drip-primary)]" />}
                                </div>
                            </div>
                            <div className="mt-6 space-y-2">
                                <p onClick={(e) => handleCellClick(e, contact.id, 'email')} className="text-sm text-[var(--drip-text)]/80 dark:text-white/80 truncate font-medium">{contact.email}</p>
                                {(contact.city || contact.country) && (
                                    <p className="flex items-center gap-1.5 text-xs text-[var(--drip-muted)]/80 dark:text-neutral-400 font-medium">
                                        <MapPin size={12} className="text-[var(--drip-accent)]" />
                                        <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ContactsTab;
