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
            case 'High': return 'bg-red-500';
            case 'Medium': return 'bg-yellow-500';
            case 'Low': return 'bg-blue-500';
            default: return 'bg-neutral-500';
        }
    }
    
    return (
        <div 
            draggable={canEdit}
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onOpenModal}
            className={`bg-white dark:bg-neutral-800 p-4 rounded-lg border border-slate-200 dark:border-neutral-700 ${canEdit ? 'cursor-grab' : 'cursor-default'} hover:bg-slate-50 dark:hover:bg-neutral-700/50 transition-colors shadow-sm`}
        >
            <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white break-words">{task.title}</p>
                <div className={`w-2.5 h-2.5 rounded-full ${getPriorityColor(task.priority)} flex-shrink-0 mt-1`}></div>
            </div>
            <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                    <p>{task.assignee}</p>
                    <p className="mt-0.5">{new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-[color:var(--drip-text-soft)] dark:text-neutral-300">
                    {task.assignee.substring(0,2).toUpperCase()}
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
            textClass: 'text-[#4ba586] dark:text-[color:rgba(141,209,183,1)]',
            bgClass: 'bg-[color:rgba(75,165,134,0.15)] dark:bg-[color:rgba(141,209,183,0.2)]',
            label: t('status.todo'),
        },
        'In Progress': {
            icon: <Loader size={16} />,
            textClass: 'text-[#f1c40f] dark:text-[color:rgba(255,232,127,1)]',
            bgClass: 'bg-[color:rgba(241,196,15,0.15)] dark:bg-[color:rgba(255,232,127,0.2)]',
            label: t('status.inprogress'),
        },
        Done: {
            icon: <CheckCircle size={16} />,
            textClass: 'text-[#47c25d] dark:text-[color:rgba(117,226,151,1)]',
            bgClass: 'bg-[color:rgba(71,194,93,0.15)] dark:bg-[color:rgba(117,226,151,0.2)]',
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
            className={`flex-1 min-w-[300px] bg-slate-100 dark:bg-neutral-900/50 rounded-lg p-3 transition-colors ${isDragOver ? 'bg-slate-200 dark:bg-neutral-700/50' : ''}`}
        >
            <div className={`flex items-center justify-between mb-4 px-2 py-1 rounded ${statusInfo[status].bgClass}`}>
                <div className={`flex items-center gap-2 font-semibold text-sm ${statusInfo[status].textClass}`}>
                    {statusInfo[status].icon}
                    <span>{statusInfo[status].label}</span>
                </div>
                <span className="text-sm font-bold text-[var(--drip-muted)]/80 dark:text-neutral-500">{tasks.length}</span>
            </div>
            <div className="space-y-3 h-full overflow-y-auto max-h-[calc(100vh-350px)] p-1">
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
             <div className="flex justify-between items-center mb-4">
                <div>
                     {/* Can add filters here later */}
                </div>
                {canEdit && (
                    <button onClick={() => onOpenModal({} as Task, 'tasks')} className="flex items-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                        <Plus size={18}/> {t('tasks.newTask')}
                    </button>
                )}
            </div>
            <div className="flex flex-col lg:flex-row gap-6">
                <TaskColumn status="To Do" tasks={tasksByStatus['To Do']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
                <TaskColumn status="In Progress" tasks={tasksByStatus['In Progress']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
                <TaskColumn status="Done" tasks={tasksByStatus['Done']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
            </div>
        </div>
    );
};

export default TasksTab;
