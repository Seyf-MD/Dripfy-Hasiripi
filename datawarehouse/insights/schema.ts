import type {
  CapacitySnapshot,
  CustomerProfile,
  FinancialRecord,
  InsightActionOption,
  InsightCategory,
  InsightKind,
  InsightRecord,
  InsightSeverity,
  Task,
} from '../../types';

export interface InsightFactRow {
  insight_id: string;
  snapshot_date: string;
  category: InsightCategory;
  kind: InsightKind;
  severity: InsightSeverity;
  entity_type: 'financial' | 'task' | 'capacity' | 'customer';
  entity_id: string;
  entity_label?: string;
  financial_record_id?: string | null;
  task_id?: string | null;
  capacity_unit_id?: string | null;
  customer_id?: string | null;
  anomaly_score?: number | null;
  churn_risk_score?: number | null;
  capacity_pressure_score?: number | null;
  revenue_impact?: number | null;
  backlog_volume?: number | null;
  leading_signal?: string | null;
  trailing_signal?: string | null;
  confidence?: number | null;
  tags: string[];
  attributes: Record<string, string | number | boolean | null>;
  signals: InsightRecord['signals'];
  recommended_actions: InsightActionOption[];
  source_model?: string | null;
}

export interface BuildInsightWarehouseInput {
  financials: FinancialRecord[];
  tasks: Task[];
  capacitySnapshots: CapacitySnapshot[];
  customers: CustomerProfile[];
  now?: Date;
}

export interface InsightWarehouseSummary {
  rows: InsightFactRow[];
  generatedAt: string;
  totals: {
    finance: number;
    operations: number;
    capacity: number;
    customer: number;
  };
}

const INSIGHT_FACT_TABLE = 'dw_insights_fact';

function normaliseFinancialAmount(record: FinancialRecord): number {
  if (record.type === 'Outgoing') {
    return -Math.abs(record.amount);
  }
  return Math.abs(record.amount);
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

function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) {
    return 0;
  }
  return (value - mean) / stdDev;
}

function determineSeverity(score: number): InsightSeverity {
  const absScore = Math.abs(score);
  if (absScore >= 3) {
    return 'critical';
  }
  if (absScore >= 2) {
    return 'high';
  }
  if (absScore >= 1) {
    return 'medium';
  }
  if (absScore >= 0.5) {
    return 'low';
  }
  return 'info';
}

function calculateOverdueDays(dueDate: string, now: Date): number {
  const due = new Date(dueDate);
  const diffMs = now.getTime() - due.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function asISODateTime(date: Date): string {
  return date.toISOString();
}

export function buildInsightWarehouseRows(input: BuildInsightWarehouseInput): InsightWarehouseSummary {
  const now = input.now ?? new Date();
  const snapshotDate = asISODateTime(now);
  const rows: InsightFactRow[] = [];

  const financialValues = input.financials.map((record) => normaliseFinancialAmount(record));
  const financialMean = computeMean(financialValues);
  const financialStdDev = computeStdDev(financialValues, financialMean);

  input.financials.forEach((record) => {
    const amount = normaliseFinancialAmount(record);
    const zScore = calculateZScore(amount, financialMean, financialStdDev);
    const severity = determineSeverity(zScore);
    if (severity === 'info') {
      return;
    }

    rows.push({
      insight_id: `finance-${record.id}`,
      snapshot_date: snapshotDate,
      category: 'finance',
      kind: 'anomaly',
      severity,
      entity_type: 'financial',
      entity_id: record.id,
      entity_label: record.description,
      financial_record_id: record.id,
      anomaly_score: Number(zScore.toFixed(2)),
      revenue_impact: Number(amount.toFixed(2)),
      leading_signal: record.status === 'Overdue' ? 'overdue' : 'volatility',
      trailing_signal: record.status,
      confidence: Math.max(0.5, Math.min(0.95, 0.65 + Math.abs(zScore) * 0.1)),
      tags: ['finance', record.status.toLowerCase()],
      attributes: {
        dueDate: record.dueDate,
        status: record.status,
        type: record.type,
      },
      signals: [
        {
          metric: 'normalizedAmount',
          value: Number(amount.toFixed(2)),
          baseline: Number(financialMean.toFixed(2)),
          delta: Number((amount - financialMean).toFixed(2)),
          direction: amount > financialMean ? 'up' : 'down',
          unit: 'TRY',
        },
      ],
      recommended_actions: [
        {
          id: `task-${record.id}`,
          type: 'task',
          label: 'Tahsilat takibi oluştur',
          description: 'Finans ekibi için otomatik takip görevi planla.',
          payload: {
            title: `Finans kaydı için aksiyon: ${record.description}`,
            dueDate: record.dueDate,
            priority: record.status === 'Overdue' ? 'High' : 'Medium',
          },
        },
        {
          id: `chatbot-${record.id}`,
          type: 'chatbot',
          label: 'Chatbot ile analiz et',
          description: 'AI destekli açıklama ve öneri iste.',
          payload: {
            prompt: `Finans kaydı ${record.description} için anormallik analizi yap ve öneriler sun.`,
          },
        },
      ],
      source_model: `${INSIGHT_FACT_TABLE}:finance.zscore`,
    });
  });

  input.tasks.forEach((task) => {
    const overdueDays = task.dueDate ? calculateOverdueDays(task.dueDate, now) : 0;
    const severity: InsightSeverity = overdueDays >= 7
      ? 'high'
      : overdueDays > 0
        ? 'medium'
        : task.priority === 'High'
          ? 'medium'
          : 'info';

    if (severity === 'info' && overdueDays <= 0) {
      return;
    }

    rows.push({
      insight_id: `task-${task.id}`,
      snapshot_date: snapshotDate,
      category: 'operations',
      kind: 'recommendation',
      severity,
      entity_type: 'task',
      entity_id: task.id,
      entity_label: task.title,
      task_id: task.id,
      backlog_volume: overdueDays > 0 ? overdueDays : null,
      leading_signal: overdueDays > 0 ? 'overdue' : 'priority',
      trailing_signal: task.status,
      confidence: 0.7,
      tags: ['operations', overdueDays > 0 ? 'overdue' : 'priority'],
      attributes: {
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
      },
      signals: [
        {
          metric: 'overdueDays',
          value: overdueDays,
          direction: overdueDays > 0 ? 'up' : 'flat',
          unit: 'days',
        },
      ],
      recommended_actions: [
        {
          id: `automation-${task.id}`,
          type: 'automation',
          label: 'Görev otomasyonunu tetikle',
          description: 'Takımın kapasitesine göre yeniden planla.',
          payload: {
            command: 'createTask',
            sourceTaskId: task.id,
          },
        },
        {
          id: `chatbot-task-${task.id}`,
          type: 'chatbot',
          label: 'Chatbot ile planla',
          payload: {
            prompt: `Görev ${task.title} için yeniden planlama önerisi üret.`,
          },
        },
      ],
      source_model: `${INSIGHT_FACT_TABLE}:tasks.backlog`,
    });
  });

  input.capacitySnapshots.forEach((snapshot) => {
    const utilisation = snapshot.utilisation;
    const backlogRatio = snapshot.totalCapacity > 0 ? snapshot.backlog / snapshot.totalCapacity : 0;
    const pressureScore = Math.max(utilisation, backlogRatio);
    if (pressureScore < 0.75) {
      return;
    }

    const severity: InsightSeverity = pressureScore >= 1
      ? 'critical'
      : pressureScore >= 0.9
        ? 'high'
        : 'medium';

    rows.push({
      insight_id: `capacity-${snapshot.id}`,
      snapshot_date: snapshotDate,
      category: 'capacity',
      kind: 'capacity',
      severity,
      entity_type: 'capacity',
      entity_id: snapshot.unitId,
      entity_label: snapshot.unitLabel,
      capacity_unit_id: snapshot.unitId,
      capacity_pressure_score: Number(pressureScore.toFixed(2)),
      backlog_volume: Number(snapshot.backlog.toFixed(2)),
      leading_signal: 'utilisation',
      trailing_signal: snapshot.status ?? null,
      confidence: 0.75,
      tags: ['capacity', utilisation >= 1 ? 'overbooked' : 'tight'],
      attributes: {
        utilisation: Number(utilisation.toFixed(2)),
        backlog: snapshot.backlog,
        available: snapshot.available,
      },
      signals: [
        {
          metric: 'utilisation',
          value: Number(utilisation.toFixed(2)),
          baseline: 0.75,
          direction: utilisation > 0.75 ? 'up' : 'flat',
          unit: 'ratio',
        },
        {
          metric: 'backlog',
          value: snapshot.backlog,
          direction: snapshot.backlog > snapshot.available ? 'up' : 'down',
          unit: 'units',
        },
      ],
      recommended_actions: [
        {
          id: `task-capacity-${snapshot.id}`,
          type: 'task',
          label: 'Kaynak ekle',
          payload: {
            title: `${snapshot.unitLabel} kapasitesini artır`,
            priority: severity === 'critical' ? 'High' : 'Medium',
          },
        },
        {
          id: `chatbot-capacity-${snapshot.id}`,
          type: 'chatbot',
          label: 'Chatbot optimizasyonu',
          payload: {
            prompt: `${snapshot.unitLabel} için kapasite optimizasyon önerileri oluştur.`,
          },
        },
      ],
      source_model: `${INSIGHT_FACT_TABLE}:capacity.threshold`,
    });
  });

  input.customers.forEach((customer) => {
    const churnScore = customer.churnRiskScore ?? (customer.healthScore ? 1 - customer.healthScore : 0);
    if (!churnScore || churnScore < 0.4) {
      return;
    }

    const severity: InsightSeverity = churnScore >= 0.8
      ? 'high'
      : churnScore >= 0.6
        ? 'medium'
        : 'low';

    rows.push({
      insight_id: `customer-${customer.id}`,
      snapshot_date: snapshotDate,
      category: 'customer',
      kind: 'churn',
      severity,
      entity_type: 'customer',
      entity_id: customer.id,
      entity_label: customer.name,
      customer_id: customer.id,
      churn_risk_score: Number(churnScore.toFixed(2)),
      revenue_impact: customer.monthlyRecurringRevenue ?? null,
      leading_signal: 'churnRiskScore',
      trailing_signal: customer.lifecycleStage,
      confidence: 0.7,
      tags: ['customer', customer.lifecycleStage],
      attributes: {
        lifecycleStage: customer.lifecycleStage,
        healthScore: customer.healthScore ?? null,
        lastInteractionAt: customer.lastInteractionAt ?? null,
      },
      signals: [
        {
          metric: 'churnRiskScore',
          value: Number(churnScore.toFixed(2)),
          baseline: 0.35,
          direction: 'up',
        },
      ],
      recommended_actions: [
        {
          id: `task-customer-${customer.id}`,
          type: 'task',
          label: 'Müşteri kurtarma görevi',
          payload: {
            title: `${customer.name} için risk azaltma planı`,
            priority: severity === 'high' ? 'High' : 'Medium',
          },
        },
        {
          id: `chatbot-customer-${customer.id}`,
          type: 'chatbot',
          label: 'Chatbot stratejisi',
          payload: {
            prompt: `${customer.name} müşterisi için churn azaltma önerileri üret.`,
          },
        },
        {
          id: `notify-customer-${customer.id}`,
          type: 'notification',
          label: 'Bildirim gönder',
          payload: {
            message: `${customer.name} için churn riski ${Number(churnScore.toFixed(2)) * 100}% seviyesinde.`,
            audience: customer.ownerId ? [customer.ownerId] : undefined,
          },
        },
      ],
      source_model: `${INSIGHT_FACT_TABLE}:customer.risk`,
    });
  });

  return {
    rows,
    generatedAt: snapshotDate,
    totals: {
      finance: rows.filter((row) => row.category === 'finance').length,
      operations: rows.filter((row) => row.category === 'operations').length,
      capacity: rows.filter((row) => row.category === 'capacity').length,
      customer: rows.filter((row) => row.category === 'customer').length,
    },
  };
}

export { INSIGHT_FACT_TABLE };
