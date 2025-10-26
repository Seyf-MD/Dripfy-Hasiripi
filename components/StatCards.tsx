import React from 'react';
import { Briefcase, Euro, Users, BarChart2 } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subValue?: string;
  children?: React.ReactNode;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subValue, children, delay }) => (
  <div 
    className="bg-neutral-800 p-5 rounded-xl border border-neutral-700 flex flex-col justify-between h-full transition-all duration-300 hover:border-[#32ff84]/50 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1 animate-slide-in-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div>
      <div className="flex justify-between items-center text-neutral-400">
        <span className="text-sm font-medium">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {subValue && <p className="text-xs text-neutral-500 mt-1">{subValue}</p>}
    </div>
    {children && <div className="mt-4">{children}</div>}
  </div>
);

const StatCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
      <StatCard
        delay={200}
        icon={<Briefcase size={20} />}
        title="Total Meetings"
        value="53"
        subValue="+5 this limited week"
      />
      <StatCard
        delay={300}
        icon={<Euro size={20} />}
        title="Pending Payments"
        value="€64.100"
        subValue="Start this week"
      />
      <StatCard
        delay={400}
        icon={<Users size={20} />}
        title="Active Escrows"
        value="35"
        subValue="In compensation"
      />
      <StatCard
        delay={500}
        icon={<BarChart2 size={20} />}
        title="Test Condition"
        value="72%"
      >
        <div className="w-full bg-neutral-700 rounded-full h-2">
          <div className="bg-[#32ff84] h-2 rounded-full" style={{ width: '72%' }}></div>
        </div>
      </StatCard>
    </div>
  );
};

export default StatCards;