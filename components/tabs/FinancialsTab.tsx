import React from 'react';
import { FinancialRecord } from '../../types';
import { PlusCircle, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface FinancialsTabProps {
    data: FinancialRecord[];
    userRole: 'admin' | 'user' | null;
    onOpenModal: (item: FinancialRecord | Partial<FinancialRecord>, type: 'financials', isNew?: boolean) => void;
}

const FinancialsTab: React.FC<FinancialsTabProps> = ({ data, userRole, onOpenModal }) => {
    const { t } = useLanguage();

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Paid': return 'bg-green-500/20 text-green-300';
            case 'Pending': return 'bg-yellow-500/20 text-yellow-300';
            case 'Overdue': return 'bg-red-500/20 text-red-300';
            default: return 'bg-neutral-700';
        }
    };

    const handleAddNew = () => {
        onOpenModal({ description: '', amount: 0, status: 'Pending', dueDate: new Date().toISOString().split('T')[0], type: 'Outgoing' }, 'financials', true);
    }
    
    return (
        <div className="animate-fade-in">
             <div className="flex justify-end mb-4">
                {userRole === 'admin' && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        <PlusCircle size={18}/> {t('financials.newRecord')}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto bg-neutral-800/50 rounded-lg border border-neutral-700">
                <table className="min-w-full divide-y divide-neutral-700">
                    <thead className="bg-neutral-800">
                        <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">{t('financials.description')}</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">{t('financials.amount')}</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">{t('financials.status')}</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">{t('financials.dueDate')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                        {data.map((record) => (
                            <tr key={record.id} onClick={() => onOpenModal(record, 'financials')} className="hover:bg-neutral-800/70 group cursor-pointer">
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                    <div className="flex items-center">
                                        {record.type === 'Incoming' 
                                            ? <ArrowUpCircle size={20} className="text-green-400 mx-3" />
                                            : <ArrowDownCircle size={20} className="text-red-400 mx-3" />
                                        }
                                        <div className="font-medium text-white">{record.description}</div>
                                    </div>
                                </td>
                                <td className={`whitespace-nowrap px-3 py-4 text-sm font-semibold ${record.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    €{Math.abs(record.amount).toLocaleString('de-DE')}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                                        {t(`status.${record.status.toLowerCase()}`)}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-400">{record.dueDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinancialsTab;