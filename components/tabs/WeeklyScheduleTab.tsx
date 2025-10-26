// FIX: Implemented the WeeklyScheduleTab component to display schedule data.
import React from 'react';
import { ScheduleItem } from '../../types';

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

const ScheduleCard: React.FC<{ item: ScheduleItem }> = ({ item }) => (
    <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 mb-3 transition-all duration-300 hover:border-[#32ff84]/50 hover:shadow-lg hover:shadow-black/20">
        <h4 className="font-semibold text-white">{item.title}</h4>
        <p className="text-sm text-neutral-400 mt-1">{item.assignees.join(', ')}</p>
        <div className="flex flex-wrap gap-2 mt-3">
            {item.tags.map(tag => (
                <span key={tag.text} className={`px-2 py-1 text-xs rounded-full ${tagColorStyles[tag.color]?.bg || 'bg-gray-500/20'} ${tagColorStyles[tag.color]?.text || 'text-gray-300'}`}>
                    {tag.text}
                </span>
            ))}
        </div>
    </div>
);

const WeeklyScheduleTab: React.FC<{ data: { germany: ScheduleItem[]; istanbul: ScheduleItem[] } }> = ({ data }) => {
    if (!data) return null;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Germany</h3>
                {data.germany.map(item => <ScheduleCard key={item.id} item={item} />)}
            </div>
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Istanbul</h3>
                {data.istanbul.map(item => <ScheduleCard key={item.id} item={item} />)}
            </div>
        </div>
    );
};

export default WeeklyScheduleTab;
