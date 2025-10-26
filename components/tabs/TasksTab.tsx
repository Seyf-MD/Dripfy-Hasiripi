import React, { useState, useMemo } from 'react';
import { Task } from '../../types';
import { ArrowUp, ArrowDown, PlusCircle } from 'lucide-react';

interface TasksTabProps {
    data: Task[];
    userRole: 'admin' | 'user' | null;
    onOpenModal: (item: Task | Partial<Task>, type: 'tasks', isNew?: boolean) => void;
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

const TasksTab: React.FC<TasksTabProps> = ({ data, userRole, onOpenModal }) => {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'dueDate', direction: 'ascending' });

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
        { key: 'title', label: 'Task' }, { key: 'assignee', label: 'Assignee' }, { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' }, { key: 'dueDate', label: 'Due Date' },
    ];
    
    const handleAddNew = () => {
        onOpenModal({ title: '', priority: 'Medium', status: 'To Do', dueDate: new Date().toISOString().split('T')[0], assignee: ''}, 'tasks', true);
    }

    return (
        <div className="animate-fade-in">
             <div className="flex justify-end mb-4">
                {userRole === 'admin' && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-[#32ff84] text-black text-sm font-semibold rounded-lg hover:bg-green-400 transition-colors">
                        <PlusCircle size={18}/> New Task
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
                            <tr key={task.id} onClick={() => onOpenModal(task, 'tasks')} className="hover:bg-neutral-800/70 group cursor-pointer">
                                <td className="w-1/3 py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6">{task.title}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-400">{task.assignee}</td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span></td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm"><span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>{task.status}</span></td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-400">{task.dueDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TasksTab;