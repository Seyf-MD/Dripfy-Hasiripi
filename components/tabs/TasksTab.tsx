import * as React from 'react';
import type { Task, TaskTemplate, TaskAutomationTrigger, TaskSLAReport } from '../../types';
import { Plus, CheckCircle, Clock, Loader, GitBranch, Zap, Timer, Tag } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import TaskCreationWizard from '../tasks/TaskCreationWizard';
import SLADashboard from '../tasks/SLADashboard';
import type { TemplateInstantiationResult } from '../../services/tasks/automation';

type TaskStatus = 'To Do' | 'In Progress' | 'Done';

type SlaVisualKey = 'default' | 'onTrack' | 'warning' | 'breached';

const SLA_STYLES: Record<SlaVisualKey, { border: string; dot: string; text: string; label: string }> = {
  default: {
    border: 'border-slate-200 dark:border-neutral-700',
    dot: 'bg-slate-300 dark:bg-neutral-600',
    text: 'text-[var(--drip-muted)] dark:text-neutral-400',
    label: 'SLA tanımsız',
  },
  onTrack: {
    border: 'border-emerald-500/70',
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-300',
    label: 'Zamanında',
  },
  warning: {
    border: 'border-amber-500/70',
    dot: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-300',
    label: 'Riskte',
  },
  breached: {
    border: 'border-rose-500/70',
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-300',
    label: 'İhlal',
  },
};

const PRIORITY_BADGE: Record<Task['priority'], string> = {
  High: 'bg-rose-500',
  Medium: 'bg-amber-500',
  Low: 'bg-sky-500',
};

const getInitials = (value?: string | null) => {
  if (!value) {
    return 'NA';
  }
  const words = value.split(' ').filter(Boolean);
  if (words.length === 0) {
    return value.slice(0, 2).toUpperCase();
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
};

const TaskCard: React.FC<{
  task: Task;
  onOpenModal: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  canEdit: boolean;
}> = ({ task, onOpenModal, onDragStart, canEdit }) => {
  const slaKey: SlaVisualKey = task.sla ? task.sla.status : 'default';
  const slaStyle = SLA_STYLES[slaKey] ?? SLA_STYLES.default;
  const dependencyPreview = task.dependencies?.slice(0, 2) ?? [];
  const automationCount = task.triggerIds?.length ?? 0;

  return (
    <div
      draggable={canEdit}
      onDragStart={(event) => canEdit && onDragStart(event, task.id)}
      onClick={onOpenModal}
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-slate-50 dark:bg-neutral-800 dark:hover:bg-neutral-700/60 ${slaStyle.border} ${canEdit ? 'cursor-grab' : 'cursor-default'}`}
    >
      {dependencyPreview.length > 0 ? (
        <div className="pointer-events-none absolute -left-5 top-6 bottom-6 flex w-3 flex-col items-center justify-between text-slate-300 dark:text-neutral-600">
          <span className="h-full w-0.5 bg-current" />
          <GitBranch size={14} />
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${PRIORITY_BADGE[task.priority]}`} />
            <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white line-clamp-2">{task.title}</p>
          </div>
          {task.description ? (
            <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 line-clamp-2">{task.description}</p>
          ) : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-[var(--drip-muted)] dark:bg-neutral-700 dark:text-neutral-300">
          {getInitials(task.assignee)}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--drip-muted)] dark:text-neutral-400">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-[var(--drip-text)] dark:text-neutral-200">{task.assignee}</span>
          <span>{new Date(task.dueDate).toLocaleString()}</span>
        </div>
        <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${slaStyle.text}`}>
          <span className={`h-2 w-2 rounded-full ${slaStyle.dot}`} />
          {task.sla ? slaStyle.label : SLA_STYLES.default.label}
        </div>
      </div>
      {task.automationBadges && task.automationBadges.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {task.automationBadges.slice(0, 3).map((badge) => (
            <span
              key={badge.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
              style={
                badge.color
                  ? { backgroundColor: `${badge.color}1A`, color: badge.color }
                  : { backgroundColor: 'rgba(148, 163, 184, 0.2)', color: 'var(--drip-muted)' }
              }
            >
              <Zap size={12} />
              {badge.label}
            </span>
          ))}
        </div>
      ) : null}
      {task.tags && task.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-[var(--drip-muted)] dark:text-neutral-400">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 dark:bg-neutral-800">
              <Tag size={10} />
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      {dependencyPreview.length > 0 ? (
        <div className="mt-3 space-y-1 text-[11px] text-[var(--drip-muted)] dark:text-neutral-400">
          {dependencyPreview.map((dependency) => (
            <div key={dependency.id} className="flex items-center gap-2">
              <GitBranch size={12} className="text-[var(--drip-muted)]" />
              <span>{dependency.label ?? `Bağlı görev: ${dependency.targetTaskId}`}</span>
            </div>
          ))}
        </div>
      ) : null}
      {automationCount > 0 ? (
        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold uppercase text-[var(--drip-muted)] dark:text-neutral-400">
          <Timer size={12} /> {automationCount} otomasyon tetikleyicisi
        </div>
      ) : null}
    </div>
  );
};

const TaskColumn: React.FC<{
  status: TaskStatus;
  tasks: Task[];
  onOpenModal: (task: Task) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => void;
  canEdit: boolean;
}> = ({ status, tasks, onOpenModal, onDragStart, onDrop, canEdit }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [isDragOver, setIsDragOver] = React.useState(false);

  const statusInfo = {
    'To Do': {
      icon: <Clock size={16} />,
      color: theme === 'light' ? 'text-slate-600' : 'text-slate-300',
      bgColor: theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/50',
      label: t('status.todo'),
    },
    'In Progress': {
      icon: <Loader size={16} />,
      color: theme === 'light' ? 'text-amber-600' : 'text-amber-400',
      bgColor: theme === 'light' ? 'bg-amber-50' : 'bg-amber-500/10',
      label: t('status.inprogress'),
    },
    Done: {
      icon: <CheckCircle size={16} />,
      color: theme === 'light' ? 'text-emerald-600' : 'text-emerald-400',
      bgColor: theme === 'light' ? 'bg-emerald-50' : 'bg-emerald-500/10',
      label: t('status.done'),
    },
  } satisfies Record<TaskStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }>;

  const slaSummary = React.useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        if (!task.sla) {
          return acc;
        }
        acc[task.sla.status] += 1;
        return acc;
      },
      { onTrack: 0, warning: 0, breached: 0 },
    );
  }, [tasks]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (canEdit) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (canEdit) {
      onDrop(event, status);
    }
    setIsDragOver(false);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 min-w-[320px] rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/60 p-3 transition-colors dark:border-neutral-700/60 dark:bg-neutral-900/60 ${
        isDragOver ? 'border-[var(--drip-primary)] bg-[var(--drip-primary)]/10' : ''
      }`}
    >
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 ${statusInfo[status].bgColor}`}>
        <div className={`flex items-center gap-2 text-sm font-semibold ${statusInfo[status].color}`}>
          {statusInfo[status].icon}
          <span>{statusInfo[status].label}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-[var(--drip-muted)] dark:text-neutral-400">
          <span>⏱ {tasks.length}</span>
          <span>✓ {slaSummary.onTrack}</span>
          <span>⚠️ {slaSummary.warning}</span>
          <span>🔥 {slaSummary.breached}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpenModal={() => onOpenModal(task)} onDragStart={onDragStart} canEdit={canEdit} />
        ))}
      </div>
    </div>
  );
};

interface TasksTabProps {
  data: Task[];
  templates: TaskTemplate[];
  automationTriggers: TaskAutomationTrigger[];
  slaReports: TaskSLAReport[];
  canEdit: boolean;
  onOpenModal: (item: Task, type: 'tasks') => void;
  onUpdateStatus: (taskId: string, newStatus: Task['status']) => void;
  onCreateTask: (result: TemplateInstantiationResult) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({
  data,
  templates,
  automationTriggers,
  slaReports,
  canEdit,
  onOpenModal,
  onUpdateStatus,
  onCreateTask,
}) => {
  const { t } = useLanguage();
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [initialTemplateId, setInitialTemplateId] = React.useState<string | null>(null);

  const tasksByStatus = React.useMemo(() => {
    const columns: Record<TaskStatus, Task[]> = {
      'To Do': [],
      'In Progress': [],
      Done: [],
    };
    data.forEach((task) => {
      if (columns[task.status as TaskStatus]) {
        columns[task.status as TaskStatus].push(task);
      }
    });
    (Object.keys(columns) as TaskStatus[]).forEach((status) => {
      columns[status].sort((a, b) => {
        const priorityOrder: Record<Task['priority'], number> = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });
    return columns;
  }, [data]);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, taskId: string) => {
    event.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
    const taskId = event.dataTransfer.getData('taskId');
    const task = data.find((item) => item.id === taskId);
    if (task && task.status !== newStatus) {
      onUpdateStatus(taskId, newStatus);
    }
  };

  const handleOpenWizard = (templateId?: string) => {
    if (templateId) {
      setInitialTemplateId(templateId);
    } else {
      setInitialTemplateId(null);
    }
    setIsWizardOpen(true);
  };

  const handleWizardClose = () => setIsWizardOpen(false);

  const handleWizardCreate = (result: TemplateInstantiationResult) => {
    onCreateTask(result);
    setIsWizardOpen(false);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <SLADashboard reports={slaReports} />
      {canEdit && templates.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">Görev Şablonları</h4>
              <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">
                Tek tıkla şablonları başlat, otomatik alt görevler ve otomasyonları etkinleştir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenWizard()}
              className="flex items-center gap-2 rounded-lg bg-[var(--drip-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--drip-primary-dark)]"
            >
              <Plus size={16} /> {t('tasks.newTask')}
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {templates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleOpenWizard(template.id)}
                className="flex h-full flex-col items-start gap-2 rounded-xl border border-slate-200 p-4 text-left transition hover:border-[var(--drip-primary)] hover:shadow-md dark:border-neutral-800 dark:hover:border-[var(--drip-primary)]"
              >
                <span className="rounded-full bg-[var(--drip-primary)]/10 px-3 py-1 text-[10px] font-semibold uppercase text-[var(--drip-primary)]">
                  {template.category}
                </span>
                <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{template.name}</p>
                <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400 line-clamp-3">{template.description}</p>
                <div className="mt-auto flex flex-wrap gap-2 text-[10px] text-[var(--drip-muted)] dark:text-neutral-400">
                  {template.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-neutral-800">
                      {tag}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-neutral-800">
                    <Timer size={12} /> {template.steps.length} adım
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      <div className="flex flex-col gap-6 lg:flex-row">
        <TaskColumn status="To Do" tasks={tasksByStatus['To Do']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
        <TaskColumn status="In Progress" tasks={tasksByStatus['In Progress']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
        <TaskColumn status="Done" tasks={tasksByStatus['Done']} onOpenModal={(task) => onOpenModal(task, 'tasks')} onDragStart={handleDragStart} onDrop={handleDrop} canEdit={canEdit} />
      </div>
      {isWizardOpen ? (
        <TaskCreationWizard
          isOpen={isWizardOpen}
          onClose={handleWizardClose}
          templates={templates}
          automationTriggers={automationTriggers}
          defaultTemplateId={initialTemplateId}
          onCreate={handleWizardCreate}
        />
      ) : null}
    </div>
  );
};

export default TasksTab;
