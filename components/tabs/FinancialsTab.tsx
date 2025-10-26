// FIX: Implemented the FinancialsTab component to display financial data.
import React from 'react';
import { Payment } from '../../types';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

const tagColorStyles: { [key: string]: { bg: string; text: string } } = {
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  red: { bg: 'bg-red-500/20', text: 'text-red-300' },
  green: { bg: 'bg-green-500/20', text: 'text-green-300' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  teal: { bg: 'bg-teal-500/20', text: 'text-teal-300' },
};

const FinancialsTab: React.FC<{ data: any }> = ({ data }) => {
    if (!data) return null;
    const { overview, payments, breakdown, categories } = data;

    return (
        <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
                    <div className="flex items-center text-neutral-400 gap-2"><DollarSign size={16} /> Total Amount</div>
                    <p className="text-2xl font-bold text-white mt-2">€{overview.total.toLocaleString()}</p>
                </div>
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
                    <div className="flex items-center text-green-400 gap-2"><TrendingUp size={16} /> Paid</div>
                    <p className="text-2xl font-bold text-white mt-2">€{overview.paid.toLocaleString()}</p>
                </div>
                <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
                    <div className="flex items-center text-orange-400 gap-2"><TrendingDown size={16} /> Total Pending</div>
                    <p className="text-2xl font-bold text-white mt-2">€{overview.totalPending.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
                <h3 className="text-xl font-bold text-white mb-4">Pending Payments</h3>
                <div className="space-y-3">
                    {payments.map((payment: Payment) => (
                        <div key={payment.id} className="flex justify-between items-center bg-neutral-900/50 p-3 rounded-lg">
                            <div>
                                <p className="font-semibold text-white">{payment.title}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {payment.tags.map(tag => (
                                        <span key={tag.text} className={`px-2 py-0.5 text-xs rounded-full ${tagColorStyles[tag.color]?.bg || ''} ${tagColorStyles[tag.color]?.text || ''}`}>
                                            {tag.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="font-bold text-lg text-white">€{payment.amount.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
                     <h3 className="text-xl font-bold text-white mb-4">Daily Breakdown</h3>
                     <ul className="space-y-2">
                        {Object.entries(breakdown).map(([day, amount]) => (
                            <li key={day} className="flex justify-between text-neutral-300">
                                <span>{day}</span>
                                <span className="font-mono">€{Number(amount).toLocaleString()}</span>
                            </li>
                        ))}
                     </ul>
                 </div>
                 <div className="bg-neutral-800 p-5 rounded-xl border border-neutral-700">
                     <h3 className="text-xl font-bold text-white mb-4">Categories</h3>
                      <ul className="space-y-2">
                        {Object.entries(categories).map(([category, amount]) => (
                            <li key={category} className="flex justify-between text-neutral-300">
                                <span>{category}</span>
                                <span className="font-mono">€{Number(amount).toLocaleString()}</span>
                            </li>
                        ))}
                     </ul>
                 </div>
             </div>
        </div>
    );
};

export default FinancialsTab;
