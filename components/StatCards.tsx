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

  // iOS 26 Card Styles
  const containerClasses = `
    ios-glass ios-card relative overflow-hidden
    ${theme === 'light'
      ? 'hover:shadow-[0_20px_40px_-12px_rgba(75,165,134,0.25)]'
      : 'hover:shadow-[0_20px_40px_-12px_rgba(75,165,134,0.4)]'}
  `;

  return (
    <div
      onClick={onClick}
      className={`p-6 flex flex-col justify-between h-full transition-all duration-500 hover:-translate-y-2 animate-slide-in-up ${containerClasses} ${onClick ? 'cursor-pointer group' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glowing Edge Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--drip-primary)] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--drip-primary)] to-transparent" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <span className={`text-sm font-semibold tracking-wide uppercase opacity-70 ${theme === 'light' ? 'text-[var(--drip-muted)]' : 'text-neutral-400'}`}>
            {title}
          </span>
          <div className={`p-2 rounded-xl ${theme === 'light' ? 'bg-[rgba(75,165,134,0.1)] text-[var(--drip-primary)]' : 'bg-white/10 text-[var(--drip-primary)]'}`}>
            {icon}
          </div>
        </div>

        <div className="space-y-1">
          <p className={`text-4xl font-bold tracking-tight ${theme === 'light' ? 'text-[var(--drip-text)]' : 'text-[var(--drip-dark-text)]'}`}>
            {value}
          </p>
          {subValue && (
            <p className={`text-xs font-medium ${theme === 'light' ? 'text-[var(--drip-muted)]' : 'text-neutral-500'}`}>
              {subValue}
            </p>
          )}
        </div>
      </div>

      {children && <div className="mt-6 relative z-10">{children}</div>}

      {/* Background Gradient Blob */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-transform duration-700 group-hover:scale-150 ${theme === 'light' ? 'bg-[var(--drip-primary)]' : 'bg-[var(--drip-primary)]'}`} />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 px-2">
      <StatCard
        delay={100}
        icon={<Briefcase size={20} />}
        title={t('statCards.totalMeetings')}
        value={totalMeetingsCount.toString()}
        subValue={t('statCards.meetingsThisWeek')}
        onClick={() => setActiveTab('Calendar')}
      />
      <StatCard
        delay={200}
        icon={<Euro size={20} />}
        title={t('statCards.pendingPayments')}
        value={pendingPaymentsValue}
        subValue={t('statCards.startThisWeek')}
        onClick={onPendingPaymentsClick}
      />
      <StatCard
        delay={300}
        icon={<Users size={20} />}
        title={t('statCards.activePartners')}
        value={activePartnersCount.toString()}
        subValue={t('statCards.acrossAllRegions')}
        onClick={() => setActiveTab('Contacts')}
      />
      <StatCard
        delay={400}
        icon={<BarChart2 size={20} />}
        title={t('statCards.taskCompletion')}
        value={`${completionPercentage}%`}
        onClick={() => setActiveTab('Tasks')}
      >
        <div className="w-full rounded-full h-1.5 bg-gray-200/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-1000 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </StatCard>
    </div>
  );
};

export default StatCards;
