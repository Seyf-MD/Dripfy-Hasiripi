import { readCollection } from './storageService.js';
import { listOkrs } from './okrService.js';

function sum(numbers) {
  return numbers.reduce((acc, value) => acc + value, 0);
}

function calculateFinancialMetrics(records) {
  const incoming = sum(records.filter((record) => record.amount > 0).map((record) => record.amount));
  const outgoing = sum(records.filter((record) => record.amount < 0).map((record) => Math.abs(record.amount)));
  const pending = sum(records.filter((record) => record.status === 'Pending').map((record) => Math.abs(record.amount)));

  return {
    incoming,
    outgoing,
    netCashFlow: incoming - outgoing,
    pending,
  };
}

function calculateTaskMetrics(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === 'Done').length;
  const inProgress = tasks.filter((task) => task.status === 'In Progress').length;
  const completionRate = total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0;

  return {
    total,
    completed,
    inProgress,
    completionRate,
  };
}

function calculateOkrMetrics(okrs) {
  if (!okrs.length) {
    return {
      activeCount: 0,
      averageProgress: 0,
      requiresValidation: 0,
    };
  }

  const active = okrs.filter((okr) => okr.status === 'active');
  const validationCount = okrs.filter((okr) => okr.requiresValidation).length;
  const progressAverage = Number((sum(active.map((okr) => okr.progress || 0)) / Math.max(active.length, 1)).toFixed(2));

  return {
    activeCount: active.length,
    averageProgress: progressAverage,
    requiresValidation: validationCount,
  };
}

export async function getKpiOverview({ role, department } = {}) {
  const [financials, tasks, okrs] = await Promise.all([
    readCollection('financials'),
    readCollection('tasks'),
    listOkrs({ role, department }),
  ]);

  const financialMetrics = calculateFinancialMetrics(Array.isArray(financials) ? financials : []);
  const taskMetrics = calculateTaskMetrics(Array.isArray(tasks) ? tasks : []);
  const okrMetrics = calculateOkrMetrics(Array.isArray(okrs) ? okrs : []);

  return {
    metrics: [
      {
        id: 'net-cash-flow',
        label: 'Net Cash Flow',
        value: financialMetrics.netCashFlow,
        trend: financialMetrics.pending,
        unit: '€',
        description: 'Incoming minus outgoing cash flow',
      },
      {
        id: 'task-completion',
        label: 'Task Completion',
        value: taskMetrics.completionRate,
        unit: '%',
        description: 'Completed tasks versus all tasks',
      },
      {
        id: 'okr-progress',
        label: 'Average OKR Progress',
        value: Math.round(okrMetrics.averageProgress * 100),
        unit: '%',
        description: 'Average progress of active OKRs',
        meta: {
          activeCount: okrMetrics.activeCount,
          requiresValidation: okrMetrics.requiresValidation,
        },
      },
    ],
    taskMetrics,
    financialMetrics,
    okrMetrics,
  };
}
