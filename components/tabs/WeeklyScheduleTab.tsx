import * as React from 'react';
import { ScheduleEvent } from '../../types';
import { Clock, Users, Calendar as CalendarIcon, PlusCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

// Helper functions for date manipulation
const getWeekDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });
};

const getMonthGrid = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    const startDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1; // Monday as 0
    
    const grid: (Date | null)[] = [];
    
    for (let i = 0; i < startDayOfWeek; i++) {
        grid.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        grid.push(new Date(year, month, i));
    }
    
    while (grid.length % 7 !== 0 || grid.length < 35) {
         grid.push(null);
    }

    return grid;
};

const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

// Component-specific helpers
const getTypeIcon = (type: string) => {
    const icons = { Meeting: <CalendarIcon size={14} className="text-blue-400 flex-shrink-0"/>, Call: <Users size={14} className="text-green-400 flex-shrink-0"/>, Event: <Clock size={14} className="text-purple-400 flex-shrink-0"/> };
    return icons[type as keyof typeof icons] || null;
}

interface DatePickerProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    onClose: () => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ selectedDate, onDateSelect, onClose }) => {
    const [viewDate, setViewDate] = React.useState(new Date(selectedDate));
    const { language, t } = useLanguage();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const handlePrevYear = () => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    const handleNextYear = () => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));

    const monthGrid = getMonthGrid(viewDate);
    const today = new Date();

    const weekDayLabels = [t('daysShort.mon'), t('daysShort.tue'), t('daysShort.wed'), t('daysShort.thu'), t('daysShort.fri'), t('daysShort.sat'), t('daysShort.sun')];

    return (
        <div className="absolute top-full mt-2 left-0 z-10 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-xl p-4 w-80">
            <div className="flex justify-between items-center mb-2">
                <button onClick={handlePrevYear} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"><ChevronsLeft size={16}/></button>
                <button onClick={handlePrevMonth} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"><ChevronLeft size={16}/></button>
                <div className="font-bold text-center">
                    {viewDate.toLocaleString(language, { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={handleNextMonth} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"><ChevronRight size={16}/></button>
                <button onClick={handleNextYear} className="p-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700"><ChevronsRight size={16}/></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {weekDayLabels.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 text-center text-sm">
                {monthGrid.map((day, index) => {
                    if (!day) return <div key={index} className="w-9 h-9" />;

                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);

                    return (
                        <button
                            key={index}
                            onClick={() => { onDateSelect(day); onClose(); }}
                            className={`
                                w-9 h-9 flex items-center justify-center rounded-full transition-colors
                                ${isSelected ? 'bg-[#32ff84] text-black font-bold' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700'}
                                ${isToday && !isSelected ? 'border border-neutral-300 dark:border-neutral-500' : ''}
                            `}
                        >
                            {day.getDate()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};


interface CalendarTabProps {
    data: ScheduleEvent[];
    canEdit: boolean;
    onOpenModal: (item: ScheduleEvent | Partial<ScheduleEvent>, type: 'schedule', isNew?: boolean) => void;
}

const CalendarTab: React.FC<CalendarTabProps> = ({ data, canEdit, onOpenModal }) => {
    const { t, language } = useLanguage();
    const [view, setView] = React.useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
    const datePickerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const weekDays = React.useMemo(() => getWeekDays(currentDate), [currentDate]);
    const monthGrid = React.useMemo(() => getMonthGrid(currentDate), [currentDate]);

    const handlePrev = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === 'week') {
                newDate.setDate(newDate.getDate() - 7);
            } else {
                newDate.setMonth(newDate.getMonth() - 1);
            }
            return newDate;
        });
    };

    const handleNext = () => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (view === 'week') {
                newDate.setDate(newDate.getDate() + 7);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };
    
    const handleToday = () => {
        setCurrentDate(new Date());
    }
    
    const handleAddNew = (date: Date) => {
        const day = date.toLocaleString('en-us', { weekday: 'long' }) as ScheduleEvent['day'];
        onOpenModal({ day, time: '12:00', title: '', participants: [], type: 'Meeting' }, 'schedule', true);
    }
    
    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
    };

    const today = new Date();
    
    const getEventsForDay = (day: Date): ScheduleEvent[] => {
         const dayOfWeek = day.toLocaleString('en-us', { weekday: 'long' });
         return data
            .filter(event => event.day === dayOfWeek)
            .sort((a,b) => a.time.localeCompare(b.time));
    }
    
    const weeklyEvents = React.useMemo(() => {
        const dayMap = {} as Record<ScheduleEvent['day'], ScheduleEvent[]>;
        const daysOfWeek: ScheduleEvent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        daysOfWeek.forEach(day => {
            dayMap[day] = [];
        });

        data.forEach(event => {
            if (dayMap[event.day]) {
                dayMap[event.day].push(event);
            }
        });

        daysOfWeek.forEach(day => {
            dayMap[day].sort((a, b) => a.time.localeCompare(b.time));
        });

        return dayMap;
    }, [data]);


    const renderWeekView = () => (
        <div className="overflow-x-auto bg-white dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-7 min-w-[980px] lg:min-w-full">
                {weekDays.map((day, index) => {
                    const dayName = day.toLocaleString(language, { weekday: 'long' });
                    const dayKey = day.toLocaleString('en-us', { weekday: 'long' }) as ScheduleEvent['day'];
                    const isToday = isSameDay(day, today);
                    return (
                         <div key={day.toISOString()} className={`flex flex-col min-w-[140px] ${index > 0 ? 'border-l border-neutral-200 dark:border-neutral-700' : ''} ${isToday ? 'bg-neutral-100/50 dark:bg-neutral-700/20' : ''}`}>
                            <div className={`p-3 font-bold text-center border-b border-neutral-200 dark:border-neutral-700 transition-colors ${isToday ? 'bg-[#32ff84]/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                                <div className="flex items-center justify-center gap-2">
                                    <span className={isToday ? 'text-[#32ff84]' : 'text-neutral-700 dark:text-neutral-300'}>{dayName}</span>
                                    <span className={`text-sm ${isToday ? 'text-black dark:text-white' : 'text-neutral-500'}`}>{day.getDate()}</span>
                                </div>
                            </div>
                            <div className="p-2 space-y-2 flex-grow min-h-[300px]">
                                {(weeklyEvents[dayKey] || []).map(event => (
                                    <div 
                                        key={event.id} 
                                        onClick={() => onOpenModal(event, 'schedule')} 
                                        className="bg-white dark:bg-neutral-900/50 p-3 rounded-md border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:border-[#32ff84]/50 transition-all text-left shadow"
                                    >
                                        <p className="text-sm font-bold text-black dark:text-white leading-tight break-words">{event.title}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500 dark:text-neutral-400">
                                            {getTypeIcon(event.type)}
                                            <span>{event.time}</span>
                                        </div>
                                    </div>
                                ))}
                                {canEdit && (
                                     <button 
                                        onClick={() => handleAddNew(day)}
                                        className="w-full flex items-center justify-center text-neutral-400 dark:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 hover:text-[#32ff84] rounded-md transition-colors py-2 group mt-2"
                                        aria-label={`${t('calendar.addEventTo')} ${dayName}`}
                                    >
                                         <PlusCircle size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderMonthView = () => {
        const monthDayLabels = [t('daysShort.mon'), t('daysShort.tue'), t('daysShort.wed'), t('daysShort.thu'), t('daysShort.fri'), t('daysShort.sat'), t('daysShort.sun')];
        return(
            <div className="bg-white dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-7 text-center font-bold text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                    {monthDayLabels.map(day => (
                        <div key={day} className="py-2">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-6">
                    {monthGrid.map((day, index) => {
                        const isToday = day ? isSameDay(day, today) : false;
                        const dayEvents = day ? getEventsForDay(day) : [];
                        return (
                            <div key={index} className={`relative h-32 p-2 border-b border-r border-neutral-200 dark:border-neutral-700 ${!day ? 'bg-neutral-100/50 dark:bg-neutral-800/30' : 'hover:bg-neutral-100/50 dark:hover:bg-neutral-700/30'} transition-colors`}>
                                {day && (
                                    <>
                                        <span className={`text-sm ${isToday ? 'bg-[#32ff84] text-black rounded-full w-6 h-6 flex items-center justify-center font-bold' : 'text-neutral-800 dark:text-neutral-200'}`}>{day.getDate()}</span>
                                        <div className="mt-1 space-y-1 overflow-y-auto max-h-20">
                                            {dayEvents.map(event => (
                                                <div key={event.id} onClick={() => onOpenModal(event, 'schedule')} className="text-xs text-left px-1 py-0.5 bg-blue-500/20 text-blue-500 dark:text-blue-300 rounded truncate cursor-pointer hover:bg-blue-500/40">{event.title}</div>
                                            ))}
                                        </div>
                                        {canEdit && (
                                            <button onClick={() => handleAddNew(day)} className="absolute bottom-1 right-1 text-neutral-400 dark:text-neutral-600 hover:text-[#32ff84] opacity-0 hover:opacity-100 transition-opacity"><PlusCircle size={16}/></button>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    };
    
    const currentRangeLabel = view === 'week' 
        ? `${weekDays[0].toLocaleDateString(language, { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' });

    return (
        <div className="animate-fade-in">
             <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrev} className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"><ChevronLeft size={20}/></button>
                         <button onClick={handleNext} className="p-2 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700"><ChevronRight size={20}/></button>
                    </div>
                    <button onClick={handleToday} className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 rounded-md text-sm font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-700">{t('calendar.today')}</button>
                    
                    <div className="relative" ref={datePickerRef}>
                        <button 
                            onClick={() => setIsDatePickerOpen(prev => !prev)} 
                            className="text-xl font-bold p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            aria-label={t('calendar.openPicker')}
                        >
                           {currentRangeLabel}
                        </button>
                        {isDatePickerOpen && (
                            <DatePicker
                                selectedDate={currentDate}
                                onDateSelect={handleDateSelect}
                                onClose={() => setIsDatePickerOpen(false)}
                            />
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1">
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'month' ? 'bg-[#32ff84] text-black' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{t('calendar.month')}</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'week' ? 'bg-[#32ff84] text-black' : 'hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}>{t('calendar.week')}</button>
                    </div>
                     {canEdit && (
                        <button onClick={() => handleAddNew(new Date())} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                            <PlusCircle size={18}/> {t('calendar.newEvent')}
                        </button>
                    )}
                </div>
            </div>
            
            {view === 'week' ? renderWeekView() : renderMonthView()}

        </div>
    );
};

export default CalendarTab;