import { getApprovalTemplates } from '../../models/roleModel.js';

const DEFAULT_THRESHOLDS = [
  { limit: 5000, route: 'streamlined' },
  { limit: 25000, route: 'standard' },
  { limit: Number.POSITIVE_INFINITY, route: 'executive' },
];

function getTemplateMap() {
  const templates = getApprovalTemplates('invoice');
  const map = new Map();
  for (const template of templates) {
    map.set(template.id, template);
  }
  return map;
}

function selectRoute(amount = 0) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  for (const entry of DEFAULT_THRESHOLDS) {
    if (safeAmount <= entry.limit) {
      return entry.route;
    }
  }
  return 'executive';
}

export function buildInvoiceApprovalPlan({ amount = 0, riskLevel = 'low', urgencyDays = null }) {
  const templateMap = getTemplateMap();
  const route = selectRoute(amount);
  const baseOrder = [
    'intake-validation',
    'compliance-review',
    'budget-check',
    'controller-review',
    'management-approval',
    'executive-signoff',
  ];

  const selected = [];

  for (const stepId of baseOrder) {
    if (!templateMap.has(stepId)) {
      continue;
    }
    if (stepId === 'compliance-review' && riskLevel === 'low') {
      continue;
    }
    if (stepId === 'controller-review' && route === 'streamlined') {
      continue;
    }
    if (stepId === 'management-approval' && route === 'streamlined') {
      continue;
    }
    if (stepId === 'management-approval' && route === 'standard' && riskLevel === 'low') {
      continue;
    }
    if (stepId === 'executive-signoff' && route !== 'executive') {
      continue;
    }
    selected.push({ ...templateMap.get(stepId) });
  }

  if (urgencyDays !== null && urgencyDays <= 2) {
    selected.forEach((step) => {
      if (step.slaHours > 4) {
        step.slaHours = Math.max(4, Math.floor(step.slaHours / 2));
      }
      if (Array.isArray(step.notifications) && !step.notifications.includes('push')) {
        step.notifications = [...step.notifications, 'push'];
      }
    });
  }

  const routingNotes = [];
  if (route === 'streamlined') {
    routingNotes.push('Tutar düşük olduğu için hızlandırılmış rota seçildi.');
  }
  if (route === 'executive') {
    routingNotes.push('Yüksek tutar için üst yönetim onayı zorunlu.');
  }
  if (riskLevel === 'high') {
    routingNotes.push('Riskli olarak işaretlendiği için uyum incelemesi eklendi.');
  }
  if (urgencyDays !== null && urgencyDays <= 2) {
    routingNotes.push('Vadesi yakın olduğu için SLA süreleri sıkılaştırıldı.');
  }

  return {
    route,
    riskLevel,
    steps: selected,
    notes: routingNotes,
  };
}
