import type {
  Task,
  TaskAutomationAction,
  TaskAutomationTrigger,
  TaskAutomationTriggerCondition,
  TaskDependency,
  TaskSLA,
  TaskTemplate,
  TaskTemplateStep,
} from '../../../types';
import { taskAutomationTriggers, taskTemplateDefinitions } from './definitions';

const templateRegistry = new Map<string, TaskTemplate>();
const triggerRegistry = new Map<string, TaskAutomationTrigger>();

function ensureRegistries() {
  if (templateRegistry.size === 0) {
    taskTemplateDefinitions.forEach((template) => {
      templateRegistry.set(template.id, template);
    });
  }
  if (triggerRegistry.size === 0) {
    taskAutomationTriggers.forEach((trigger) => {
      triggerRegistry.set(trigger.id, trigger);
    });
  }
}

function resolveRandomId(prefix: string): string {
  const cryptoApi: Crypto | undefined = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toIsoDate(input: Date): string {
  return input.toISOString();
}

function addHours(base: Date, hours: number): Date {
  const clone = new Date(base);
  clone.setHours(clone.getHours() + hours);
  return clone;
}

function instantiateSla(
  slaConfig: NonNullable<TaskTemplate['defaultSla']> | NonNullable<TaskTemplateStep['sla']>,
  start: Date,
): TaskSLA {
  const dueDate = addHours(start, slaConfig.durationHours ?? 24);
  if ('graceMinutes' in slaConfig && typeof slaConfig.graceMinutes === 'number') {
    dueDate.setMinutes(dueDate.getMinutes() + slaConfig.graceMinutes);
  }
  return {
    id: slaConfig.id,
    name: slaConfig.name,
    durationHours: slaConfig.durationHours,
    status: 'onTrack',
    startedAt: toIsoDate(start),
    dueAt: toIsoDate(dueDate),
    reminders: slaConfig.reminders,
    escalation: slaConfig.escalation,
    breachedAt: null,
  };
}

function resolveStepDependencies(
  task: Task,
  step: TaskTemplateStep,
  parentTaskId: string,
  lookup: Map<string, Task>,
) {
  if (!step.dependencies || step.dependencies.length === 0) {
    return;
  }
  const resolved: TaskDependency[] = step.dependencies
    .map((dependency) => {
      const targetTaskId = dependency.target === 'parent' ? parentTaskId : lookup.get(dependency.target)?.id;
      if (!targetTaskId) {
        return null;
      }
      return {
        id: resolveRandomId('dep'),
        type: dependency.type,
        targetTaskId,
        label: dependency.label,
        isBlocking: dependency.isBlocking,
      } satisfies TaskDependency;
    })
    .filter((value): value is TaskDependency => Boolean(value));
  if (resolved.length > 0) {
    task.dependencies = [...(task.dependencies ?? []), ...resolved];
  }
}

interface InstantiateOptions {
  ownerId?: string | null;
  ownerName?: string | null;
  assignee?: string | null;
  dueDate?: string | null;
  includeStepIds?: string[];
  selectedTriggerIds?: string[];
  startAt?: string | null;
}

export interface TemplateInstantiationResult {
  template: TaskTemplate;
  task: Task;
  subtasks: Task[];
  triggerIds: string[];
}

function buildTemplateTask(
  template: TaskTemplate,
  options: InstantiateOptions,
  startDate: Date,
): Task {
  const baseDueDate = options.dueDate ? new Date(options.dueDate) : addHours(startDate, template.defaultSla?.durationHours ?? 48);
  const mainTask: Task = {
    id: resolveRandomId('task'),
    title: template.name,
    description: template.description,
    priority: template.defaultPriority,
    status: 'To Do',
    dueDate: toIsoDate(baseDueDate),
    assignee: options.assignee || template.defaultAssignee || (options.ownerName ?? 'Unassigned'),
    assigneeId: options.ownerId ?? null,
    templateId: template.id,
    templateName: template.name,
    automationBadges: template.defaultBadges,
    personalization: options.ownerId
      ? {
          ownerId: options.ownerId,
          ownerName: options.ownerName || null,
          focusTags: template.tags ?? [],
          color: null,
          schedule: {
            start: toIsoDate(startDate),
            end: toIsoDate(baseDueDate),
            allDay: false,
            timezone: null,
            lastPlannedAt: toIsoDate(new Date()),
          },
        }
      : undefined,
    createdAt: toIsoDate(startDate),
    updatedAt: toIsoDate(startDate),
  };

  if (template.defaultSla) {
    mainTask.sla = instantiateSla(template.defaultSla, startDate);
  }

  return mainTask;
}

function shouldIncludeStep(step: TaskTemplateStep, selected: string[] | undefined): boolean {
  if (Array.isArray(selected)) {
    return selected.includes(step.id);
  }
  return step.autoCreate !== false;
}

function buildStepTask(
  parentTask: Task,
  step: TaskTemplateStep,
  options: InstantiateOptions,
  startDate: Date,
): Task {
  const stepStart = new Date(startDate);
  const dueDate = step.relativeDueInHours
    ? addHours(stepStart, step.relativeDueInHours)
    : new Date(parentTask.dueDate ?? toIsoDate(addHours(startDate, 24)));
  const task: Task = {
    id: resolveRandomId('task'),
    title: step.title,
    description: step.description || parentTask.description,
    priority: parentTask.priority,
    status: 'To Do',
    dueDate: toIsoDate(dueDate),
    assignee: step.defaultAssignee || parentTask.assignee,
    assigneeId: options.ownerId ?? parentTask.assigneeId ?? null,
    templateId: parentTask.templateId,
    templateName: parentTask.templateName,
    templateStepId: step.id,
    parentTaskId: parentTask.id,
    automationBadges: step.automationBadges,
    personalization: parentTask.personalization,
    createdAt: toIsoDate(startDate),
    updatedAt: toIsoDate(startDate),
  };

  if (step.sla) {
    task.sla = instantiateSla(step.sla, startDate);
  }

  return task;
}

export function listTaskTemplates(): TaskTemplate[] {
  ensureRegistries();
  return Array.from(templateRegistry.values());
}

export function getTaskTemplateById(id: string): TaskTemplate | undefined {
  ensureRegistries();
  return templateRegistry.get(id);
}

export function listAutomationTriggers(): TaskAutomationTrigger[] {
  ensureRegistries();
  return Array.from(triggerRegistry.values());
}

export function getAutomationTriggerById(id: string): TaskAutomationTrigger | undefined {
  ensureRegistries();
  return triggerRegistry.get(id);
}

export function instantiateTemplate(
  templateId: string,
  options: InstantiateOptions = {},
): TemplateInstantiationResult {
  ensureRegistries();
  const template = templateRegistry.get(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} bulunamadı.`);
  }

  const startDate = options.startAt ? new Date(options.startAt) : new Date();
  const mainTask = buildTemplateTask(template, options, startDate);

  const selectedSteps = template.steps.filter((step) => shouldIncludeStep(step, options.includeStepIds));
  const stepTaskLookup = new Map<string, Task>();
  const subtasks = selectedSteps.map((step) => {
    const task = buildStepTask(mainTask, step, options, startDate);
    stepTaskLookup.set(step.id, task);
    return task;
  });

  selectedSteps.forEach((step) => {
    const task = stepTaskLookup.get(step.id);
    if (task) {
      resolveStepDependencies(task, step, mainTask.id, stepTaskLookup);
    }
  });

  const triggerIds = (options.selectedTriggerIds && options.selectedTriggerIds.length > 0)
    ? options.selectedTriggerIds
    : taskAutomationTriggers.map((trigger) => trigger.id);

  mainTask.triggerIds = triggerIds;
  subtasks.forEach((task) => {
    task.triggerIds = triggerIds;
  });

  return {
    template,
    task: mainTask,
    subtasks,
    triggerIds,
  };
}

export type TaskAutomationEvent =
  | { type: 'status-change'; task: Task; previousStatus?: Task['status']; timestamp?: string }
  | { type: 'sla-breach'; task: Task; sla: TaskSLA; timestamp?: string }
  | { type: 'dependency-resolved'; task: Task; dependencyId: string; timestamp?: string }
  | { type: 'time-elapsed'; task: Task; elapsedMinutes: number; timestamp?: string };

function readContextValue(context: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: any = context;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function matchesConditions(
  trigger: TaskAutomationTrigger,
  event: TaskAutomationEvent,
  context: Record<string, unknown>,
): boolean {
  if (!trigger.conditions || trigger.conditions.length === 0) {
    return true;
  }
  return trigger.conditions.every((condition: TaskAutomationTriggerCondition) => {
    const value = readContextValue(context, condition.field);
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && Number(value) > Number(condition.value);
      case 'lt':
        return typeof value === 'number' && Number(value) < Number(condition.value);
      case 'includes':
        return Array.isArray(value) ? value.includes(condition.value) : String(value ?? '').includes(String(condition.value ?? ''));
      case 'excludes':
        return Array.isArray(value)
          ? !value.includes(condition.value)
          : !String(value ?? '').includes(String(condition.value ?? ''));
      default:
        return false;
    }
  });
}

export interface TriggerEvaluationResult {
  trigger: TaskAutomationTrigger;
  actions: TaskAutomationAction[];
}

export function evaluateAutomationTriggers(
  event: TaskAutomationEvent,
  triggers: TaskAutomationTrigger[] = listAutomationTriggers(),
): TriggerEvaluationResult[] {
  const context: Record<string, unknown> = { task: event.task, ...event };
  return triggers
    .filter((trigger) => trigger.type === event.type)
    .filter((trigger) => matchesConditions(trigger, event, context))
    .map((trigger) => ({ trigger, actions: trigger.actions }));
}

export function registerCustomTemplates(templates: TaskTemplate[]) {
  templates.forEach((template) => {
    templateRegistry.set(template.id, template);
  });
}

export function registerCustomTriggers(triggers: TaskAutomationTrigger[]) {
  triggers.forEach((trigger) => {
    triggerRegistry.set(trigger.id, trigger);
  });
}
