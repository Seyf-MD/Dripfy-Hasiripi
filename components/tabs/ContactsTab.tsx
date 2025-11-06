import * as React from 'react';
import { Contact, SegmentDefinition } from '../../types';
import { Building, User, PlusCircle, MapPin } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

type SortKey = keyof Contact | 'fullName';
type SortDirection = 'asc' | 'desc';

interface ContactsTabProps {
    data: Contact[];
    canEdit: boolean;
    segmentDefinitions: SegmentDefinition[];
    onOpenModal: (item: Contact | Partial<Contact>, type: 'contacts', isNew?: boolean) => void;
    onUpdate: (itemId: string, field: keyof Contact, value: any) => void;
}

const ContactsTab: React.FC<ContactsTabProps> = ({ data, canEdit, segmentDefinitions, onOpenModal, onUpdate }) => {
    const { t } = useLanguage();
    const [editingItem, setEditingItem] = React.useState<{ id: string, field: keyof Contact } | null>(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: SortDirection }>({ key: 'firstName', direction: 'asc' });

    const inputClasses = "w-full bg-slate-100 dark:bg-neutral-700 border-transparent focus:bg-slate-200 dark:focus:bg-neutral-600 rounded p-1 text-sm focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none focus:border-[var(--drip-primary)] text-[var(--drip-text)] dark:text-white";

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

    const segmentLookup = React.useMemo(() => {
        return new Map(segmentDefinitions.map((segment) => [segment.id, segment]));
    }, [segmentDefinitions]);

    const formatCurrency = React.useMemo(() => new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }), []);

    const frequencyLabel = (frequency?: Contact['touchFrequency']) => {
        if (!frequency) {
            return t('common.notAvailable') ?? '–';
        }
        const key = `contacts.touchFrequencyOptions.${frequency}`;
        const label = t(key);
        return label === key ? frequency : label;
    };

    const handleAddNew = () => {
        onOpenModal({
            firstName: '',
            lastName: '',
            role: '',
            type: 'Individual',
            email: '',
            touchFrequency: 'monthly',
            segmentIds: [],
        }, 'contacts', true);
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
                        className="w-full max-w-xs px-4 py-2 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none"
                    />
                </div>
                <div className="w-full sm:w-auto flex items-center gap-4">
                     <select
                        onChange={handleSortChange}
                        defaultValue={`${sortConfig.key}-${sortConfig.direction}`}
                        className="w-full sm:w-auto px-4 py-2 bg-white dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-[var(--drip-primary)] focus:border-[var(--drip-primary)] focus:outline-none"
                    >
                        {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    {canEdit && (
                        <button onClick={handleAddNew} className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                            <PlusCircle size={18}/> {t('contacts.newContact')}
                        </button>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedAndFilteredData.map((contact) => {
                    const combinedSegmentIds = Array.from(new Set([...(contact.segmentIds ?? []), ...(contact.autoSegmentIds ?? [])]));
                    const autoSegments = new Set(contact.autoSegmentIds ?? []);
                    const manualSegments = new Set(contact.segmentIds ?? []);
                    const resolvedSegments = combinedSegmentIds
                        .map((segmentId) => segmentLookup.get(segmentId))
                        .filter((segment): segment is SegmentDefinition => Boolean(segment));

                    return (
                    <div key={contact.id} onClick={() => editingItem ? null : onOpenModal(contact, 'contacts')} className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-slate-200 dark:border-neutral-700 flex flex-col justify-between transition-all duration-300 hover:border-[rgba(75,165,134,0.6)] hover:-translate-y-1 relative group cursor-pointer">
                        <div>
                            <div className="flex items-start justify-between">
                                <div className="flex-1 mr-4">
                                    <h3 onClick={(e) => handleCellClick(e, contact.id, 'firstName')} className="font-bold text-[var(--drip-text)] dark:text-white truncate">{contact.firstName} {contact.lastName}</h3>
                                    <p onClick={(e) => handleCellClick(e, contact.id, 'role')} className="text-sm text-[var(--drip-muted)] dark:text-neutral-400 truncate">{contact.role}</p>
                                </div>
                                <div className="p-2 bg-slate-100 dark:bg-neutral-700 rounded-lg flex-shrink-0">
                                    {contact.type === 'Company' ? <Building size={20} className="text-neutral-500" /> : <User size={20} className="text-neutral-500" />}
                                </div>
                            </div>
                            <div className="mt-4">
                                <p onClick={(e) => handleCellClick(e, contact.id, 'email')} className="text-sm text-[color:var(--drip-text-soft)] dark:text-neutral-300 truncate">{contact.email}</p>
                                {(contact.city || contact.country) && (
                                    <p className="flex items-center gap-1.5 text-xs text-[var(--drip-muted)] dark:text-neutral-400 mt-1">
                                        <MapPin size={12} />
                                        <span>{[contact.city, contact.country].filter(Boolean).join(', ')}</span>
                                    </p>
                                )}
                                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                                    {contact.sector && (
                                        <div className="flex items-center justify-between">
                                            <span>{t('contacts.sector')}</span>
                                            <span className="font-medium text-[var(--drip-text)] dark:text-white">{contact.sector}</span>
                                        </div>
                                    )}
                                    {typeof contact.revenueContribution === 'number' && (
                                        <div className="flex items-center justify-between">
                                            <span>{t('contacts.revenueContribution')}</span>
                                            <span className="font-medium text-[var(--drip-text)] dark:text-white">{formatCurrency.format(contact.revenueContribution)}</span>
                                        </div>
                                    )}
                                    {contact.touchFrequency && (
                                        <div className="flex items-center justify-between">
                                            <span>{t('contacts.touchFrequency')}</span>
                                            <span className="font-medium text-[var(--drip-text)] dark:text-white">{frequencyLabel(contact.touchFrequency)}</span>
                                        </div>
                                    )}
                                </div>
                                {resolvedSegments.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {resolvedSegments.map((segment) => {
                                            const isAuto = autoSegments.has(segment.id) && !manualSegments.has(segment.id);
                                            return (
                                                <span
                                                    key={`${contact.id}-${segment.id}`}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                                                        isAuto
                                                            ? 'border-dashed border-emerald-300 text-emerald-600 dark:border-emerald-400/60 dark:text-emerald-300'
                                                            : 'border-slate-200 text-slate-600 dark:border-neutral-600 dark:text-neutral-200'
                                                    }`}
                                                >
                                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: segment.color ?? 'var(--drip-primary)' }}></span>
                                                    {segment.name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};

export default ContactsTab;
