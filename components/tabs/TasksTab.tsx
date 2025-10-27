import React, { useState, useMemo } from 'react';
import { Task, UserPermission, UserRole } from '../../types';
import { ArrowUp, ArrowDown, PlusCircle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface TasksTabProps {
    data: Task[];
    userRole: UserRole | null;
    onOpenModal: (item: Task | Partial<Task>, type: 'tasks', isNew?: boolean) => void;
    onUpdateTask: (taskId: string, field: keyof Task, value: any) => void;
    permissions: UserPermission[];
}

type SortKey = keyof Task;
type SortDirection = 'ascending' | 'descending';

const getPriorityColor = (priority: string) => {
    const colors = { High: 'bg-red-500/20 text-red-300', Medium: 'bg-yellow-500/20 text-yellow-300', Low: 'bg-blue-500/20 text-blue-300'};
    return colors[priority as keyof typeof colors] || 'bg-neutral-700';
}

const getStatusColor = (status: string) => {
    const colors = { 'To Do': 'bg-neutral-600 text-neutral-300', 'In Progress': 'bg-purple-500/20 text-purple-300', Done: 'bg-green-500/20 text-green-300' };
    return colors[status as keyof typeof colors] || 'bg-neutral-700';
}

const TasksTab: React.FC<TasksTabProps> = ({ data, userRole, onOpenModal, onUpdateTask, permissions }) => {
    const { t } = useLanguage();
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'dueDate', direction: 'ascending' });
    const [editingCell, setEditingCell] = useState<{ taskId: string; field: keyof Task } | null>(null);

    const canEdit = useMemo(() => {
        if (userRole === 'admin') return true;
        if (userRole === 'user') {
            const userPerms = permissions.find(p => p.userName === 'Demo User');
            return userPerms?.permissions?.tasks?.edit || false;
        }
        return false;
    }, [userRole, permissions]);

    const sortedData = useMemo(() => {
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                let comparison = 0;
                
                if (sortConfig.key === 'priority') {
                    const order = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    comparison = (order[aValue as keyof typeof order] || 0) - (order[bValue as keyof typeof order] || 0);
                } else if (sortConfig.key === 'status') {
                     const order = { 'To Do': 1, 'In Progress': 2, 'Done': 3 };
                     comparison = (order[aValue as keyof typeof order] || 0) - (order[bValue as keyof typeof order] || 0);
                } else if (sortConfig.key === 'dueDate') {
                    comparison = new Date(aValue).getTime() - new Date(bValue).getTime();
                } else {
                    comparison = String(aValue).localeCompare(String(bValue));
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'ascending' ? <ArrowUp size={14} className="text-[#32ff84]"/> : <ArrowDown size={14} className="text-[#32ff84]"/>;
    };

     const headers: { key: SortKey; label: string }[] = [
        { key: 'title', label: t('tasks.task') }, 
        { key: 'assignee', label: t('tasks.assignee') }, 
        { key: 'priority', label: t('tasks.priority') },
        { key: 'status', label: t('tasks.status') }, 
        { key: 'dueDate', label: t('tasks.dueDate') },
    ];
    
    const handleAddNew = () => {
        onOpenModal({ title: '', priority: 'Medium', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignee: ''}, 'tasks', true);
    }
    
    const handleCellClick = (taskId: string, field: keyof Task) => {
        if (canEdit) {
            setEditingCell({ taskId, field });
        }
    };

    const handleUpdate = (taskId: string, field: keyof Task, value: any) => {
        onUpdateTask(taskId, field, value);
        setEditingCell(null);
    };

    const inputClasses = "w-full bg-neutral-700 border-transparent focus:bg-neutral-600 rounded p-1.5 text-sm focus:ring-2 focus:ring-[#32ff84] focus:outline-none text-white";

    return (
        <div className="animate-fade-in">
             <div className="flex justify-end mb-4">
                {userRole === 'admin' && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        <PlusCircle size={18}/> {t('tasks.newTask')}
                    </button>
                )}
            </div>
            <div className="overflow-x-auto bg-neutral-800/50 rounded-lg border border-neutral-700">
                <table className="min-w-full divide-y divide-neutral-700">
                    <thead className="bg-neutral-800">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-white first:pl-4 first:sm:pl-6">
                                    <button onClick={() => requestSort(header.key)} className="flex items-center gap-2 group text-white hover:text-[#32ff84] transition-colors">
                                        {header.label} {getSortIcon(header.key)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 bg-neutral-900/50">
                        {sortedData.map((task) => (
                            <tr key={task.id} className="hover:bg-neutral-800/70 group">
                                <td onClick={() => onOpenModal(task, 'tasks')} className="w-1/3 py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 cursor-pointer">{task.title}</td>
                                
                                <td onClick={() => handleCellClick(task.id, 'assignee')} className="whitespace-nowrap px-3 py-2 text-sm text-neutral-400 cursor-pointer">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'assignee' ? (
                                        <input
                                            type="text"
                                            defaultValue={task.assignee}
                                            onBlur={(e) => handleUpdate(task.id, 'assignee', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : ( task.assignee )}
                                </td>
                                
                                <td onClick={() => handleCellClick(task.id, 'priority')} className="whitespace-nowrap px-3 py-2 text-sm cursor-pointer">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'priority' ? (
                                        <select
                                            defaultValue={task.priority}
                                            onChange={(e) => handleUpdate(task.id, 'priority', e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                            autoFocus
                                            className={inputClasses}
                                        >
                                            <option value="High">{t('priority.high')}</option>
                                            <option value="Medium">{t('priority.medium')}</option>
                                            <option value="Low">{t('priority.low')}</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}>{t(`priority.${task.priority.toLowerCase()}`)}</span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(task.id, 'status')} className="whitespace-nowrap px-3 py-2 text-sm cursor-pointer">
                                     {editingCell?.taskId === task.id && editingCell?.field === 'status' ? (
                                        <select
                                            defaultValue={task.status}
                                            onChange={(e) => handleUpdate(task.id, 'status', e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                            autoFocus
                                            className={inputClasses}
                                        >
                                            <option value="To Do">{t('taskStatus.ToDo')}</option>
                                            <option value="In Progress">{t('taskStatus.InProgress')}</option>
                                            <option value="Done">{t('taskStatus.Done')}</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>{t(`taskStatus.${task.status.replace(' ', '')}`)}</span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(task.id, 'dueDate')} className="whitespace-nowrap px-3 py-2 text-sm text-neutral-400 cursor-pointer">
                                    {editingCell?.taskId === task.id && editingCell?.field === 'dueDate' ? (
                                        <input
                                            type="date"
                                            defaultValue={task.dueDate}
                                            onBlur={(e) => handleUpdate(task.id, 'dueDate', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : ( task.dueDate )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TasksTab;