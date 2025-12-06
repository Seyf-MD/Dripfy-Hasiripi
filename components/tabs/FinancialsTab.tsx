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
    const colors = { 'Paid': 'bg-green-500/20 text-green-600 dark:text-green-300 ring-1 ring-green-500/30', 'Pending': 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-300 ring-1 ring-yellow-500/30', 'Overdue': 'bg-red-500/20 text-red-600 dark:text-red-300 ring-1 ring-red-500/30' };
    return colors[status as keyof typeof colors] || 'bg-neutral-500/20';
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
        return sortConfig.direction === 'ascending'
            ? <ArrowUp size={14} className="text-[var(--drip-primary)]" />
            : <ArrowDown size={14} className="text-[var(--drip-primary)]" />;
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

    const inputClasses = "w-full bg-white/10 border border-white/10 focus:bg-white/20 rounded-xl p-2 text-sm focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none text-[var(--drip-text)] dark:text-white transition-all backdrop-blur-sm";

    return (
        <div className="animate-fade-in">
            <div className="flex justify-end mb-6">
                {canEdit && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-full shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all">
                        <PlusCircle size={18} /> {t('financials.newRecord')}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto ios-glass rounded-3xl border border-white/20">
                <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-white/5 border-b border-white/10 text-[var(--drip-muted)] dark:text-neutral-400">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="py-4 px-4 text-left text-xs font-semibold uppercase tracking-wider first:pl-6">
                                    <button onClick={() => requestSort(header.key)} className="flex items-center gap-2 group hover:text-[var(--drip-primary)] transition-colors">
                                        {header.label} {getSortIcon(header.key)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-transparent">
                        {filteredAndSortedData.map((record) => (
                            <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                                <td onClick={() => onOpenModal(record, 'financials')} className="w-1/3 py-4 pl-6 pr-4 text-sm font-semibold text-[var(--drip-text)] dark:text-white cursor-pointer hover:text-[var(--drip-primary)] transition-colors">{record.description}</td>

                                <td onClick={() => handleCellClick(record.id, 'amount')} className="whitespace-nowrap px-4 py-4 text-sm font-medium cursor-pointer">
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
                                        <span className={record.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-[var(--drip-primary)]'}>
                                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(record.amount)}
                                        </span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(record.id, 'status')} className="whitespace-nowrap px-4 py-4 text-sm cursor-pointer">
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
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(record.status)}`}>{t(`status.${record.status.toLowerCase()}`)}</span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(record.id, 'dueDate')} className="whitespace-nowrap px-4 py-4 text-sm text-[var(--drip-muted)] dark:text-neutral-400 cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'dueDate' ? (
                                        <input
                                            type="date"
                                            defaultValue={record.dueDate}
                                            onBlur={(e) => handleUpdate(record.id, 'dueDate', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : (new Date(record.dueDate).toLocaleDateString())}
                                </td>

                                <td className="whitespace-nowrap px-4 py-4 text-sm text-[var(--drip-muted)] dark:text-neutral-400">
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
