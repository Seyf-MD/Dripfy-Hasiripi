import * as React from 'react';
import { ScheduleEvent } from '../../types';
import { Clock, Users, Calendar as CalendarIcon, PlusCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../context/ThemeContext';

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
const getCreatorInitials = (name?: string) => {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

const getTypeIcon = (type: string) => {
    const icons = { Meeting: <CalendarIcon size={14} className="text-blue-500 flex-shrink-0" />, Call: <Users size={14} className="text-green-500 flex-shrink-0" />, Event: <Clock size={14} className="text-purple-500 flex-shrink-0" /> };
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
    const { theme } = useTheme();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const handlePrevYear = () => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    const handleNextYear = () => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));

    const monthGrid = getMonthGrid(viewDate);
    const today = new Date();

    const weekDayLabels = [t('daysShort.mon'), t('daysShort.tue'), t('daysShort.wed'), t('daysShort.thu'), t('daysShort.fri'), t('daysShort.sat'), t('daysShort.sun')];

    // DatePicker now uses iOS glass style
    return (
        <div className="absolute top-full mt-4 left-0 z-50 ios-glass rounded-2xl p-4 w-80 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevYear} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><ChevronsLeft size={16} /></button>
                <button onClick={handlePrevMonth} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><ChevronLeft size={16} /></button>
                <div className="font-bold text-center tracking-wide">
                    {viewDate.toLocaleString(language, { month: 'long', year: 'numeric' })}
                </div>
                <button onClick={handleNextMonth} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><ChevronRight size={16} /></button>
                <button onClick={handleNextYear} className="p-1.5 rounded-full hover:bg-white/20 transition-colors"><ChevronsRight size={16} /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold opacity-60 mb-2">
                {weekDayLabels.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 text-center text-sm gap-y-1">
                {monthGrid.map((day, index) => {
                    if (!day) return <div key={index} className="w-9 h-9" />;

                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);

                    return (
                        <button
                            key={index}
                            onClick={() => { onDateSelect(day); onClose(); }}
                            className={`
                                w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300
                                ${isSelected
                                    ? 'bg-[var(--drip-primary)] text-white shadow-lg scale-105'
                                    : 'hover:bg-white/20 hover:scale-110 active:scale-95'}
                                ${isToday && !isSelected ? 'border-2 border-[var(--drip-primary)]/50' : ''}
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
    onUpdateEvent: (eventId: string, newDay: string) => void;
}

const CalendarTab: React.FC<CalendarTabProps> = ({ data, canEdit, onOpenModal, onUpdateEvent }) => {
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const [view, setView] = React.useState<'week' | 'month'>('week');
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
    const datePickerRef = React.useRef<HTMLDivElement>(null);
    const [dragOverDay, setDragOverDay] = React.useState<string | null>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
        e.dataTransfer.setData("eventId", eventId);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, dayKey: string) => {
        e.preventDefault();
        if (canEdit) {
            e.dataTransfer.dropEffect = "move";
            setDragOverDay(dayKey);
        }
    };

    const handleDragLeave = () => {
        setDragOverDay(null);
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, dayKey: string) => {
        e.preventDefault();
        setDragOverDay(null);
        const eventId = e.dataTransfer.getData("eventId");
        if (canEdit && eventId) {
            onUpdateEvent(eventId, dayKey);
        }
    };


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
        // Format date as YYYY-MM-DD using local time
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const dayOfMonth = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${dayOfMonth}`;

        onOpenModal({ day, date: dateString, time: '12:00', title: '', participants: [], type: 'Meeting' }, 'schedule', true);
    }

    const handleDateSelect = (date: Date) => {
        setCurrentDate(date);
    };

    const today = new Date();

    const getEventsForDay = (day: Date): ScheduleEvent[] => {
        const dayOfWeek = day.toLocaleString('en-us', { weekday: 'long' });
        return data
            .filter(event => event.day === dayOfWeek)
            .sort((a, b) => a.time.localeCompare(b.time));
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
        <div className="overflow-x-auto ios-glass rounded-3xl pb-2">
            <div className="grid grid-cols-7 min-w-[980px] lg:min-w-full">
                {weekDays.map((day, index) => {
                    const dayName = day.toLocaleString(language, { weekday: 'long' });
                    const dayKey = day.toLocaleString('en-us', { weekday: 'long' }) as ScheduleEvent['day'];
                    const isToday = isSameDay(day, today);
                    const isDragTarget = dragOverDay === dayKey;

                    return (
                        <div
                            key={day.toISOString()}
                            className={`
                                flex flex-col min-w-[140px] transition-colors duration-300
                                ${index > 0 ? 'border-l border-black/5 dark:border-white/10' : ''} 
                                ${isToday ? 'bg-white/5' : ''}
                                ${isDragTarget ? 'bg-[var(--drip-primary)]/10 shadow-inner' : ''}
                            `}
                            onDragOver={(e) => handleDragOver(e, dayKey)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, dayKey)}
                        >
                            <div className={`p-4 font-bold text-center border-b border-black/5 dark:border-white/10 transition-colors ${isToday ? 'bg-[var(--drip-primary)]/10' : ''}`}>
                                <div className="flex flex-col items-center justify-center gap-1">
                                    <span className={`text-xs uppercase tracking-widest ${isToday ? 'text-[var(--drip-primary)]' : 'opacity-60'}`}>{dayName}</span>
                                    <span className={`text-2xl font-light ${isToday ? 'text-[var(--drip-primary)]' : ''}`}>{day.getDate()}</span>
                                </div>
                            </div>
                            <div className="p-3 space-y-3 flex-grow min-h-[300px]">
                                {(weeklyEvents[dayKey] || []).map(event => (
                                    <div
                                        key={event.id}
                                        draggable={canEdit}
                                        onDragStart={(e) => handleDragStart(e, event.id)}
                                        onClick={() => onOpenModal(event, 'schedule')}
                                        className={`
                                            ios-card relative bg-white/40 dark:bg-black/20 backdrop-blur-sm p-3 rounded-2xl border border-black/5 dark:border-white/10 
                                            hover:bg-white/60 dark:hover:bg-white/10 transition-all text-left group
                                            ${canEdit ? 'cursor-grab active:cursor-grabbing hover:shadow-lg hover:-translate-y-0.5' : 'cursor-default'}
                                        `}
                                    >
                                        <p className="text-sm font-semibold leading-tight break-words group-hover:text-[var(--drip-primary)] transition-colors pr-4">{event.title}</p>
                                        <div className="flex items-center gap-1.5 mt-2 text-xs opacity-70">
                                            {getTypeIcon(event.type)}
                                            <span>{event.time}</span>
                                        </div>
                                        {event.creator && (
                                            <div className="absolute bottom-2 right-2 group/tooltip z-10">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-transparent border border-white/20 shadow-sm backdrop-blur-md transition-transform hover:scale-110 cursor-help">
                                                    <span className="text-[9px] font-extrabold text-[var(--drip-primary)] tracking-tight">
                                                        {getCreatorInitials(event.creator)}
                                                    </span>
                                                </div>

                                                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-white/20 text-[var(--drip-text)] dark:text-white text-xs font-medium rounded-xl shadow-xl whitespace-nowrap opacity-0 translate-y-2 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:translate-y-0 group-hover/tooltip:scale-100 transition-all duration-300 origin-bottom-right pointer-events-none">
                                                    {event.creator}
                                                    <div className="absolute -bottom-1 right-2 w-2 h-2 bg-white/80 dark:bg-neutral-900/80 border-r border-b border-white/20 transform rotate-45"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {canEdit && (
                                    <button
                                        onClick={() => handleAddNew(day)}
                                        className="w-full flex items-center justify-center opacity-40 hover:opacity-100 hover:text-[var(--drip-primary)] rounded-xl transition-all py-3 group mt-auto hover:bg-white/10"
                                    >
                                        <PlusCircle size={20} className="transition-transform group-hover:scale-110" />
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
        return (
            <div className="ios-glass rounded-3xl overflow-hidden p-6">
                <div className="grid grid-cols-7 text-center font-bold opacity-60 border-b border-black/5 dark:border-white/10 pb-4 mb-4">
                    {monthDayLabels.map(day => (
                        <div key={day} className="text-sm uppercase tracking-wide">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {monthGrid.map((day, index) => {
                        const isToday = day ? isSameDay(day, today) : false;
                        const dayEvents = day ? getEventsForDay(day) : [];
                        const dayWeekName = day ? day.toLocaleString('en-us', { weekday: 'long' }) : null;
                        const isDragTarget = dayWeekName && dragOverDay === dayWeekName;

                        return (
                            <div key={index}
                                className={`
                                    relative min-h-[120px] p-2 rounded-2xl border border-black/5 dark:border-white/5 transition-all
                                    ${!day ? 'border-none' : 'hover:bg-white/5 hover:border-black/10 dark:hover:border-white/10 hover:shadow-lg hover:-translate-y-1'} 
                                    ${isToday ? 'bg-[var(--drip-primary)]/5 border-[var(--drip-primary)]/20 shadow-inner' : ''}
                                    ${isDragTarget ? 'bg-[var(--drip-primary)]/10 shadow-inner scale-[1.02]' : ''}
                                `}
                                onDragOver={(e) => dayWeekName && handleDragOver(e, dayWeekName)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => dayWeekName && handleDrop(e, dayWeekName)}
                            >
                                {day && (
                                    <>
                                        <div className={`text-sm font-medium mb-2 ${isToday ? 'text-[var(--drip-primary)]' : 'opacity-80'}`}>
                                            {day.getDate()}
                                        </div>
                                        <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                                            {dayEvents.map(event => (
                                                <div
                                                    key={event.id}
                                                    draggable={canEdit}
                                                    onDragStart={(e) => handleDragStart(e, event.id)}
                                                    onClick={() => onOpenModal(event, 'schedule')}
                                                    className={`
                                                        text-[10px] px-2 py-1 bg-[var(--drip-primary)]/10 text-[var(--drip-primary)] rounded-lg truncate transition-colors
                                                        ${canEdit ? 'cursor-grab active:cursor-grabbing hover:bg-[var(--drip-primary)]/30' : 'cursor-pointer hover:bg-[var(--drip-primary)]/20'}
                                                    `}
                                                >
                                                    {event.title}
                                                </div>
                                            ))}
                                        </div>
                                        {canEdit && (
                                            <button onClick={() => handleAddNew(day)} className="absolute bottom-2 right-2 opacity-0 hover:opacity-100 text-[var(--drip-primary)] transition-all transform hover:scale-110">
                                                <PlusCircle size={18} />
                                            </button>
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
        <div className="animate-fade-in w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-6 p-2 rounded-2xl ios-glass">
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrev} className="p-2 rounded-full hover:bg-white/20 transition-all active:scale-95"><ChevronLeft size={20} /></button>
                        <button onClick={handleNext} className="p-2 rounded-full hover:bg-white/20 transition-all active:scale-95"><ChevronRight size={20} /></button>
                    </div>
                    <button onClick={handleToday} className="px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-white/20 transition-colors bg-white/5 border border-white/10 shadow-sm">{t('calendar.today')}</button>

                    <div className="relative" ref={datePickerRef}>
                        <button
                            onClick={() => setIsDatePickerOpen(prev => !prev)}
                            className="text-lg font-bold px-3 py-1 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2"
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

                <div className="flex items-center gap-3">
                    <div className="flex items-center p-1 rounded-full ios-glass">
                        <button onClick={() => setView('month')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 ${view === 'month' ? 'bg-[var(--drip-primary)] text-white shadow-md' : 'hover:bg-white/10'}`}>{t('calendar.month')}</button>
                        <button onClick={() => setView('week')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-300 ${view === 'week' ? 'bg-[var(--drip-primary)] text-white shadow-md' : 'hover:bg-white/10'}`}>{t('calendar.week')}</button>
                    </div>
                    {canEdit && (
                        <button onClick={() => handleAddNew(new Date())} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-full shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all">
                            <PlusCircle size={18} /> {t('calendar.newEvent')}
                        </button>
                    )}
                </div>
            </div>

            {view === 'week' ? renderWeekView() : renderMonthView()}

        </div>
    );
};

export default CalendarTab;
