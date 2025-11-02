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

export interface Task {
  id: string;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
  assignee: string;
}

export type UserRole = 'admin' | 'user';
export type OperationalRole = 'admin' | 'finance' | 'operations' | 'product' | 'medical' | 'people';
export type Department = 'Operations' | 'Expansion' | 'Revenue' | 'Medical' | 'Product' | 'People';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  lastLogin: string;
  operationalRole?: OperationalRole;
  department?: Department;
}

export interface AuditLogEntry {
    id: string;
    user: string;
    action: 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Denied';
    targetType: string;
    targetId: string;
    timestamp: string;
    details: string;
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
