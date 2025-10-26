// FIX: Implemented the TasksTab component to display task data.
import React from 'react';
import { Task } from '../../types';
import { Circle, CheckCircle2, AlertTriangle } from 'lucide-react';

const tagColorStyles: { [key: string]: { bg: string; text: string } } = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  green: { bg: 'bg-green-500/20', text: 'text-green-300' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  gray: { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-300' },
};

const priorityIcons: { [key: string]: React.ReactNode } = {
    high: <AlertTriangle size={16} className="text-red-400" />,
    medium: <AlertTriangle size={16} className="text-yellow-400" />,
    low: <AlertTriangle size={16} className="text-green-400" />,
};

const statusIcons: { [key: string]: React.ReactNode } = {
    'in-progress': <Circle size={16} className="text-blue-400 animate-pulse" />,
    'pending': <Circle size={16} className="text-yellow-400" />,
    'completed': <CheckCircle2 size={16} className="text-green-400" />,
};

const TasksTab: React.FC<{ data: Task[] }> = ({ data }) => {
    if (!data) return null;
    return (
        <div className="animate-fade-in bg-neutral-800 p-5 rounded-xl border border-neutral-700">
            <h3 className="text-xl font-bold text-white mb-4">Tasks Overview</h3>
            <div className="space-y-4">
                {data.map(task => (
                    <div key={task.id} className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-semibold text-white">{task.title}</h4>
                                <p className="text-sm text-neutral-400 mt-1">{task.description}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-neutral-300 flex-shrink-0 ml-4">
                                {priorityIcons[task.priority]}
                                <span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-end mt-3">
                             <div className="flex items-center gap-2 text-sm text-neutral-300">
                                {statusIcons[task.status]}
                                <span>{task.status.charAt(0).toUpperCase() + task.status.slice(1)}</span>
                             </div>
                             <div className="text-right">
                                <p className="text-xs text-neutral-500">Assignee</p>
                                <p className="text-sm font-semibold text-white">{task.assignee}</p>
                             </div>
                        </div>
                         <div className="flex flex-wrap gap-2 mt-3 border-t border-neutral-700 pt-3">
                            {task.tags.map(tag => (
                                <span key={tag.text} className={`px-2 py-1 text-xs rounded-full ${tagColorStyles[tag.color]?.bg || 'bg-gray-500/20'} ${tagColorStyles[tag.color]?.text || 'text-gray-300'}`}>
                                    {tag.text}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TasksTab;
