// types.ts

export interface ScheduleEvent {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  time: string;
  title: string;
  participants: string[];
  type: 'Meeting' | 'Call' | 'Event';
}

export interface FinancialRecord {
  id: string;
  description: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  type: 'Incoming' | 'Outgoing';
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface Advantage {
  id: string;
  title: string;
  description: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  type: 'Company' | 'Individual';
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export type CalendarProvider = 'google' | 'outlook';

export interface TaskReminder {
  id: string;
  type: 'email' | 'push' | 'popup';
  minutesBefore: number;
  scheduledAt?: string | null;
  createdAt: string;
}

export interface TaskSchedulePlan {
  start: string | null;
  end: string | null;
  allDay: boolean;
  timezone: string | null;
  lastPlannedAt?: string;
}

export interface TaskCalendarLink {
  id: string;
  provider: CalendarProvider;
  integrationId: string | null;
  calendarId: string;
  eventId: string | null;
  syncState: 'pending' | 'synced' | 'error';
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export interface TaskPersonalization {
  ownerId: string;
  ownerName?: string | null;
  notes?: string;
  focusTags: string[];
  color?: string | null;
  schedule: TaskSchedulePlan;
}

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
  assignee: string;
  description?: string;
  reminders?: TaskReminder[];
  calendarLinks?: TaskCalendarLink[];
  personalization?: TaskPersonalization;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlannerCalendarEvent {
  id: string;
  taskId?: string;
  title: string;
  provider?: CalendarProvider;
  start?: string | null;
  end?: string | null;
  allDay?: boolean;
  timezone?: string | null;
  status?: string;
}

export interface CalendarIntegrationAccount {
  id: string;
  provider: CalendarProvider;
  accountEmail: string;
  accountName?: string;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
  syncStatus?: 'idle' | 'ok' | 'error';
  expiresAt?: string | null;
  hasRefreshToken?: boolean;
  preferences: {
    autoSync: boolean;
    syncWindowDays: number;
    reminderMinutesBefore: number;
    allowWebhookFallback: boolean;
  };
}

export type UserRole = 'viewer' | 'user' | 'approver' | 'finance' | 'manager' | 'admin';
export type OperationalRole = 'admin' | 'finance' | 'operations' | 'product' | 'medical' | 'people';
export type Department = 'Operations' | 'Expansion' | 'Revenue' | 'Medical' | 'Product' | 'People';

export const ROLE_RANK: Record<UserRole, number> = {
  viewer: 0,
  user: 1,
  approver: 2,
  finance: 3,
  manager: 3,
  admin: 4,
};

export function isRoleAtLeast(role: UserRole | null | undefined, required: UserRole): boolean {
  if (!required) {
    return true;
  }
  if (!role) {
    return false;
  }
  if (role === required) {
    return true;
  }
  const roleRank = ROLE_RANK[role];
  const requiredRank = ROLE_RANK[required];
  if (typeof roleRank !== 'number' || typeof requiredRank !== 'number') {
    return false;
  }
  if (roleRank >= requiredRank) {
    return true;
  }
  const inheritance: Record<UserRole, UserRole[]> = {
    viewer: [],
    user: ['viewer'],
    approver: ['user', 'viewer'],
    finance: ['approver', 'user', 'viewer'],
    manager: ['approver', 'user', 'viewer'],
    admin: ['manager', 'finance', 'approver', 'user', 'viewer'],
  };
  return inheritance[role]?.includes(required) ?? false;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin: string;
  operationalRole?: OperationalRole;
  department?: Department;
}

export type AuditLogCriticality = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
    id: string;
    user: string;
    action: 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Denied';
    targetType: string;
    targetId: string;
    timestamp: string;
    details: string;
    label: string;
    sourceModule: string;
    criticality: AuditLogCriticality;
}

export type KeyResultStatus = 'onTrack' | 'atRisk' | 'offTrack' | 'completed';

export interface OKRKeyResult {
  id: string;
  title: string;
  metricUnit: string;
  baseline: number;
  target: number;
  current: number;
  status: KeyResultStatus;
}

export type OKRStatus = 'draft' | 'active' | 'completed' | 'onHold';

export interface OKRMetricsSnapshot {
  baseline: number;
  target: number;
  current: number;
  unit: string;
}

export interface OKRRecord {
  id: string;
  objective: string;
  ownerRole: OperationalRole;
  department: Department;
  startDate: string;
  targetDate: string;
  progress: number;
  status: OKRStatus;
  tags: string[];
  keyResults: OKRKeyResult[];
  metrics: OKRMetricsSnapshot;
  lastUpdatedAt: string;
  lastUpdatedBy?: string;
  requiresValidation: boolean;
  validatedAt?: string | null;
  validatedBy?: string | null;
}

export interface KPITrendMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  description: string;
  trend?: number;
  meta?: Record<string, unknown>;
}

export interface KpiOverview {
  metrics: KPITrendMetric[];
  taskMetrics: {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
  };
  financialMetrics: {
    incoming: number;
    outgoing: number;
    netCashFlow: number;
    pending: number;
  };
  okrMetrics: {
    activeCount: number;
    averageProgress: number;
    requiresValidation: number;
  };
}

export interface UserPermission {
    userId: string;
    userName: string;
    permissions: {
        [key: string]: {
            view: boolean;
            edit: boolean;
        }
    }
}

export interface SignupRequest {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone: string;
    countryCode?: string;
    country?: string;
    company?: string;
    position: string;
    status: 'pending';
    timestamp: string;
}

export interface NotificationSettings {
    email: boolean;
    push: boolean;
}

export type Theme = 'light' | 'dark';
export type AdminSubTab = 'permissions' | 'audit' | 'requests';

export type ApprovalFlowType = 'signup' | 'finance' | 'task';
export type ApprovalStepStatus = 'pending' | 'waiting' | 'approved' | 'rejected' | 'skipped';

export interface ApprovalUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface ApprovalStep {
  id: string;
  label: string;
  requiredRole: UserRole;
  slaHours: number;
  escalatesTo: UserRole | null;
  notifications: Array<'email' | 'push'>;
  status: ApprovalStepStatus;
  decidedAt: string | null;
  decidedBy: string | null;
  decidedByRole: UserRole | null;
  comment: string | null;
  slaDeadline: string | null;
  slaSecondsRemaining: number | null;
  pendingUsers: ApprovalUserSummary[];
}

export interface ApprovalFlowSummary {
  id: string;
  type: ApprovalFlowType;
  entityId: string;
  reference: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  submittedBy: { name?: string | null; email?: string | null } | null;
  metadata: Record<string, unknown> | null;
  steps: ApprovalStep[];
  currentStepId: string | null;
}

export interface ApprovalDecisionPayload {
  decision: 'approved' | 'rejected';
  comment?: string;
}

export type DataItem = ScheduleEvent | FinancialRecord | Challenge | Advantage | Contact | Task | User | OKRRecord;

export type ChatbotAction = 'createTask' | 'updateRecord' | 'triggerReport';

export interface ChatbotReference {
  id: string;
  title: string;
  snippet: string;
  source: string;
  path?: string;
  score?: number;
}

export interface ChatbotMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotResponsePayload {
  answer: string;
  references: ChatbotReference[];
  provider: string;
}

export interface ChatbotPromptTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  recommendedSources?: string[];
}

export type ChatbotActionPermissionMap = Record<ChatbotAction, UserRole[]>;

export type ForecastInsightSeverity = 'positive' | 'warning' | 'critical' | 'info';

export interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
  baseline?: number;
}

export interface ForecastScenarioSummary {
  total: number;
  averageDaily: number;
  change: number;
  lastValue: number;
}

export interface ForecastScenario {
  name: string;
  label: string;
  series: ForecastPoint[];
  summary: ForecastScenarioSummary;
}

export interface ForecastAnomaly {
  date: string;
  value: number;
  score: number;
  severity: 'info' | 'warning' | 'critical' | 'high' | 'positive';
  description: string;
}

export interface ForecastInsightCard {
  title: string;
  description: string;
  severity: ForecastInsightSeverity;
}

export interface FinanceForecastData {
  generatedAt: string;
  scenario: ForecastScenario;
  baseline: ForecastPoint[];
  history: { date: string; value: number }[];
  stats: {
    mean: number;
    stdDeviation: number;
    trendSlope: number;
    volatilityIndex: number;
    latestValue: number;
  };
  anomalies: ForecastAnomaly[];
  recommendations: ForecastInsightCard[];
  scenarios: Record<string, ForecastScenario>;
}

export interface FinanceForecastResponse {
  ok: boolean;
  data?: FinanceForecastData;
  error?: { message: string };
}

export interface DashboardData {
  schedule: ScheduleEvent[];
  financials: FinancialRecord[];
  challenges: Challenge[];
  advantages: Advantage[];
  contacts: Contact[];
  tasks: Task[];
  users: User[];
  okrs: OKRRecord[];
  auditLog: AuditLogEntry[];
  userPermissions: UserPermission[];
  signupRequests: SignupRequest[];
}
