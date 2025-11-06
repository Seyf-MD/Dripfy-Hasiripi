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

export type TouchFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'adHoc';

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
  sector?: string;
  revenueContribution?: number;
  touchFrequency?: TouchFrequency;
  segmentIds?: string[];
  autoSegmentIds?: string[];
}

export type SegmentRuleField =
  | 'sector'
  | 'type'
  | 'country'
  | 'city'
  | 'role'
  | 'revenueContribution'
  | 'touchFrequency'
  | 'manualSegment'
  | 'tags';

export type SegmentRuleOperator =
  | 'equals'
  | 'notEquals'
  | 'in'
  | 'notIn'
  | 'gte'
  | 'gt'
  | 'lte'
  | 'lt'
  | 'contains'
  | 'between';

export interface SegmentRuleCondition {
  field: SegmentRuleField;
  operator: SegmentRuleOperator;
  value: string | number | (string | number)[] | { min?: number; max?: number };
}

export interface SegmentRule {
  id: string;
  matcher?: 'all' | 'any';
  conditions: SegmentRuleCondition[];
  weight?: number;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  priority?: number;
  manualOnly?: boolean;
  tags?: string[];
  rules: SegmentRule[];
}

export interface SegmentRuleContext {
  manualSegments?: string[];
  tags?: string[];
  metrics?: {
    engagementScore?: number;
    lastInteractionDays?: number;
    revenueContribution?: number;
    [key: string]: number | undefined;
  };
}

export interface SegmentPerformanceMetric {
  segmentId: string;
  segmentName: string;
  memberCount: number;
  revenueContribution: number;
  revenueGrowth: number;
  engagementScore: number;
  expansionPotential: number;
}

export interface SegmentDrillDownRecord {
  id: string;
  segmentId: string;
  title: string;
  metric: string;
  value: number;
  delta: number;
  period: string;
  narrative?: string;
}

export type RelationshipChannel = 'meeting' | 'call' | 'email' | 'event' | 'deal' | 'note';

export interface RelationshipTimelineEvent {
  id: string;
  contactId: string;
  segmentIds: string[];
  occurredAt: string;
  channel: RelationshipChannel;
  summary: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  followUp?: string;
  owner?: string;
}

export interface SegmentCampaignRecommendation {
  id: string;
  segmentId: string;
  title: string;
  description: string;
  suggestedChannels: string[];
  expectedLift: number;
  audienceSize: number;
  cta?: string;
  recommendedSendDate?: string;
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

export type SignupSource =
  | 'organic'
  | 'paid'
  | 'referral'
  | 'partner'
  | 'event'
  | 'content'
  | 'other';

export interface SignupAttribution {
  source: SignupSource;
  campaign?: string | null;
  medium?: string | null;
  country?: string | null;
  landingPage?: string | null;
  referrer?: string | null;
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
    attribution?: SignupAttribution | null;
    tags?: string[];
}

export interface SignupFunnelStageDefinition {
  id: string;
  label: string;
  order: number;
  description?: string;
}

export interface SignupFunnelEvent {
  id: string;
  leadId: string;
  stageId: string;
  occurredAt: string;
  source: SignupSource;
  campaign?: string | null;
  country?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SignupFunnelDataset {
  stages: SignupFunnelStageDefinition[];
  events: SignupFunnelEvent[];
}

export interface SignupFunnelStageMetrics {
  stageId: string;
  label: string;
  position: number;
  uniqueLeads: number;
  conversionRate: number;
  cumulativeConversion: number;
  dropOffRate: number;
  dropOffCount: number;
  averageLeadTimeSeconds: number | null;
}

export type SignupFunnelSegmentType = 'source' | 'campaign' | 'country';

export interface SignupFunnelFilters {
  segment?: { type: SignupFunnelSegmentType; value: string } | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface SignupFunnelBreakdownRow {
  key: string;
  type: SignupFunnelSegmentType;
  totalLeads: number;
  conversionRate: number;
  dropOffStageId: string | null;
}

export interface SignupFunnelResult {
  stages: SignupFunnelStageMetrics[];
  totalLeads: number;
  overallConversionRate: number;
  averageLeadTimeSeconds: number | null;
  breakdown: SignupFunnelBreakdownRow[];
}

export interface AbTestVariantResult {
  id: string;
  label: string;
  participants: number;
  conversions: number;
  revenue?: number;
}

export interface AbTestExperiment {
  id: string;
  name: string;
  goal: string;
  status: 'running' | 'completed' | 'paused';
  startDate: string;
  endDate?: string | null;
  variants: AbTestVariantResult[];
}

export interface CampaignPerformance {
  id: string;
  name: string;
  source: SignupSource;
  country?: string | null;
  period: { start: string; end: string };
  metrics: {
    leads: number;
    conversions: number;
    spend: number;
    revenue: number;
  };
}

export interface CampaignComparisonInsight {
  id: string;
  title: string;
  detail: string;
  severity: 'success' | 'warning' | 'danger' | 'info';
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
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  language?: string;
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

export type InvoiceRiskLevel = 'low' | 'medium' | 'high';

export interface InvoiceApprovalStep {
  id: string;
  label: string;
  status: 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped';
  requiredRole: string;
  slaHours: number;
  decidedAt?: string | null;
  decidedBy?: string | null;
  escalatesTo?: string | null;
  notifications?: string[];
}

export interface InvoicePaymentPrediction {
  riskScore: number;
  level: InvoiceRiskLevel;
  expectedDelayDays: number | null;
}

export interface InvoicePaymentInfo {
  status: 'pending' | 'scheduled' | 'processing' | 'requires_confirmation' | 'completed' | 'failed' | 'simulated';
  provider: 'stripe' | 'bank' | 'simulation' | string | null;
  reference: string | null;
  triggeredBy?: string | null;
  triggeredAt?: string | null;
  scheduledFor?: string | null;
  failureReason?: string | null;
  meta?: Record<string, any> | null;
  predicted?: InvoicePaymentPrediction | null;
}

export interface InvoicePreviewReference {
  url: string | null;
  expiresAt: string | null;
  type: 'signed-url' | 'data-url' | 'none';
}

export interface InvoiceDocument {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  sha256?: string;
  uploadedAt: string;
  uploadedBy?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
    role?: string | null;
  } | null;
  extractedFields: {
    vendorName?: string | null;
    vendorAddress?: string | null;
    invoiceNumber?: string | null;
    purchaseOrder?: string | null;
    issueDate?: string | null;
    dueDate?: string | null;
    totalAmount?: number | null;
    taxAmount?: number | null;
    currency?: string | null;
    lineItems?: Array<Record<string, any>>;
  };
  approval: {
    status: 'pending' | 'approved' | 'rejected';
    route?: string | null;
    notes?: string[];
    steps: InvoiceApprovalStep[];
  };
  risk: {
    score: number;
    level: InvoiceRiskLevel;
    factors: string[];
  };
  payment: InvoicePaymentInfo;
  preview?: {
    lastGeneratedAt?: string | null;
    reference?: InvoicePreviewReference | null;
  };
}

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
  signupFunnel: SignupFunnelDataset;
  abTests: AbTestExperiment[];
  campaignPerformance: CampaignPerformance[];
  campaignInsights?: CampaignComparisonInsight[];
  segmentDefinitions: SegmentDefinition[];
  segmentPerformance: SegmentPerformanceMetric[];
  segmentDrillDowns: SegmentDrillDownRecord[];
  relationshipTimeline: RelationshipTimelineEvent[];
  campaignRecommendations: SegmentCampaignRecommendation[];
}
