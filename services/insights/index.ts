import type {
  CapacitySnapshot,
  CustomerProfile,
  FinancialRecord,
  InsightActionOption,
  InsightFeatureRow,
  InsightModelArtifacts,
  InsightRecord,
  InsightSeverity,
  OperationalRole,
  UserRole,
  Task,
} from '../../types';
import {
  buildInsightWarehouseRows,
  type BuildInsightWarehouseInput,
  type InsightFactRow,
  type InsightWarehouseSummary,
} from '../../datawarehouse/insights/schema';
import { createTask } from '../tasks';
import { executeAutomationCommand } from '../automation/actions';
import type { AutomationCommand } from '../automation/commandParser';
import { requestChatCompletion } from '../chatbot/api';

export interface PrepareInsightDatasetInput extends BuildInsightWarehouseInput {}

export interface InsightPipelineResult {
  summary: InsightWarehouseSummary;
  features: InsightFeatureRow[];
  models: InsightModelArtifacts;
  insights: InsightRecord[];
}

export interface ExecuteInsightActionOptions {
  insight: InsightRecord;
  action: InsightActionOption;
}

export interface ExecuteInsightActionResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

interface NotificationPayload {
  message: string;
  audience?: string[];
  metadata?: Record<string, unknown>;
}

function computeMean(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeStdDev(values: number[], mean: number): number {
  if (values.length < 2) {
    return 0;
  }
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function toFeatureRow(row: InsightFactRow, generatedAt: string): InsightFeatureRow {
  return {
    id: row.insight_id,
    category: row.category,
    kind: row.kind,
    entityId: row.entity_id,
    entityType: row.entity_type,
    metrics: {
      anomalyScore: row.anomaly_score ?? 0,
      churnRiskScore: row.churn_risk_score ?? 0,
      capacityPressureScore: row.capacity_pressure_score ?? 0,
      backlogVolume: row.backlog_volume ?? 0,
      revenueImpact: row.revenue_impact ?? 0,
    },
    timestamp: generatedAt,
    tags: row.tags,
  };
}

export function prepareInsightDataset(input: PrepareInsightDatasetInput) {
  const summary = buildInsightWarehouseRows(input);
  const features = summary.rows.map((row) => toFeatureRow(row, summary.generatedAt));
  return { summary, features };
}

export function trainInsightModels(features: InsightFeatureRow[]): InsightModelArtifacts {
  const anomalyValues: number[] = [];
  const churnValues: number[] = [];
  const capacityValues: number[] = [];

  features.forEach((feature) => {
    if (feature.metrics.anomalyScore) {
      anomalyValues.push(Math.abs(feature.metrics.anomalyScore));
    }
    if (feature.metrics.churnRiskScore) {
      churnValues.push(feature.metrics.churnRiskScore);
    }
    if (feature.metrics.capacityPressureScore) {
      capacityValues.push(feature.metrics.capacityPressureScore);
    }
  });

  const anomalyMean = computeMean(anomalyValues);
  const anomalyStdDev = computeStdDev(anomalyValues, anomalyMean);
  const churnMean = computeMean(churnValues);
  const churnStdDev = computeStdDev(churnValues, churnMean);
  const capacityMean = computeMean(capacityValues);
  const capacityStdDev = computeStdDev(capacityValues, capacityMean);

  const trainedAt = new Date().toISOString();

  return {
    anomaly: {
      mean: anomalyMean,
      stdDev: anomalyStdDev,
      warningThreshold: anomalyMean + anomalyStdDev * 1.5,
      criticalThreshold: anomalyMean + anomalyStdDev * 2.5,
      featureNames: ['anomalyScore', 'revenueImpact'],
      version: 'insights-anomaly-v1',
      trainedAt,
      sampleSize: anomalyValues.length,
    },
    churn: {
      coefficients: {
        churnRiskScore: churnStdDev === 0 ? 1 : 1 / churnStdDev,
        revenueImpact: churnMean > 0 ? 1 / churnMean : 0,
      },
      intercept: -0.35,
      threshold: Math.max(0.45, churnMean || 0.6),
      version: 'insights-churn-v1',
      trainedAt,
      sampleSize: churnValues.length,
    },
    capacity: {
      upperBound: capacityMean + capacityStdDev * 2,
      lowerBound: Math.max(0, capacityMean - capacityStdDev),
      trend: capacityValues.length ? capacityValues[capacityValues.length - 1] - capacityMean : 0,
      seasonality: capacityStdDev,
      window: Math.max(7, capacityValues.length),
      version: 'insights-capacity-v1',
      trainedAt,
    },
  };
}

function describeInsight(row: InsightFactRow): { title: string; summary: string } {
  switch (row.category) {
    case 'finance':
      return {
        title: `Finans anomalisi · ${row.entity_label ?? row.entity_id}`,
        summary: 'Beklenenden sapma gösteren bir finans kaydı tespit edildi.',
      };
    case 'operations':
      return {
        title: `Operasyon önceliği · ${row.entity_label ?? row.entity_id}`,
        summary: 'Görev yükünde artış veya gecikme gözlemlendi.',
      };
    case 'capacity':
      return {
        title: `Kapasite baskısı · ${row.entity_label ?? row.entity_id}`,
        summary: 'Kaynak kullanımı eşik değerlerini aşıyor.',
      };
    case 'customer':
      return {
        title: `Churn riski · ${row.entity_label ?? row.entity_id}`,
        summary: 'Müşteri sağlığı düşüyor ve churn riski yükseliyor.',
      };
    default:
      return {
        title: row.entity_label ?? row.entity_id,
        summary: 'Veri ambarından yeni bir insight üretildi.',
      };
  }
}

function evaluateSeverity(row: InsightFactRow, models: InsightModelArtifacts): { severity: InsightSeverity; score: number } {
  if (row.category === 'finance') {
    const score = Math.abs(row.anomaly_score ?? 0);
    const severity = score >= models.anomaly.criticalThreshold
      ? 'critical'
      : score >= models.anomaly.warningThreshold
        ? 'high'
        : score >= models.anomaly.mean
          ? 'medium'
          : 'low';
    return { severity, score: clamp(score / (models.anomaly.criticalThreshold || 1)) };
  }

  if (row.category === 'customer') {
    const score = row.churn_risk_score ?? 0;
    const severity = score >= models.churn.threshold + 0.2
      ? 'high'
      : score >= models.churn.threshold
        ? 'medium'
        : 'low';
    return { severity, score: clamp(score) };
  }

  if (row.category === 'capacity') {
    const score = row.capacity_pressure_score ?? 0;
    const severity = score >= models.capacity.upperBound
      ? 'critical'
      : score >= 0.95
        ? 'high'
        : score >= 0.8
          ? 'medium'
          : 'low';
    return { severity, score: clamp(score) };
  }

  if (row.category === 'operations') {
    const backlog = row.backlog_volume ?? 0;
    const severity: InsightSeverity = backlog >= 14
      ? 'high'
      : backlog >= 7
        ? 'medium'
        : row.severity;
    return { severity, score: clamp(backlog / 21) };
  }

  return { severity: row.severity, score: clamp(Math.abs(row.anomaly_score ?? 0)) };
}

function resolveAudience(row: InsightFactRow): { minRole: UserRole; operationalRoles: readonly OperationalRole[] } {
  switch (row.category) {
    case 'finance':
      return { minRole: 'finance', operationalRoles: ['finance', 'admin'] as const };
    case 'capacity':
      return { minRole: 'manager', operationalRoles: ['operations', 'admin'] as const };
    case 'customer':
      return { minRole: 'user', operationalRoles: ['operations', 'product', 'admin'] as const };
    default:
      return { minRole: 'user', operationalRoles: ['operations', 'people', 'admin'] as const };
  }
}

function buildEntityRefs(row: InsightFactRow) {
  const refs: InsightRecord['entityRefs'] = [];
  refs.push({ type: row.entity_type, id: row.entity_id, label: row.entity_label });
  if (row.customer_id) {
    refs.push({ type: 'customer', id: row.customer_id });
  }
  if (row.financial_record_id) {
    refs.push({ type: 'financial', id: row.financial_record_id });
  }
  if (row.capacity_unit_id) {
    refs.push({ type: 'capacity', id: row.capacity_unit_id });
  }
  if (row.task_id) {
    refs.push({ type: 'task', id: row.task_id });
  }
  return refs;
}

function ensureActionIds(actions: InsightActionOption[], insightId: string): InsightActionOption[] {
  return actions.map((action, index) => ({
    id: action.id || `${insightId}-action-${index}`,
    ...action,
  }));
}

export function scoreInsights(rows: InsightFactRow[], models: InsightModelArtifacts): InsightRecord[] {
  return rows.map((row) => {
    const { severity, score } = evaluateSeverity(row, models);
    const description = describeInsight(row);
    const audience = resolveAudience(row);

    return {
      id: row.insight_id,
      title: description.title,
      summary: description.summary,
      category: row.category,
      kind: row.kind,
      severity,
      score,
      confidence: clamp(row.confidence ?? 0.65),
      generatedAt: row.snapshot_date,
      timeframe: row.attributes?.dueDate
        ? { start: row.attributes.dueDate as string, end: row.attributes.dueDate as string }
        : undefined,
      signals: row.signals,
      actions: ensureActionIds(row.recommended_actions, row.insight_id),
      audience: {
        minRole: audience.minRole,
        operationalRoles: [...audience.operationalRoles],
      },
      entityRefs: buildEntityRefs(row),
      tags: row.tags,
      sourceModel: row.source_model ?? models.anomaly.version,
      narrative: row.leading_signal
        ? `${row.leading_signal} sinyali, ${row.trailing_signal ?? 'ölçüm'} göstergesine kıyasla artış gösteriyor.`
        : undefined,
    };
  });
}

export async function runInsightPipeline(input: {
  financials: FinancialRecord[];
  tasks: Task[];
  capacitySnapshots: CapacitySnapshot[];
  customers: CustomerProfile[];
  now?: Date;
}): Promise<InsightPipelineResult> {
  const { summary, features } = prepareInsightDataset(input);
  const models = trainInsightModels(features);
  const insights = scoreInsights(summary.rows, models);
  return { summary, features, models, insights };
}

function toAutomationCommand(payload: Record<string, unknown>): AutomationCommand | null {
  if (!payload?.command || typeof payload.command !== 'string') {
    return null;
  }
  if (payload.command === 'createTask') {
    const command: AutomationCommand = {
      type: 'createTask',
      raw: '/gorev otomatik',
      title: String(payload.title ?? 'Insight görevi'),
      description: typeof payload.description === 'string' ? payload.description : undefined,
      assignee: typeof payload.assignee === 'string' ? payload.assignee : undefined,
      priority: (payload.priority as 'High' | 'Medium' | 'Low') ?? 'Medium',
      dueDate: typeof payload.dueDate === 'string' ? payload.dueDate : undefined,
    };
    return command;
  }
  return null;
}

function dispatchInsightNotification(insight: InsightRecord, payload: NotificationPayload): ExecuteInsightActionResult {
  const detail = {
    insightId: insight.id,
    message: payload.message,
    audience: payload.audience ?? null,
    metadata: payload.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('insights:notification', { detail }));
  }
  return {
    ok: true,
    message: 'Bildirim tetiklendi.',
    data: detail,
  };
}

export async function executeInsightAction(options: ExecuteInsightActionOptions): Promise<ExecuteInsightActionResult> {
  const { insight, action } = options;
  switch (action.type) {
    case 'task': {
      const title = (action.payload?.title as string) || insight.title;
      const response = await createTask({
        title,
        description: (action.payload?.description as string) || insight.summary,
        priority: (action.payload?.priority as string) || 'Medium',
        dueDate: action.payload?.dueDate as string | undefined,
        assignee: action.payload?.assignee as string | undefined,
      });
      return { ok: true, message: 'Görev oluşturuldu.', data: response };
    }
    case 'automation': {
      const command = toAutomationCommand((action.payload ?? {}) as Record<string, unknown>);
      if (!command) {
        return { ok: false, message: 'Geçerli otomasyon komutu bulunamadı.' };
      }
      const result = await executeAutomationCommand(command);
      return { ok: result.ok, message: result.message, data: result.data };
    }
    case 'chatbot': {
      const prompt = (action.payload?.prompt as string) || `${insight.title}\n${insight.summary}`;
      const result = await requestChatCompletion({
        prompt,
        sources: ['datawarehouse', 'operations'],
        conversation: [],
        dashboardContext: { insight },
      });
      return { ok: true, message: 'Chatbot yanıtı oluşturuldu.', data: result };
    }
    case 'notification': {
      const payload: NotificationPayload = {
        message: String(action.payload?.message ?? insight.summary),
        audience: Array.isArray(action.payload?.audience)
          ? (action.payload?.audience as string[])
          : undefined,
        metadata: action.payload?.metadata as Record<string, unknown> | undefined,
      };
      return dispatchInsightNotification(insight, payload);
    }
    case 'link':
    default:
      return { ok: false, message: 'Desteklenmeyen insight aksiyonu.' };
  }
}

export type { InsightFactRow } from '../../datawarehouse/insights/schema';
