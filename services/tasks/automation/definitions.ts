import type { TaskAutomationTrigger, TaskTemplate } from '../../../types';

export const taskTemplateDefinitions: TaskTemplate[] = [
  {
    id: 'tmpl-enterprise-onboarding',
    name: 'Kurumsal Onboarding Playbook',
    description:
      'Kurumsal müşteriler için kickoff, entegrasyon ve başarı devrine kadar tüm adımları kapsayan şablon.',
    category: 'Customer Success',
    defaultPriority: 'High',
    defaultAssignee: 'Customer Success',
    tags: ['onboarding', 'customer-success'],
    icon: 'Handshake',
    defaultBadges: [
      {
        id: 'badge-intake-automation',
        label: 'Form Otomasyonu',
        color: '#2563eb',
        description: 'Kick-off belgeleri otomatik gönderilir.',
      },
    ],
    defaultSla: {
      id: 'sla-enterprise-response',
      name: 'İlk Yanıt 24s',
      durationHours: 24,
      reminders: [
        { id: 'rem-enterprise-1', offsetMinutes: 60 * 12, channel: 'email', message: 'İlk yanıt için 12 saat kaldı.' },
        { id: 'rem-enterprise-2', offsetMinutes: 60 * 22, channel: 'push', message: 'SLA ihlaline 2 saat kaldı.' },
      ],
      escalation: {
        notifyChannels: ['email', 'slack'],
        reassignment: { assigneeName: 'Enterprise Queue', note: 'SLA aşıldı, kuyruk yöneticisine ata.' },
      },
      graceMinutes: 30,
    },
    steps: [
      {
        id: 'step-discovery',
        title: 'Kick-off & İhtiyaç Analizi',
        description: 'Kick-off toplantısı ve kapsam doğrulaması yapılır.',
        defaultAssignee: 'Account Manager',
        relativeDueInHours: 24,
        autoCreate: true,
        automationBadges: [
          { id: 'badge-discovery-brief', label: 'Brief Şablonu', color: '#f97316' },
        ],
        sla: {
          id: 'sla-discovery',
          name: 'Kick-off Tamamlama',
          durationHours: 24,
          reminders: [{ id: 'rem-discovery', offsetMinutes: 60 * 18, channel: 'email' }],
          escalation: { notifyChannels: ['email'] },
          graceMinutes: 15,
        },
      },
      {
        id: 'step-integration',
        title: 'Teknik Entegrasyon',
        description: 'API ve veri akışlarının kurulumu.',
        defaultAssignee: 'Integration Squad',
        relativeDueInHours: 72,
        autoCreate: true,
        dependencies: [
          { type: 'finish_to_start', target: 'step-discovery', label: 'Kick-off tamamlanmalı', isBlocking: true },
        ],
        automationBadges: [
          { id: 'badge-integration-checklist', label: 'Checklist', color: '#10b981' },
        ],
        sla: {
          id: 'sla-integration',
          name: 'Entegrasyon Hazırlığı',
          durationHours: 72,
          reminders: [{ id: 'rem-integration', offsetMinutes: 60 * 48, channel: 'slack' }],
          escalation: { notifyChannels: ['slack'] },
          graceMinutes: 60,
        },
      },
      {
        id: 'step-handoff',
        title: 'Başarı Handoff',
        description: 'Müşteri başarı ekibine devredilir.',
        defaultAssignee: 'CS Lead',
        relativeDueInHours: 120,
        autoCreate: true,
        dependencies: [
          { type: 'finish_to_start', target: 'step-integration', label: 'Entegrasyon tamamlanmalı', isBlocking: true },
        ],
        automationBadges: [
          { id: 'badge-handoff-automation', label: 'Handoff Otomasyonu', color: '#facc15' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-clinic-launch',
    name: 'Klinik Açılış Görevleri',
    description: 'Yeni klinik açılışında operasyonel hazırlık adımlarını standartlaştırır.',
    category: 'Operations',
    defaultPriority: 'Medium',
    defaultAssignee: 'Operations',
    tags: ['clinic', 'launch'],
    icon: 'Hospital',
    defaultBadges: [
      { id: 'badge-supplier', label: 'Tedarikçi Otomasyonu', color: '#7c3aed' },
    ],
    steps: [
      {
        id: 'step-supplies',
        title: 'Tedarik Kontrolü',
        description: 'Kritik sarf malzemeleri ve cihazlar teyit edilir.',
        defaultAssignee: 'Supply Team',
        relativeDueInHours: 48,
        autoCreate: true,
        sla: {
          id: 'sla-supplies',
          name: 'Tedarik Onayı',
          durationHours: 48,
          reminders: [{ id: 'rem-supplies', offsetMinutes: 60 * 36, channel: 'email' }],
          escalation: {
            notifyChannels: ['email'],
            reassignment: { assigneeName: 'Ops Director', note: 'Tedarik gecikmesi kritik.' },
          },
          graceMinutes: 30,
        },
      },
      {
        id: 'step-staffing',
        title: 'Personel Vardiya Planı',
        description: 'Açılış haftası için vardiyalar yayınlanır.',
        defaultAssignee: 'People Ops',
        relativeDueInHours: 72,
        autoCreate: true,
        dependencies: [
          { type: 'start_to_start', target: 'step-supplies', label: 'Tedarik durumu gözden geçirilmeli' },
        ],
      },
      {
        id: 'step-training',
        title: 'Eğitim Oturumları',
        description: 'Operasyonel eğitim ve güvenlik brifingleri planlanır.',
        defaultAssignee: 'Training Lead',
        relativeDueInHours: 96,
        autoCreate: false,
        dependencies: [
          { type: 'finish_to_start', target: 'parent', label: 'Ana görev onayı bekleniyor' },
        ],
      },
    ],
  },
  {
    id: 'tmpl-sales-renewal',
    name: 'Yenileme Risk Yönetimi',
    description: 'Sözleşme yenileme riskli müşterileri için aksiyon planı.',
    category: 'Sales',
    defaultPriority: 'High',
    defaultAssignee: 'Account Executive',
    tags: ['renewal', 'churn'],
    icon: 'Repeat',
    defaultBadges: [
      { id: 'badge-churn-alert', label: 'Churn Uyarısı', color: '#ef4444' },
    ],
    defaultSla: {
      id: 'sla-renewal-plan',
      name: 'Plan Oluşturma',
      durationHours: 36,
      reminders: [{ id: 'rem-renewal', offsetMinutes: 60 * 24, channel: 'push' }],
      escalation: { notifyChannels: ['push'] },
      graceMinutes: 20,
    },
    steps: [
      {
        id: 'step-risk-review',
        title: 'Risk İncelemesi',
        description: 'Sağlık skoru ve kullanım analizi yapılır.',
        defaultAssignee: 'CS Analyst',
        relativeDueInHours: 12,
        autoCreate: true,
      },
      {
        id: 'step-action-plan',
        title: 'Aksiyon Planı',
        description: 'Müşteri için teklif ve aksiyonlar belirlenir.',
        defaultAssignee: 'Account Executive',
        relativeDueInHours: 24,
        autoCreate: true,
        dependencies: [
          { type: 'finish_to_start', target: 'step-risk-review', label: 'Risk incelemesi tamamlanmalı', isBlocking: true },
        ],
      },
      {
        id: 'step-escalation-call',
        title: 'Yönetici Araması',
        description: 'Riskli müşteri ile yönetici seviyesi görüşme.',
        defaultAssignee: 'Sales Director',
        relativeDueInHours: 36,
        autoCreate: false,
        dependencies: [
          { type: 'finish_to_finish', target: 'step-action-plan', label: 'Plan hazır olmalı' },
        ],
      },
    ],
  },
];

export const taskAutomationTriggers: TaskAutomationTrigger[] = [
  {
    id: 'trigger-sla-breach-notify',
    name: 'SLA İhlali Bildirimi',
    description: 'Görev SLA süresi aşıldığında bildirim gönderir ve gerekli durumda yeniden atama yapar.',
    type: 'sla-breach',
    actions: [
      {
        id: 'action-sla-email',
        type: 'notify',
        label: 'Ekip E-postası',
        description: 'SLA ihlali e-postası gönderir.',
        channel: 'email',
        payload: { template: 'sla-breach', severity: 'critical' },
      },
      {
        id: 'action-sla-reassign',
        type: 'reassign',
        label: 'Operasyon Müdürüne Ata',
        description: 'Görevi operasyon müdürüne yeniden atar.',
        payload: { assigneeRole: 'operations_manager' },
      },
    ],
    cooldownMinutes: 5,
    tags: ['critical', 'sla'],
  },
  {
    id: 'trigger-dependency-unblocked',
    name: 'Bağımlılık Kaldırıldı',
    description: 'Bağlı görev tamamlandığında sıradaki görev sahibini uyarır.',
    type: 'dependency-resolved',
    actions: [
      {
        id: 'action-dependency-push',
        type: 'notify',
        label: 'Anlık Bildirim',
        channel: 'push',
        description: 'Görev sahibi mobil bildirimi alır.',
        payload: { category: 'dependency-ready' },
      },
    ],
    tags: ['dependency'],
  },
  {
    id: 'trigger-status-followup',
    name: 'Durum Güncellemesi Takibi',
    description: 'Görev “In Progress” durumunda 48 saat kalırsa ekip liderini bilgilendirir.',
    type: 'time-elapsed',
    conditions: [
      { field: 'task.status', operator: 'eq', value: 'In Progress' },
      { field: 'elapsedMinutes', operator: 'gt', value: 60 * 48 },
    ],
    actions: [
      {
        id: 'action-status-slack',
        type: 'notify',
        label: 'Slack Uyarısı',
        channel: 'slack',
        payload: { channel: '#ops-leads' },
      },
    ],
    cooldownMinutes: 120,
    tags: ['follow-up'],
  },
];
