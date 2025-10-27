import * as React from 'react';
import { Briefcase, Euro, Users, BarChart2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Task, Contact, ScheduleEvent, FinancialRecord } from '../types';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subValue?: string;
  children?: React.ReactNode;
  delay: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subValue, children, delay, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-neutral-800 p-5 rounded-xl border border-slate-200 dark:border-neutral-700 flex flex-col justify-between h-full transition-all duration-300 hover:border-[#32ff84]/50 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 animate-slide-in-up ${onClick ? 'cursor-pointer' : ''}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div>
      <div className="flex justify-between items-center text-neutral-500 dark:text-neutral-400">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-neutral-800 dark:text-white mt-2">{value}</p>
      {subValue && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{subValue}</p>}
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

interface StatCardsProps {
  schedule: ScheduleEvent[];
  contacts: Contact[];
  tasks: Task[];
  financials: FinancialRecord[];
  setActiveTab: (tab: string) => void;
  onPendingPaymentsClick: () => void;
}

const StatCards: React.FC<StatCardsProps> = ({ schedule, contacts, tasks, financials, setActiveTab, onPendingPaymentsClick }) => {
  const { t } = useLanguage();
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'Done').length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const activePartnersCount = contacts.length;
  const totalMeetingsCount = schedule.length;

  const pendingPaymentsAmount = financials
    .filter(record => record.status === 'Pending')
    .reduce((sum, record) => sum + record.amount, 0);

  const formattedPendingPayments = new Intl.NumberFormat('de-DE').format(Math.abs(pendingPaymentsAmount));
  const pendingPaymentsValue = `€${formattedPendingPayments}`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      <StatCard
        delay={200}
        icon={<Briefcase size={20} />}
        title={t('statCards.totalMeetings')}
        value={totalMeetingsCount.toString()}
        subValue={t('statCards.meetingsThisWeek')}
        onClick={() => setActiveTab('Calendar')}
      />
      <StatCard
        delay={300}
        icon={<Euro size={20} />}
        title={t('statCards.pendingPayments')}
        value={pendingPaymentsValue}
        subValue={t('statCards.startThisWeek')}
        onClick={onPendingPaymentsClick}
      />
      <StatCard
        delay={400}
        icon={<Users size={20} />}
        title={t('statCards.activePartners')}
        value={activePartnersCount.toString()}
        subValue={t('statCards.acrossAllRegions')}
        onClick={() => setActiveTab('Contacts')}
      />
      <StatCard
        delay={500}
        icon={<BarChart2 size={20} />}
        title={t('statCards.taskCompletion')}
        value={`${completionPercentage}%`}
        onClick={() => setActiveTab('Tasks')}
      >
        <div className="w-full bg-slate-200 dark:bg-neutral-700 rounded-full h-2">
          <div className="bg-[#32ff84] h-2 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
        </div>
      </StatCard>
    </div>
  );
};

export default StatCards;