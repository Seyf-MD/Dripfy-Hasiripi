
import React from 'react';
import { Plus, CreditCard, UserPlus, FileText } from 'lucide-react';

const QuickActionButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <button className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors">
    {icon}
    <span>{label}</span>
  </button>
);

const QuickActions: React.FC = () => {
  return (
    <div className="mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-semibold text-slate-700">Quick Actions</h3>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <QuickActionButton icon={<Plus size={16} />} label="New Meeting" />
          <QuickActionButton icon={<CreditCard size={16} />} label="Add Payment" />
          <QuickActionButton icon={<UserPlus size={16} />} label="New Contact" />
          <QuickActionButton icon={<FileText size={16} />} label="Generate Report" />
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
