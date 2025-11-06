const DEFAULT_ROLE = 'viewer';

const ROLE_DEFINITIONS = {
  viewer: {
    id: 'viewer',
    label: 'Gözlemci',
    description: 'Sadece izleme yetkisine sahip kullanıcı.',
    inherits: [],
    capabilities: ['read'],
    rank: 0,
  },
  user: {
    id: 'user',
    label: 'Operasyon Uzmanı',
    description: 'Operasyonel kayıtları oluşturabilir ve güncelleyebilir.',
    inherits: ['viewer'],
    capabilities: ['read', 'create', 'update'],
    rank: 1,
  },
  approver: {
    id: 'approver',
    label: 'Onay Yetkilisi',
    description: 'Operasyonel talepleri inceleyip onaylayabilir.',
    inherits: ['user'],
    capabilities: ['read', 'create', 'update', 'approve'],
    rank: 2,
  },
  finance: {
    id: 'finance',
    label: 'Finans Kontrolörü',
    description: 'Finansal kayıtlar için ikinci derece onay verir.',
    inherits: ['approver'],
    capabilities: ['read', 'create', 'update', 'approve', 'finance-approve'],
    rank: 3,
  },
  manager: {
    id: 'manager',
    label: 'Birim Yöneticisi',
    description: 'Departman seviyesinde nihai sorumluluk taşır.',
    inherits: ['approver'],
    capabilities: ['read', 'create', 'update', 'approve', 'delegate'],
    rank: 3,
  },
  admin: {
    id: 'admin',
    label: 'Sistem Yöneticisi',
    description: 'Tüm modüller üzerinde tam yetkiye sahiptir.',
    inherits: ['manager', 'finance'],
    capabilities: ['read', 'create', 'update', 'approve', 'delegate', 'admin'],
    rank: 4,
  },
};

const APPROVAL_STEP_TEMPLATES = {
  signup: [
    {
      id: 'pre-screen',
      label: 'Ön Değerlendirme',
      requiredRole: 'user',
      slaHours: 12,
      escalatesTo: 'approver',
      notifications: ['email', 'push'],
    },
    {
      id: 'risk-check',
      label: 'Risk ve Uyum Kontrolü',
      requiredRole: 'approver',
      slaHours: 24,
      escalatesTo: 'manager',
      notifications: ['email'],
    },
    {
      id: 'final-approval',
      label: 'Nihai Onay',
      requiredRole: 'admin',
      slaHours: 24,
      escalatesTo: null,
      notifications: ['email', 'push'],
    },
  ],
  finance: [
    {
      id: 'budget-validation',
      label: 'Bütçe Doğrulama',
      requiredRole: 'finance',
      slaHours: 8,
      escalatesTo: 'manager',
      notifications: ['email'],
    },
    {
      id: 'controller-review',
      label: 'Finans Kontrolü',
      requiredRole: 'manager',
      slaHours: 16,
      escalatesTo: 'admin',
      notifications: ['email', 'push'],
    },
    {
      id: 'executive-signoff',
      label: 'Yönetim Onayı',
      requiredRole: 'admin',
      slaHours: 24,
      escalatesTo: null,
      notifications: ['email'],
    },
  ],
  invoice: [
    {
      id: 'intake-validation',
      label: 'Fatura Ön İnceleme',
      requiredRole: 'user',
      slaHours: 4,
      escalatesTo: 'approver',
      notifications: ['email'],
    },
    {
      id: 'compliance-review',
      label: 'Uyum ve Risk İncelemesi',
      requiredRole: 'approver',
      slaHours: 8,
      escalatesTo: 'finance',
      notifications: ['email'],
    },
    {
      id: 'budget-check',
      label: 'Bütçe Kontrolü',
      requiredRole: 'finance',
      slaHours: 8,
      escalatesTo: 'manager',
      notifications: ['email'],
    },
    {
      id: 'controller-review',
      label: 'Finans Kontrolörü İncelemesi',
      requiredRole: 'finance',
      slaHours: 12,
      escalatesTo: 'manager',
      notifications: ['email', 'push'],
    },
    {
      id: 'management-approval',
      label: 'Yönetici Onayı',
      requiredRole: 'manager',
      slaHours: 12,
      escalatesTo: 'admin',
      notifications: ['email'],
    },
    {
      id: 'executive-signoff',
      label: 'Üst Yönetim Onayı',
      requiredRole: 'admin',
      slaHours: 24,
      escalatesTo: null,
      notifications: ['email'],
    },
  ],
  task: [
    {
      id: 'owner-review',
      label: 'Görev Sahibi Değerlendirmesi',
      requiredRole: 'user',
      slaHours: 12,
      escalatesTo: 'manager',
      notifications: ['push'],
    },
    {
      id: 'ops-lead-approval',
      label: 'Operasyon Lideri Onayı',
      requiredRole: 'manager',
      slaHours: 24,
      escalatesTo: 'admin',
      notifications: ['email', 'push'],
    },
  ],
};

function getRoleDefinition(role) {
  return ROLE_DEFINITIONS[role] || null;
}

function getRoleRank(role) {
  const definition = getRoleDefinition(role);
  if (!definition) {
    return -1;
  }
  return typeof definition.rank === 'number' ? definition.rank : -1;
}

function resolveInheritedRoles(role, visited = new Set()) {
  const definition = getRoleDefinition(role);
  if (!definition) {
    return [];
  }
  if (visited.has(role)) {
    return [];
  }
  visited.add(role);
  const direct = Array.isArray(definition.inherits) ? definition.inherits : [];
  const resolved = new Set(direct);
  for (const parent of direct) {
    if (!visited.has(parent)) {
      const chain = resolveInheritedRoles(parent, visited);
      for (const ancestor of chain) {
        resolved.add(ancestor);
      }
    }
  }
  return Array.from(resolved);
}

function isRoleAtLeast(subject, required) {
  if (!required) {
    return true;
  }
  if (!subject) {
    return false;
  }
  if (subject === required) {
    return true;
  }
  const definition = getRoleDefinition(subject);
  if (!definition) {
    return false;
  }
  const inherited = resolveInheritedRoles(subject, new Set());
  if (inherited.includes(required)) {
    return true;
  }
  const subjectRank = getRoleRank(subject);
  const requiredRank = getRoleRank(required);
  if (subjectRank === -1 || requiredRank === -1) {
    return false;
  }
  return subjectRank >= requiredRank;
}

function normaliseRole(role) {
  if (!role || typeof role !== 'string') {
    return DEFAULT_ROLE;
  }
  const key = role.trim().toLowerCase();
  return ROLE_DEFINITIONS[key] ? key : DEFAULT_ROLE;
}

function getApprovalTemplates(flowType) {
  const templates = APPROVAL_STEP_TEMPLATES[flowType];
  if (!Array.isArray(templates)) {
    return [];
  }
  return templates.map((step) => ({ ...step }));
}

function listRoles() {
  return Object.values(ROLE_DEFINITIONS).map((role) => ({
    ...role,
    inherits: resolveInheritedRoles(role.id),
  }));
}

export {
  APPROVAL_STEP_TEMPLATES,
  ROLE_DEFINITIONS,
  getApprovalTemplates,
  getRoleDefinition,
  getRoleRank,
  isRoleAtLeast,
  listRoles,
  normaliseRole,
  resolveInheritedRoles,
};
