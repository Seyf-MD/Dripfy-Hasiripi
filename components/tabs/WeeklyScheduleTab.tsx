import React from 'react';
import { ScheduleEvent } from '../../types';
import { Clock, Users, Calendar, PlusCircle } from 'lucide-react';

interface WeeklyScheduleTabProps {
    data: ScheduleEvent[];
    userRole: 'admin' | 'user' | null;
    onOpenModal: (item: ScheduleEvent | Partial<ScheduleEvent>, type: 'schedule', isNew?: boolean) => void;
}

const getDayColor = (day: string) => {
    const colors: { [key: string]: string } = {
        Monday: 'text-red-300', Tuesday: 'text-orange-300', Wednesday: 'text-yellow-300',
        Thursday: 'text-green-300', Friday: 'text-blue-300', Saturday: 'text-indigo-300',
        Sunday: 'text-purple-300',
    };
    return colors[day] || 'text-neutral-300';
}

const getTypeIcon = (type: string) => {
    const icons = { Meeting: <Calendar size={14} className="text-blue-400 flex-shrink-0"/>, Call: <Users size={14} className="text-green-400 flex-shrink-0"/>, Event: <Clock size={14} className="text-purple-400 flex-shrink-0"/> };
    return icons[type as keyof typeof icons] || null;
}

const WeeklyScheduleTab: React.FC<WeeklyScheduleTabProps> = ({ data, userRole, onOpenModal }) => {
    const daysOfWeek: ScheduleEvent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date().toLocaleString('en-us', { weekday: 'long' });

    const groupedByDay = daysOfWeek.reduce((acc, day) => {
        acc[day] = data.filter(event => event.day === day).sort((a,b) => a.time.localeCompare(b.time));
        return acc;
    }, {} as Record<ScheduleEvent['day'], ScheduleEvent[]>);

    const handleAddNew = (day: ScheduleEvent['day']) => {
        onOpenModal({ day, time: '12:00', title: '', participants: [], type: 'Meeting' }, 'schedule', true);
    }

    return (
        <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold">Weekly Calendar</h2>
                 {userRole === 'admin' && (
                    <button onClick={() => handleAddNew('Monday')} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        <PlusCircle size={18}/> New Event
                    </button>
                )}
            </div>

            <div className="overflow-x-auto bg-neutral-800/50 rounded-lg border border-neutral-700">
                <div className="grid grid-cols-7 min-w-[980px] lg:min-w-full">
                    {daysOfWeek.map((day, index) => (
                        <div key={day} className={`flex flex-col min-w-[140px] ${index > 0 ? 'border-l border-neutral-700' : ''} ${day === today ? 'bg-neutral-700/20' : ''}`}>
                            <div className={`p-3 font-bold text-center border-b border-neutral-700 transition-colors ${day === today ? 'bg-[#32ff84]/10' : 'bg-neutral-800'}`}>
                                <div className="flex items-center justify-center gap-2">
                                    <span className={getDayColor(day)}>{day}</span>
                                    {day === today && <span className="text-xs font-semibold bg-[#32ff84] text-black px-1.5 py-0.5 rounded-full">Today</span>}
                                </div>
                            </div>
                            <div className="p-2 space-y-2 flex-grow min-h-[300px]">
                                {groupedByDay[day].map(event => (
                                    <div 
                                        key={event.id} 
                                        onClick={() => onOpenModal(event, 'schedule')} 
                                        className="bg-neutral-900/50 p-3 rounded-md border border-neutral-700 cursor-pointer hover:bg-neutral-700/50 hover:border-[#32ff84]/50 transition-all text-left shadow"
                                    >
                                        <p className="text-sm font-bold text-white leading-tight break-words">{event.title}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-400">
                                            {getTypeIcon(event.type)}
                                            <span>{event.time}</span>
                                        </div>
                                    </div>
                                ))}
                                {userRole === 'admin' && (
                                     <button 
                                        onClick={() => handleAddNew(day)}
                                        className="w-full flex items-center justify-center text-neutral-600 hover:bg-neutral-700/50 hover:text-[#32ff84] rounded-md transition-colors py-2 group mt-2"
                                        aria-label={`Add event to ${day}`}
                                    >
                                         <PlusCircle size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeeklyScheduleTab;