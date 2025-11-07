import * as React from 'react';
import { X, CheckCircle2, Circle, Zap, CalendarDays, Layers3 } from 'lucide-react';
import type { TaskTemplate, TaskAutomationTrigger } from '../../types';
import { createTaskFromTemplate } from '../../services/tasks';
import type { TemplateInstantiationResult } from '../../services/tasks/automation';

interface TaskCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  templates: TaskTemplate[];
  automationTriggers: TaskAutomationTrigger[];
  defaultTemplateId?: string | null;
  onCreate: (result: TemplateInstantiationResult) => void;
}

const STEPS = ['Şablon Seçimi', 'Alt Görevler', 'Otomasyonlar'];

function resolveDefaultSteps(template: TaskTemplate | undefined) {
  if (!template) {
    return [] as string[];
  }
  return template.steps.filter((step) => step.autoCreate !== false).map((step) => step.id);
}

const TaskCreationWizard: React.FC<TaskCreationWizardProps> = ({
  isOpen,
  onClose,
  templates,
  automationTriggers,
  defaultTemplateId,
  onCreate,
}) => {
  const [stepIndex, setStepIndex] = React.useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(defaultTemplateId ?? null);
  const [selectedSteps, setSelectedSteps] = React.useState<string[]>([]);
  const [selectedTriggers, setSelectedTriggers] = React.useState<string[]>([]);
  const [assignee, setAssignee] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const selectedTemplate = React.useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0],
    [selectedTemplateId, templates],
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setStepIndex(0);
    setSelectedTemplateId(defaultTemplateId ?? templates[0]?.id ?? null);
  }, [isOpen, defaultTemplateId, templates]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }
    setSelectedSteps(resolveDefaultSteps(selectedTemplate));
    setSelectedTriggers(automationTriggers.map((trigger) => trigger.id));
    setAssignee('');
    setDueDate('');
  }, [selectedTemplate, automationTriggers, isOpen]);

  const handleToggleStep = React.useCallback((stepId: string) => {
    setSelectedSteps((current) => {
      if (current.includes(stepId)) {
        return current.filter((id) => id !== stepId);
      }
      return [...current, stepId];
    });
  }, []);

  const handleToggleTrigger = React.useCallback((triggerId: string) => {
    setSelectedTriggers((current) => {
      if (current.includes(triggerId)) {
        return current.filter((id) => id !== triggerId);
      }
      return [...current, triggerId];
    });
  }, []);

  const handleNext = () => {
    setStepIndex((value) => Math.min(value + 1, STEPS.length - 1));
  };

  const handlePrevious = () => {
    setStepIndex((value) => Math.max(value - 1, 0));
  };

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = createTaskFromTemplate(selectedTemplate.id, {
        includeStepIds: selectedSteps,
        selectedTriggerIds: selectedTriggers,
        assignee: assignee || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      onCreate(result);
    } catch (error) {
      console.error('[TaskCreationWizard] create failed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !selectedTemplate) {
    return null;
  }

  const renderTemplateStep = () => (
    <div className="grid gap-4">
      {templates.map((template) => {
        const isActive = template.id === selectedTemplate.id;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => setSelectedTemplateId(template.id)}
            className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all ${
              isActive
                ? 'border-[var(--drip-primary)] bg-[var(--drip-primary)]/5 shadow-sm'
                : 'border-slate-200 dark:border-neutral-700 hover:border-[var(--drip-primary)]/60'
            }`}
          >
            <div className={`mt-1 flex h-6 w-6 items-center justify-center rounded-full border ${isActive ? 'bg-[var(--drip-primary)] text-white border-[var(--drip-primary)]' : 'border-slate-300 dark:border-neutral-600 text-slate-400'}`}>
              {isActive ? <CheckCircle2 size={16} /> : <Circle size={14} />}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{template.name}</p>
              <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">{template.description}</p>
              <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--drip-muted)] dark:text-neutral-400">
                <span className="rounded-full bg-[var(--drip-primary)]/10 px-2 py-1 text-[var(--drip-primary)]">{template.category}</span>
                {template.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 dark:bg-neutral-800">{tag}</span>
                ))}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderStepSelection = () => (
    <div className="space-y-6">
      <div className="grid gap-3">
        {selectedTemplate.steps.map((step) => {
          const isChecked = selectedSteps.includes(step.id);
          const slaInfo = step.sla;
          return (
            <label
              key={step.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                isChecked
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/50 dark:bg-emerald-500/5'
                  : 'border-slate-200 dark:border-neutral-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggleStep(step.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--drip-primary)] focus:ring-[var(--drip-primary)]"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{step.title}</p>
                  {slaInfo ? (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                      <Layers3 size={12} />
                      {slaInfo.durationHours} saat SLA
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">{step.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--drip-muted)] dark:text-neutral-400">
                  {step.defaultAssignee ? <span>Varsayılan: {step.defaultAssignee}</span> : null}
                  {step.relativeDueInHours ? <span>+{step.relativeDueInHours} saat</span> : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-[var(--drip-text)] dark:text-neutral-100">Sorumlu</span>
          <input
            type="text"
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            placeholder={selectedTemplate.defaultAssignee || 'Görev sahibi'}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-[var(--drip-text)] shadow-sm focus:border-[var(--drip-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-semibold text-[var(--drip-text)] dark:text-neutral-100">Hedef Tarih</span>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-[var(--drip-text)] shadow-sm focus:border-[var(--drip-primary)] focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          />
        </label>
      </div>
    </div>
  );

  const renderAutomationStep = () => (
    <div className="space-y-6">
      <div className="grid gap-3">
        {automationTriggers.map((trigger) => {
          const isChecked = selectedTriggers.includes(trigger.id);
          return (
            <label
              key={trigger.id}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                isChecked
                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500/50 dark:bg-indigo-500/10'
                  : 'border-slate-200 dark:border-neutral-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggleTrigger(trigger.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-[var(--drip-primary)] focus:ring-[var(--drip-primary)]"
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--drip-text)] dark:text-white">{trigger.name}</p>
                <p className="text-xs text-[var(--drip-muted)] dark:text-neutral-400">{trigger.description}</p>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase text-[var(--drip-muted)] dark:text-neutral-400">
                  {trigger.actions.map((action) => (
                    <span key={action.id} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-neutral-800">
                      <Zap size={12} className="text-[var(--drip-primary)]" />
                      {action.label}
                    </span>
                  ))}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-[var(--drip-muted)] dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-300">
        Seçilen şablon için {selectedSteps.length} alt görev ve {selectedTriggers.length} otomasyon tetikleyicisi etkinleştirilecek.
      </div>
    </div>
  );

  const renderStep = () => {
    switch (stepIndex) {
      case 0:
        return renderTemplateStep();
      case 1:
        return renderStepSelection();
      case 2:
        return renderAutomationStep();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--drip-text)] dark:text-white">Görev Oluşturma Sihirbazı</h2>
            <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">
              Şablon, otomatik alt görevler ve tetikleyicileri seçerek görevleri birkaç adımda planlayın.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-transparent p-2 text-[var(--drip-muted)] transition hover:border-slate-200 hover:text-[var(--drip-text)] dark:hover:border-neutral-700 dark:hover:text-neutral-200"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[var(--drip-muted)] dark:text-neutral-400">
          {STEPS.map((label, index) => (
            <React.Fragment key={label}>
              <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                index === stepIndex
                  ? 'bg-[var(--drip-primary)] text-white'
                  : index < stepIndex
                  ? 'bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-neutral-800'
              }`}>
                {index < stepIndex ? <CheckCircle2 size={14} /> : <Circle size={12} />}
                <span>{label}</span>
              </div>
              {index < STEPS.length - 1 ? <span className="text-[var(--drip-muted)]">›</span> : null}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-6 max-h-[55vh] overflow-y-auto pr-1 text-sm">{renderStep()}</div>
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-neutral-800">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={stepIndex === 0}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-[var(--drip-muted)] transition hover:border-[var(--drip-primary)] hover:text-[var(--drip-primary)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-[var(--drip-primary)]"
          >
            Geri
          </button>
          <div className="flex items-center gap-3">
            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg bg-[var(--drip-primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--drip-primary-dark)]"
              >
                İleri
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CalendarDays size={16} />
                Oluştur
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCreationWizard;
