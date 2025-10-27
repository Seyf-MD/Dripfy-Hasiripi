import * as React from 'react';
import { FinancialRecord } from '../../types';
import { ArrowUp, ArrowDown, PlusCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface FinancialsTabProps {
    data: FinancialRecord[];
    canEdit: boolean;
    onOpenModal: (item: FinancialRecord | Partial<FinancialRecord>, type: 'financials', isNew?: boolean) => void;
    onUpdate: (itemId: string, field: keyof FinancialRecord, value: any) => void;
    dateFilter: 'week' | 'month' | null;
}

type SortKey = keyof FinancialRecord;
type SortDirection = 'ascending' | 'descending';

const getStatusColor = (status: string) => {
    const colors = { 'Paid': 'bg-green-500/20 text-green-500 dark:text-green-300', 'Pending': 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-300', 'Overdue': 'bg-red-500/20 text-red-500 dark:text-red-300' };
    return colors[status as keyof typeof colors] || 'bg-neutral-700';
}

const FinancialsTab: React.FC<FinancialsTabProps> = ({ data, canEdit, onOpenModal, onUpdate, dateFilter }) => {
    const { t } = useLanguage();
    const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'dueDate', direction: 'ascending' });
    const [editingCell, setEditingCell] = React.useState<{ recordId: string; field: keyof FinancialRecord } | null>(null);

    const filteredAndSortedData = React.useMemo(() => {
        let filteredData = [...data];

        if (dateFilter) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (dateFilter === 'week') {
                const endOfWeek = new Date(today);
                const day = today.getDay();
                endOfWeek.setDate(today.getDate() + (day === 0 ? 0 : 7 - day)); // End of Sunday
                filteredData = filteredData.filter(item => {
                    const dueDate = new Date(item.dueDate);
                    return dueDate >= today && dueDate <= endOfWeek;
                });
            } else if (dateFilter === 'month') {
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                 filteredData = filteredData.filter(item => {
                    const dueDate = new Date(item.dueDate);
                    return dueDate >= today && dueDate <= endOfMonth;
                });
            }
        }

        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                let comparison = 0;
                
                if (sortConfig.key === 'amount') {
                    comparison = (aValue as number) - (bValue as number);
                } else if (sortConfig.key === 'dueDate') {
                    comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
                } else {
                    comparison = String(aValue).localeCompare(String(bValue));
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return filteredData;
    }, [data, sortConfig, dateFilter]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'ascending' ? <ArrowUp size={14} className="text-[#32ff84]"/> : <ArrowDown size={14} className="text-[#32ff84]"/>;
    };

    const headers: { key: SortKey; label: string }[] = [
        { key: 'description', label: t('financials.description') },
        { key: 'amount', label: t('financials.amount') },
        { key: 'status', label: t('financials.status') },
        { key: 'dueDate', label: t('financials.dueDate') },
        { key: 'type', label: t('financials.type') },
    ];
    
    const handleAddNew = () => {
        onOpenModal({ description: '', amount: 0, status: 'Pending', dueDate: new Date().toISOString().split('T')[0], type: 'Outgoing' }, 'financials', true);
    }
    
    const handleCellClick = (recordId: string, field: keyof FinancialRecord) => {
        if (canEdit) {
            setEditingCell({ recordId, field });
        }
    };

    const handleUpdate = (recordId: string, field: keyof FinancialRecord, value: any) => {
        let finalValue = value;
        if (field === 'amount') {
            finalValue = Number(value);
        }
        onUpdate(recordId, field, finalValue);
        setEditingCell(null);
    };

    const inputClasses = "w-full bg-neutral-200 dark:bg-neutral-700 border-transparent focus:bg-neutral-300 dark:focus:bg-neutral-600 rounded p-1.5 text-sm focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-black dark:text-white";

    return (
        <div className="animate-fade-in">
             <div className="flex justify-end mb-4">
                {canEdit && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        <PlusCircle size={18}/> {t('financials.newRecord')}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto bg-white dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-neutral-800 dark:text-white first:pl-4 first:sm:pl-6">
                                    <button onClick={() => requestSort(header.key)} className="flex items-center gap-2 group text-neutral-800 dark:text-white hover:text-[#32ff84] transition-colors">
                                        {header.label} {getSortIcon(header.key)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900/50">
                        {filteredAndSortedData.map((record) => (
                            <tr key={record.id} className="hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70 group">
                                <td onClick={() => onOpenModal(record, 'financials')} className="w-1/3 py-4 pl-4 pr-3 text-sm font-medium text-black dark:text-white sm:pl-6 cursor-pointer">{record.description}</td>
                                
                                <td onClick={() => handleCellClick(record.id, 'amount')} className="whitespace-nowrap px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'amount' ? (
                                        <input
                                            type="number"
                                            defaultValue={record.amount}
                                            onBlur={(e) => handleUpdate(record.id, 'amount', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : ( 
                                        <span className={record.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(record.amount)}
                                        </span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(record.id, 'status')} className="whitespace-nowrap px-3 py-2 text-sm cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'status' ? (
                                        <select
                                            defaultValue={record.status}
                                            onChange={(e) => handleUpdate(record.id, 'status', e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                            autoFocus
                                            className={inputClasses}
                                        >
                                            <option value="Paid">{t('status.paid')}</option>
                                            <option value="Pending">{t('status.pending')}</option>
                                            <option value="Overdue">{t('status.overdue')}</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>{t(`status.${record.status.toLowerCase()}`)}</span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(record.id, 'dueDate')} className="whitespace-nowrap px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'dueDate' ? (
                                        <input
                                            type="date"
                                            defaultValue={record.dueDate}
                                            onBlur={(e) => handleUpdate(record.id, 'dueDate', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : ( new Date(record.dueDate).toLocaleDateString() )}
                                </td>

                                <td className="whitespace-nowrap px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                                    {record.type === 'Incoming' ? 
                                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400"><TrendingUp size={16} /> {t('financials.incoming')}</span> : 
                                        <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400"><TrendingDown size={16} /> {t('financials.outgoing')}</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinancialsTab;