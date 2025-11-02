import { randomUUID } from 'crypto';
import { getApprovalTemplates, isRoleAtLeast, normaliseRole } from '../models/roleModel.js';
import { listSignupRequests } from './signupRequestService.js';
import { readCollection, writeCollection } from './storageService.js';
import { getAllUsers } from './userService.js';
import { recordAuditLog } from './logService.js';
import { notifyApprovalStepPending } from './notificationService.js';
import { getAuthorisationProfile } from './auth/authorizationService.js';

const DECISION_COLLECTION = 'approvalDecisions';

function toIsoDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : new Date(fallback);
  if (Number.isNaN(date.getTime())) {
    return new Date(fallback).toISOString();
  }
  return date.toISOString();
}

async function readDecisions() {
  const list = await readCollection(DECISION_COLLECTION);
  if (!Array.isArray(list)) {
    return [];
  }
  return list.slice();
}

async function appendDecision(decision) {
  const list = await readCollection(DECISION_COLLECTION);
  if (!Array.isArray(list)) {
    throw new Error('Approval decision storage is corrupted');
  }
  list.push(decision);
  await writeCollection(DECISION_COLLECTION, list);
  return decision;
}

function buildEligibleUsers(users, requiredRole) {
  return users
    .filter((user) => isRoleAtLeast(normaliseRole(user.role), requiredRole))
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: normaliseRole(user.role),
    }));
}

function buildFlowSteps({
  templates,
  decisions,
  submittedAt,
  users,
}) {
  const ordered = [];
  let blocked = false;
  let nextStartTime = new Date(submittedAt).getTime();
  let pendingStepId = null;
  let hasRejection = false;

  for (const template of templates) {
    const stepDecisions = decisions
      .filter((entry) => entry.stepId === template.id)
      .sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());
    const latest = stepDecisions.at(-1) || null;

    const slaStart = Number.isFinite(nextStartTime) ? nextStartTime : Date.now();
    const deadline = new Date(slaStart + template.slaHours * 60 * 60 * 1000);

    const baseStep = {
      id: template.id,
      label: template.label,
      requiredRole: template.requiredRole,
      slaHours: template.slaHours,
      escalatesTo: template.escalatesTo,
      notifications: Array.isArray(template.notifications) ? template.notifications : [],
      status: 'waiting',
      decidedAt: null,
      decidedBy: null,
      decidedByRole: null,
      comment: null,
      slaDeadline: deadline.toISOString(),
      slaSecondsRemaining: null,
      pendingUsers: [],
    };

    if (latest) {
      baseStep.status = latest.decision === 'approved' ? 'approved' : 'rejected';
      baseStep.decidedAt = latest.decidedAt;
      baseStep.decidedBy = latest.decidedByName || latest.decidedByEmail || latest.decidedBy || null;
      baseStep.decidedByRole = latest.decidedByRole || null;
      baseStep.comment = latest.comment || null;
      if (latest.decision === 'approved') {
        blocked = false;
        nextStartTime = new Date(latest.decidedAt || deadline).getTime();
      } else {
        blocked = true;
        hasRejection = true;
      }
    } else if (!blocked && !hasRejection) {
      baseStep.status = 'pending';
      baseStep.pendingUsers = buildEligibleUsers(users, template.requiredRole);
      baseStep.slaSecondsRemaining = Math.floor((deadline.getTime() - Date.now()) / 1000);
      pendingStepId = baseStep.id;
      blocked = true;
    } else if (hasRejection) {
      baseStep.status = 'skipped';
    } else {
      baseStep.status = 'waiting';
    }

    ordered.push(baseStep);
  }

  return { steps: ordered, pendingStepId, hasRejection };
}

function determineFlowStatus(steps) {
  if (steps.some((step) => step.status === 'rejected')) {
    return 'rejected';
  }
  if (steps.length > 0 && steps.every((step) => step.status === 'approved')) {
    return 'approved';
  }
  return 'pending';
}

function buildSignupFlows({ requests, decisions, users }) {
  return requests.map((request) => {
    const submittedAt = toIsoDate(request.timestamp, Date.now());
    const templates = getApprovalTemplates('signup');
    const flowDecisions = decisions
      .filter((entry) => entry.flowType === 'signup' && entry.entityId === request.id)
      .sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());

    const { steps, pendingStepId } = buildFlowSteps({
      templates,
      decisions: flowDecisions,
      submittedAt,
      users,
    });

    return {
      id: `signup:${request.id}`,
      type: 'signup',
      entityId: request.id,
      reference: request.email,
      title: request.name || request.email,
      status: determineFlowStatus(steps),
      submittedAt,
      submittedBy: {
        name: request.name,
        email: request.email,
      },
      metadata: {
        company: request.company || null,
        position: request.position || null,
        country: request.country || request.countryCode || null,
        phone: request.phone || null,
      },
      steps,
      currentStepId: pendingStepId,
    };
  });
}

function buildFinanceFlows({ financials, decisions, users }) {
  return financials.map((record) => {
    const submittedAt = toIsoDate(record.createdAt || record.dueDate || Date.now());
    const templates = getApprovalTemplates('finance');
    const flowDecisions = decisions
      .filter((entry) => entry.flowType === 'finance' && entry.entityId === record.id)
      .sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());

    const { steps, pendingStepId } = buildFlowSteps({
      templates,
      decisions: flowDecisions,
      submittedAt,
      users,
    });

    return {
      id: `finance:${record.id}`,
      type: 'finance',
      entityId: record.id,
      reference: record.description,
      title: record.description,
      status: determineFlowStatus(steps),
      submittedAt,
      submittedBy: null,
      metadata: {
        amount: record.amount,
        status: record.status,
        dueDate: record.dueDate || null,
        direction: record.type || null,
      },
      steps,
      currentStepId: pendingStepId,
    };
  });
}

function buildTaskFlows({ tasks, decisions, users }) {
  return tasks.map((task) => {
    const submittedAt = toIsoDate(task.createdAt || task.dueDate || Date.now());
    const templates = getApprovalTemplates('task');
    const flowDecisions = decisions
      .filter((entry) => entry.flowType === 'task' && entry.entityId === task.id)
      .sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());

    const { steps, pendingStepId } = buildFlowSteps({
      templates,
      decisions: flowDecisions,
      submittedAt,
      users,
    });

    return {
      id: `task:${task.id}`,
      type: 'task',
      entityId: task.id,
      reference: task.title,
      title: task.title,
      status: determineFlowStatus(steps),
      submittedAt,
      submittedBy: null,
      metadata: {
        assignee: task.assignee || null,
        priority: task.priority || null,
        status: task.status || null,
        dueDate: task.dueDate || null,
      },
      steps,
      currentStepId: pendingStepId,
    };
  });
}

export async function listApprovalFlows({ type = null, entityId = null } = {}) {
  const [requests, financials, tasks, decisions, users] = await Promise.all([
    listSignupRequests(),
    readCollection('financials'),
    readCollection('tasks'),
    readDecisions(),
    getAllUsers(),
  ]);

  const userDirectory = Array.isArray(users) ? users : [];
  const financeRecords = Array.isArray(financials) ? financials : [];
  const taskRecords = Array.isArray(tasks) ? tasks : [];

  let flows = [
    ...buildSignupFlows({ requests, decisions, users: userDirectory }),
    ...buildFinanceFlows({ financials: financeRecords, decisions, users: userDirectory }),
    ...buildTaskFlows({ tasks: taskRecords, decisions, users: userDirectory }),
  ];

  if (type) {
    flows = flows.filter((flow) => flow.type === type);
  }

  if (entityId) {
    flows = flows.filter((flow) => flow.entityId === entityId);
  }

  return flows.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

export async function getApprovalFlow(flowType, entityId) {
  const flows = await listApprovalFlows({ type: flowType, entityId });
  return flows.find((flow) => flow.entityId === entityId) || null;
}

function ensureStepActionable(flow, stepId) {
  const step = flow.steps.find((item) => item.id === stepId);
  if (!step) {
    const error = new Error('Step not found');
    error.code = 'STEP_NOT_FOUND';
    throw error;
  }
  if (step.status !== 'pending') {
    const error = new Error('Step is not actionable');
    error.code = 'STEP_NOT_ACTIONABLE';
    throw error;
  }
  return step;
}

export async function recordApprovalDecision({
  flowType,
  entityId,
  stepId,
  decision,
  comment = '',
  actor,
}) {
  const allowedDecisions = new Set(['approved', 'rejected']);
  if (!allowedDecisions.has(decision)) {
    const error = new Error('Unsupported decision');
    error.code = 'INVALID_DECISION';
    throw error;
  }

  const flow = await getApprovalFlow(flowType, entityId);
  if (!flow) {
    const error = new Error('Approval flow not found');
    error.code = 'FLOW_NOT_FOUND';
    throw error;
  }

  const step = ensureStepActionable(flow, stepId);
  const actorProfile = getAuthorisationProfile(actor?.role);
  if (!isRoleAtLeast(actorProfile.role, step.requiredRole)) {
    const error = new Error('Insufficient permissions for this step');
    error.code = 'STEP_FORBIDDEN';
    throw error;
  }

  const entry = {
    id: randomUUID(),
    flowType,
    entityId,
    stepId,
    decision,
    comment: comment || null,
    decidedBy: actor?.id || null,
    decidedByEmail: actor?.email || null,
    decidedByName: actor?.name || null,
    decidedByRole: actorProfile.role,
    decidedAt: new Date().toISOString(),
  };

  await appendDecision(entry);

  await recordAuditLog({
    user: actor?.email || actor?.name || 'unknown',
    action: decision === 'approved' ? 'Approved' : 'Denied',
    targetType: `approval:${flowType}`,
    targetId: `${entityId}:${stepId}`,
    details: comment ? `${decision.toUpperCase()} - ${comment}` : decision.toUpperCase(),
    label: `approvals-${flowType}`,
    sourceModule: 'approvals',
    criticality: decision === 'rejected' ? 'high' : 'medium',
  });

  const updatedFlow = await getApprovalFlow(flowType, entityId);
  if (updatedFlow?.currentStepId) {
    const nextStep = updatedFlow.steps.find((item) => item.id === updatedFlow.currentStepId);
    if (nextStep && nextStep.pendingUsers?.length) {
      await notifyApprovalStepPending({ flow: updatedFlow, step: nextStep });
    }
  }

  return { decision: entry, flow: updatedFlow };
}
