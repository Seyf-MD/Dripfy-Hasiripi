import * as React from 'react';
import { Task } from '../../types';
import { Plus, CheckCircle, Clock, Loader } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TasksTabProps {
    data: Task[];
    canEdit: boolean;
    onOpenModal: (item: Task, type: 'tasks') => void;
    onUpdateStatus: (taskId: string, newStatus: Task['status']) => void;
}

type TaskStatus = 'To Do' | 'In Progress' | 'Done';

const TaskCard: React.FC<{ task: Task; onOpenModal: () => void; onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void; canEdit: boolean; }> = ({ task, onOpenModal, onDragStart, canEdit }) => {

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
            case 'Medium': return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]';
            case 'Low': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
            default: return 'bg-neutral-500';
        }
    }

    return (
        <div
            draggable={canEdit}
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onOpenModal}
            className={`
                ios-card bg-white/40 dark:bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 
                ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} 
                hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 group relative overflow-hidden
            `}
        >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 pointer-events-none" />

            <div className="relative z-10 flex justify-between items-start">
                <p className="text-sm font-bold text-[var(--drip-text)] dark:text-white break-words leading-tight">{task.title}</p>
                <div className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(task.priority)} flex-shrink-0 mt-1.5`} />
            </div>
            <div className="relative z-10 flex items-center justify-between mt-4">
                <div className="text-xs font-medium text-[var(--drip-muted)]/70 dark:text-neutral-400">
                    <p>{task.assignee}</p>
                    <p className="mt-0.5 opacity-80">{new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-[var(--drip-text)] dark:text-white border border-white/10 shadow-inner">
                    {task.assignee.substring(0, 2).toUpperCase()}
                </div>
            </div>
        </div>
    )
}

const TaskColumn: React.FC<{
    status: TaskStatus;
    tasks: Task[];
    onOpenModal: (task: Task) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
    canEdit: boolean;
}> = ({ status, tasks, onOpenModal, onDragStart, onDrop, canEdit }) => {
    const { t } = useLanguage();
    const [isDragOver, setIsDragOver] = React.useState(false);

    const statusInfo = {
        'To Do': {
            icon: <Clock size={16} />,
            textClass: 'text-[var(--drip-primary)]',
            bgClass: 'bg-[var(--drip-primary)]/10 border-[var(--drip-primary)]/20',
            label: t('status.todo'),
        },
        'In Progress': {
            icon: <Loader size={16} />,
            textClass: 'text-amber-500',
            bgClass: 'bg-amber-500/10 border-amber-500/20',
            label: t('status.inprogress'),
        },
        Done: {
            icon: <CheckCircle size={16} />,
            textClass: 'text-emerald-500',
            bgClass: 'bg-emerald-500/10 border-emerald-500/20',
            label: t('status.done'),
        },
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (canEdit) {
            setIsDragOver(true);
        }
    }

    const handleDragLeave = () => {
        setIsDragOver(false);
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (canEdit) {
            onDrop(e, status);
        }
        setIsDragOver(false);
    }

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
                flex-1 min-w-[300px] ios-glass rounded-3xl p-4 transition-all duration-300 border border-white/10
                ${isDragOver ? 'bg-white/10 shadow-inner scale-[1.01]' : ''}
            `}
        >
            <div className={`flex items-center justify-between mb-4 px-4 py-3 rounded-2xl border backdrop-blur-sm ${statusInfo[status].bgClass}`}>
                <div className={`flex items-center gap-2.5 font-bold text-sm ${statusInfo[status].textClass}`}>
                    {statusInfo[status].icon}
                    <span>{statusInfo[status].label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-white/20 ${statusInfo[status].textClass}`}>{tasks.length}</span>
            </div>
            <div className="space-y-3 h-full overflow-y-auto max-h-[calc(100vh-350px)] p-1 scrollbar-hide">
                {tasks.map(task => (
                    <TaskCard key={task.id} task={task} onOpenModal={() => onOpenModal(task)} onDragStart={onDragStart} canEdit={canEdit} />
                ))}
            </div>
        </div>
    )
}

const TasksTab: React.FC<TasksTabProps> = ({ data, canEdit, onOpenModal, onUpdateStatus }) => {
    const { t } = useLanguage();

    const tasksByStatus = React.useMemo(() => {
        const columns: Record<TaskStatus, Task[]> = {
            'To Do': [],
            'In Progress': [],
            'Done': [],
        };
        data.forEach(task => {
            if (columns[task.status as TaskStatus]) {
                columns[task.status as TaskStatus].push(task);
            }
        });
        // Sort tasks within each column by priority
        for (const status in columns) {
            columns[status as TaskStatus].sort((a, b) => {
                const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
        }
        return columns;
    }, [data]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
        const taskId = e.dataTransfer.getData("taskId");
        const task = data.find(t => t.id === taskId);
        if (task && task.status !== newStatus) {
            onUpdateStatus(taskId, newStatus);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    {/* Can add filters here later */}
                </div>
                {canEdit && (
                    <button onClick={() => onOpenModal({} as Task, 'tasks')} className="flex items-center gap-2 px-5 py-2.5 bg-[var(--drip-primary)] text-white text-sm font-bold rounded-full shadow-lg shadow-[var(--drip-primary)]/30 hover:shadow-[var(--drip-primary)]/50 hover:-translate-y-0.5 transition-all">
                        <Plus size={18} /> {t('tasks.newTask')}
                    </button>
                )}
            </div>
            <div className="flex flex-col lg:flex-row gap-6 pb-4">
                <TaskColumn status="To Do" tasks={tasksByStatus['To Do']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
                <TaskColumn status="In Progress" tasks={tasksByStatus['In Progress']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
                <TaskColumn status="Done" tasks={tasksByStatus['Done']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
            </div>
        </div>
    );
};

export default TasksTab;
