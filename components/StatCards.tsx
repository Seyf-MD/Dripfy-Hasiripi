import * as React from 'react';
import { Briefcase, Euro, Users, BarChart2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Task, Contact, ScheduleEvent, FinancialRecord } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subValue?: string;
  children?: React.ReactNode;
  delay: number;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subValue, children, delay, onClick }) => {
  const { theme } = useTheme();

  const containerClasses = theme === 'light'
    ? 'bg-[var(--drip-card)] border-[var(--drip-border)] hover:border-[var(--drip-primary)] hover:shadow-[0_18px_36px_-24px_rgba(75,165,134,0.65)]'
    : 'bg-neutral-800 border-neutral-700 hover:border-[var(--drip-primary)] hover:shadow-2xl hover:shadow-black/20';

  const labelColor = theme === 'light' ? 'text-[var(--drip-muted)]' : 'text-neutral-400';
  const valueColor = theme === 'light' ? 'text-[var(--drip-text)]' : 'text-white';
  const subValueColor = theme === 'light' ? 'text-[var(--drip-muted)]' : 'text-neutral-400';

  return (
    <div 
      onClick={onClick}
      className={`p-5 rounded-xl border flex flex-col justify-between h-full transition-all duration-300 hover:-translate-y-1 animate-slide-in-up ${containerClasses} ${onClick ? 'cursor-pointer' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div>
        <div className={`flex justify-between items-center ${labelColor}`}>
          <span className="text-sm font-medium">{title}</span>
          {icon}
        </div>
        <p className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</p>
        {subValue && <p className={`text-xs mt-1 ${subValueColor}`}>{subValue}</p>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

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
  const { theme } = useTheme();
  
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
        <div
          className="w-full rounded-full h-2 bg-slate-200 dark:bg-neutral-700"
          style={{ backgroundColor: theme === 'light' ? 'rgba(75, 165, 134, 0.25)' : undefined }}
        >
          <div
            className="h-2 rounded-full bg-[var(--drip-primary)]"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </StatCard>
    </div>
  );
};

export default StatCards;
