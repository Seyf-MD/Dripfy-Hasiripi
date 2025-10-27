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
    
    const inputClasses = "w-full bg-neutral-200 dark:bg-neutral-700 border-transparent focus:bg-neutral-300 dark:focus:bg-neutral-600 rounded p-1 text-sm focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-black dark:text-white";

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
        onOpenModal({ firstName: '', lastName: '', role: '', type: 'Individual', email: ''}, 'contacts', true);
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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <div className="w-full sm:w-auto flex-grow">
                     <input
                        type="text"
                        placeholder={t('contacts.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-xs px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-[#32ff84] focus:outline-none"
                    />
                </div>
                <div className="w-full sm:w-auto flex items-center gap-4">
                     <select
                        onChange={handleSortChange}
                        defaultValue={`${sortConfig.key}-${sortConfig.direction}`}
                        className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-[#32ff84] focus:outline-none"
                    >
                        {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {canEdit && (
                        <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                            <PlusCircle size={18}/> {t('contacts.newContact')}
                        </button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedAndFilteredData.map((contact) => (
                    <div key={contact.id} onClick={() => editingItem ? null : onOpenModal(contact, 'contacts')} className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between transition-all duration-300 hover:border-[#32ff84]/50 hover:-translate-y-1 relative group cursor-pointer">
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 mr-4">
                                    <h3 onClick={(e) => handleCellClick(e, contact.id, 'firstName')} className="font-bold text-black dark:text-white truncate">{contact.firstName} {contact.lastName}</h3>
                                    <p onClick={(e) => handleCellClick(e, contact.id, 'role')} className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{contact.role}</p>
                                </div>
                                <div className="p-2 bg-neutral-100 dark:bg-neutral-700 rounded-lg flex-shrink-0">
                                    {contact.type === 'Company' ? <Building size={20} className="text-neutral-500" /> : <User size={20} className="text-neutral-500" />}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p onClick={(e) => handleCellClick(e, contact.id, 'email')} className="text-sm text-neutral-600 dark:text-neutral-300 truncate">{contact.email}</p>
                                {(contact.city || contact.country) && (
                                    <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                        <MapPin size={12} />
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
