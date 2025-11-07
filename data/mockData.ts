import {
  Contact,
  DashboardData,
  ScheduleEventLocation,
  ScheduleEventTeam,
  TaskSLAReport,
  TouchFrequency,
} from '../types';
import { taskTemplateDefinitions, taskAutomationTriggers } from '../services/tasks/automation/definitions';

const scheduleTeams: Record<string, ScheduleEventTeam> = {
  partnerships: {
    id: 'team-partnerships',
    name: 'Stratejik Ortaklıklar',
    members: ['Marcus', 'PR Team'],
    capacityHoursPerDay: 24,
    timezone: 'Europe/Berlin',
  },
  operations: {
    id: 'team-operations',
    name: 'Operasyon ve Etkinlikler',
    members: ['Gabriel', 'Event Team'],
    capacityHoursPerDay: 26,
    timezone: 'Europe/Berlin',
  },
  medical: {
    id: 'team-medical',
    name: 'Medikal İnovasyon',
    members: ['Dr. Adeel Khan', 'Dt. Moritz Breitenbach'],
    capacityHoursPerDay: 22,
    timezone: 'Europe/Berlin',
  },
};

const scheduleLocations: Record<string, ScheduleEventLocation> = {
  frankfurtHq: {
    id: 'loc-frankfurt-hq',
    name: 'Frankfurt Longevity HQ',
    type: 'onsite',
    timezone: 'Europe/Berlin',
    address: 'Goethestraße 20, Frankfurt',
    room: 'Strateji Salonu',
  },
  dubaiClinic: {
    id: 'loc-dubai',
    name: 'Dubai Precision Health Clinic',
    type: 'hybrid',
    timezone: 'Asia/Dubai',
    address: 'Sheikh Zayed Road, Dubai',
  },
  zurichExpo: {
    id: 'loc-zurich-expo',
    name: 'Frankfurt Healthexpo Dijital Salonu',
    type: 'remote',
    timezone: 'Europe/Berlin',
  },
  istanbulFlagship: {
    id: 'loc-istanbul-flagship',
    name: 'İstanbul Flagship Ofisi',
    type: 'onsite',
    timezone: 'Europe/Istanbul',
    address: 'Zorlu Center, İstanbul',
    room: 'Longevity Lounge',
  },
};

const taskSLAReports: TaskSLAReport[] = [
  {
    id: 'sla-overall',
    label: 'Genel SLA Sağlık Durumu',
    totalTracked: 48,
    breached: 5,
    warning: 9,
    averageResolutionHours: 29,
    trend: [
      { date: '2024-09-20', onTrack: 28, warning: 6, breached: 2 },
      { date: '2024-09-27', onTrack: 30, warning: 5, breached: 1 },
      { date: '2024-10-04', onTrack: 32, warning: 4, breached: 2 },
      { date: '2024-10-11', onTrack: 34, warning: 3, breached: 1 },
    ],
    hotspots: [
      {
        taskId: 't1',
        taskTitle: 'Livion Clinic Ziyareti & İlk Toplu Satış (50 adet NAD+)',
        assignee: 'Sales Team',
        breachedAt: '2024-10-07T07:30:00.000Z',
        impact: 'high',
      },
      {
        taskId: 't28',
        taskTitle: 'LR için Kredi Kartı Entegrasyonu',
        assignee: 'Finance',
        breachedAt: '2024-10-09T15:45:00.000Z',
        impact: 'medium',
      },
    ],
  },
  {
    id: 'sla-operations',
    label: 'Operasyon SLA Trendleri',
    totalTracked: 21,
    breached: 2,
    warning: 5,
    averageResolutionHours: 34,
    trend: [
      { date: '2024-09-20', onTrack: 10, warning: 3, breached: 1 },
      { date: '2024-09-27', onTrack: 11, warning: 2, breached: 1 },
      { date: '2024-10-04', onTrack: 12, warning: 2, breached: 0 },
      { date: '2024-10-11', onTrack: 13, warning: 1, breached: 0 },
    ],
    hotspots: [
      {
        taskId: 't31',
        taskTitle: 'Zadarma Yüklenmesi ve Dripfy Concierge Desk Başlangıcı',
        assignee: 'Tech Team',
        breachedAt: '2024-10-07T11:15:00.000Z',
        impact: 'medium',
      },
    ],
  },
];

export const mockData: DashboardData = {
  schedule: [
    {
      id: 's1',
      day: 'Monday',
      time: '10:00',
      title: 'German Medical ile Press Release Toplantısı',
      participants: ['Marcus', 'PR Team'],
      type: 'Meeting',
      capacity: { requiredHours: 1.5, allocatedHours: 1.5, unit: 'hours' },
      team: { ...scheduleTeams.partnerships },
      location: { ...scheduleLocations.frankfurtHq },
      notes: 'Basın planı ve lansman içeriği uyumu kontrol edilecek.',
      tags: ['press', 'launch'],
    },
    {
      id: 's2',
      day: 'Tuesday',
      time: '14:00',
      title: 'David Lyodds Club ile Wellness Entegrasyon Görüşmesi',
      participants: ['Gabriel'],
      type: 'Call',
      capacity: { requiredHours: 1, allocatedHours: 0.75, unit: 'hours' },
      team: { ...scheduleTeams.operations },
      location: { ...scheduleLocations.dubaiClinic },
      notes: 'Teklif kapsamı ve entegrasyon zaman çizelgesi gözden geçirilecek.',
      tags: ['partnership', 'integration'],
    },
    {
      id: 's3',
      day: 'Wednesday',
      time: '11:30',
      title: 'Dr. Adeel Khan ile Plazmaferez Cihazı Görüşmesi',
      participants: ['Dr. Adeel Khan'],
      type: 'Meeting',
      capacity: { requiredHours: 2, allocatedHours: 2, unit: 'hours' },
      team: { ...scheduleTeams.medical },
      location: { ...scheduleLocations.frankfurtHq },
      notes: 'Yeni cihaz teslimatı ve validasyon süreçleri belirleniyor.',
      tags: ['medical', 'innovation'],
    },
    {
      id: 's4',
      day: 'Thursday',
      time: '16:00',
      title: 'Frankfurt Healthexpo Katılımcı Listesi Talebi',
      participants: ['Event Team'],
      type: 'Event',
      capacity: { requiredHours: 1.5, allocatedHours: 1.2, unit: 'hours' },
      team: { ...scheduleTeams.operations },
      location: { ...scheduleLocations.zurichExpo },
      notes: 'Fuar katılımcı listesi ve demo slotları finalize edilecek.',
      tags: ['event', 'operations'],
    },
    {
      id: 's5',
      day: 'Friday',
      time: '15:00',
      title: 'Kliwla Family Office ile Dripfy Flagship Görüşmesi',
      participants: ['Dt. Moritz Breitenbach', 'Osman Altinisik'],
      type: 'Meeting',
      capacity: { requiredHours: 1.5, allocatedHours: 1.5, unit: 'hours' },
      team: { ...scheduleTeams.partnerships },
      location: { ...scheduleLocations.istanbulFlagship },
      notes: 'Flagship açılışı için ortak yatırım modeli değerlendirilecek.',
      tags: ['investment', 'flagship'],
    },
  ],
  financials: [
    { id: 'f1', description: 'Ibo Ödemesi', amount: -500, status: 'Pending', dueDate: '2024-10-07', type: 'Outgoing' },
    { id: 'f2', description: 'PTS İsviçre', amount: -1500, status: 'Pending', dueDate: '2024-10-07', type: 'Outgoing' },
    { id: 'f3', description: 'Dubai Press Release', amount: -500, status: 'Pending', dueDate: '2024-10-08', type: 'Outgoing' },
    { id: 'f4', description: 'Uçak Bileti', amount: -500, status: 'Pending', dueDate: '2024-10-08', type: 'Outgoing' },
    { id: 'f5', description: 'Hamburg Giderleri', amount: -400, status: 'Pending', dueDate: '2024-10-09', type: 'Outgoing' },
    { id: 'f6', description: 'Myoact Cihazı', amount: -350, status: 'Pending', dueDate: '2024-10-09', type: 'Outgoing' },
    { id: 'f7', description: 'ChatGpt Pro Aboneliği', amount: -250, status: 'Pending', dueDate: '2024-10-09', type: 'Outgoing' },
  ],
  challenges: [
    { id: 'c1', title: 'Zaman Kısıtlılığı', description: 'Hamburg ve İstanbul ziyaretleri sebebiyle yoğun program.', severity: 'High' },
    { id: 'c2', title: 'Ekipman İhtiyacı', description: 'Yeni iPad ve iPhone alınması gerekiyor.', severity: 'Medium' },
    { id: 'c3', title: 'Operasyonel Zamanlama', description: 'LR camın dış yüzüne milchglass kaplanması gibi usta başı işlerin zaman alması.', severity: 'Low' },
    { id: 'c4', title: 'Abonelik Yönetimi', description: 'Chatgpt Pro aboneliğinin yenilenmesi ve takibi.', severity: 'Low' },
  ],
  advantages: [
    { id: 'a1', title: 'Live on Action Deneyimi & Hızlı Büyüme', description: 'Dripfy NAD serumu MVP\'sinin Longevity Rooms\'ta başarılı PoC süreci ile hız kazanılması.' },
    { id: 'a2', title: 'Güçlü Takım ve İşbirliği', description: 'LR x Dripfy işbirliğindeki ekibin uyumu, özverili ve profesyonel yaklaşımı.' },
    { id: 'a3', title: 'Süregelen Networking Fırsatları', description: 'Mevcut networklerin hız kazanmaya yardımcı olması.' },
  ],
  contacts: (() => {
    const base: Contact[] = [
    { id: 'ct1', firstName: 'Ali', lastName: 'Tınazlı', role: 'Lifespin GTM Partner', type: 'Individual', email: 'ali.tinazli@lifespin.health', address: 'Mauerstraße 10', country: 'Germany', city: 'Berlin' },
    { id: 'ct2', firstName: 'Bülent', lastName: 'Ugurlu', role: 'Medical Board', type: 'Individual', email: 'b.ugurlu@medical.dripfy', address: 'Barbaros Blv. No:1', country: 'Turkey', city: 'Istanbul' },
    { id: 'ct3', firstName: 'Ali', lastName: 'Assar', role: 'Medical Board', type: 'Individual', email: 'a.assar@medical.dripfy', address: 'Zeil 111', country: 'Germany', city: 'Frankfurt' },
    { id: 'ct4', firstName: 'Mansoor', lastName: 'Mohammed', role: 'CEO, Precision Health Clinic', type: 'Individual', email: 'mansoor.m@thephclinic.com', address: '123 Bay Street', country: 'Canada', city: 'Toronto' },
    { id: 'ct5', firstName: 'Noah', lastName: 'Laith', role: 'RBT Referansı', type: 'Individual', email: 'noah.laith@rbt.com', address: 'Marienplatz 8', country: 'Germany', city: 'Munich' },
    { id: 'ct6', firstName: 'Timo', lastName: 'Kress', role: 'İlk Peptid Hastası', type: 'Individual', email: 't.kress@patient.info', address: 'Reeperbahn 75', country: 'Germany', city: 'Hamburg' },
    { id: 'ct7', firstName: 'Fatih', lastName: 'Toy', role: 'Nanolive Partner', type: 'Individual', email: 'fatih.toy@nanolive.ai', address: 'Atatürk Blv. 221', country: 'Turkey', city: 'Ankara' },
    { id: 'ct8', firstName: 'Federico', lastName: 'Rossi', role: 'Lifespan Dubai', type: 'Individual', email: 'dr.federico@lifespansportsmed.com', address: 'Sheikh Zayed Road', country: 'UAE', city: 'Dubai' },
    { id: 'ct9', firstName: 'Yadigar', lastName: 'Genç', role: 'Köln Kanser Aşısı Partner', type: 'Individual', email: 'y.genc@iozk.de', address: 'Hohe Str. 68', country: 'Germany', city: 'Cologne' },
    { id: 'ct10', firstName: 'Osman', lastName: 'Altinisik', role: 'Kliwla Family Office', type: 'Individual', email: 'osman.a@kliwla.com', address: 'Goethestraße 20', country: 'Germany', city: 'Frankfurt' },
    { id: 'ct11', firstName: 'Marian', lastName: 'Ionescu', role: 'Helfie.Al / NAD Tedavisi', type: 'Individual', email: 'marian@helfie.ai', address: '5th Avenue 789', country: 'USA', city: 'New York' },
    { id: 'ct12', firstName: 'Cenk', lastName: 'Yilmaz', role: 'Worknwerk Partner', type: 'Individual', email: 'cenk@worknwerk.com', address: 'Istiklal Cd. 110', country: 'Turkey', city: 'Istanbul' },
    { id: 'ct13', firstName: 'Patrick', lastName: 'Sewell', role: 'Medical Advisory Board', type: 'Individual', email: 'patrick.s@onlyhealth.co', address: 'Rodeo Drive 456', country: 'USA', city: 'Los Angeles' },
    { id: 'ct14', firstName: 'Adeel', lastName: 'Khan', role: 'Plazmaferez Görüşmesi', type: 'Individual', email: 'dr.adeel@triplhelix.com', address: 'University Ave 321', country: 'Canada', city: 'Toronto' },
    { id: 'ct15', firstName: 'Ahmet Emin', lastName: 'Sönmez', role: 'Exosome Protokolü', type: 'Individual', email: 'ahmet.sonmez@mederaclinic.com', address: 'Valikonağı Cd. 33', country: 'Turkey', city: 'Istanbul' },
    { id: 'ct16', firstName: 'Tunc', lastName: 'Hoca', role: 'Marstem / GMP Lab', type: 'Individual', email: 'tunc.hoca@marstem.com', address: 'Cinnah Cd. 55', country: 'Turkey', city: 'Ankara' },
    { id: 'ct17', firstName: 'Livion Clinic', lastName: '', role: 'İlk Toplu Satış Partneri', type: 'Company', email: 'contact@livion.de', address: 'Königsallee 100', country: 'Germany', city: 'Düsseldorf' },
    { id: 'ct18', firstName: 'Lifespin', lastName: '', role: 'GTM Partner', type: 'Company', email: 'info@lifespin.health', address: 'Unter den Linden 42', country: 'Germany', city: 'Berlin' },
    { id: 'ct19', firstName: 'Precision Health', lastName: 'Clinic', role: 'Genetik Test Partneri', type: 'Company', email: 'info@thephclinic.com', address: 'Yorkville Ave 99', country: 'Canada', city: 'Toronto' },
    { id: 'ct20', firstName: 'Nanolive', lastName: '', role: 'Hücre Görüntüleme Partneri', type: 'Company', email: 'contact@nanolive.ai', address: 'Cyberpark, Bilkent', country: 'Turkey', city: 'Ankara' },
    { id: 'ct21', firstName: 'Deeplongevtiy', lastName: '', role: 'Singapore Partner', type: 'Company', email: 'contact@deeplongevity.com', address: 'Broadway 101', country: 'USA', city: 'New York' },
    { id: 'ct22', firstName: 'Kliwla Family', lastName: 'Office', role: 'Dripfy Flagship Partner', type: 'Company', email: 'info@kliwla-office.com', address: 'Main Tower, Neue Mainzer Str. 52', country: 'Germany', city: 'Frankfurt' },
    { id: 'ct23', firstName: 'Worknwerk', lastName: '', role: 'Istanbul Partner', type: 'Company', email: 'info@worknwerk.com', address: 'Kolektif House, Maslak', country: 'Turkey', city: 'Istanbul' },
    { id: 'ct24', firstName: 'Onlyhealth.co', lastName: '', role: 'Türkiye Lansman Partneri', type: 'Company', email: 'contact@onlyhealth.co', address: 'Zorlu Center', country: 'Turkey', city: 'Istanbul' },
    { id: 'ct25', firstName: 'Hair Chefs', lastName: '', role: 'Saç Ekim Kliniği Partneri', type: 'Company', email: 'info@hairchiefs.com', address: 'Fulya, Şişli', country: 'Turkey', city: 'Istanbul' }
  ];

    const getSector = (contact: Contact): string => {
      const role = (contact.role || '').toLowerCase();
      if (role.includes('clinic') || role.includes('health') || role.includes('medical')) {
        return 'Longevity & Healthcare';
      }
      if (role.includes('partner') || role.includes('office')) {
        return 'Strategic Partnerships';
      }
      if (role.includes('ceo') || role.includes('board')) {
        return 'Executive Network';
      }
      return contact.type === 'Company' ? 'Wellness & Lifestyle' : 'Advisory & Innovation';
    };

    const getFrequency = (contact: Contact): TouchFrequency => {
      switch (contact.country) {
        case 'Turkey':
          return 'weekly';
        case 'Germany':
        case 'Switzerland':
          return 'biweekly';
        case 'Canada':
        case 'USA':
        case 'UAE':
          return 'monthly';
        default:
          return contact.type === 'Company' ? 'monthly' : 'quarterly';
      }
    };

    const computeRevenue = (contact: Contact, index: number): number => {
      const baseValue = contact.type === 'Company' ? 90000 : 26000;
      const geographyBonus = contact.country === 'Germany' ? 12000
        : contact.country === 'Turkey' ? 8000
        : contact.country === 'Canada' ? 6000
        : contact.country === 'UAE' ? 7000
        : 4000;
      const cadenceAdjustment = (index % 5) * (contact.type === 'Company' ? 5500 : 2500);
      const value = baseValue + geographyBonus - cadenceAdjustment;
      return Math.max(12000, Math.round(value / 100) * 100);
    };

    return base.map((contact, index) => {
      const role = (contact.role || '').toLowerCase();
      const segments = new Set<string>(contact.segmentIds ?? []);

      if (contact.type === 'Company') {
        segments.add('seg-strategic-partners');
      }
      if (role.includes('medical') || role.includes('clinic') || role.includes('board')) {
        segments.add('seg-medical-network');
      }
      if (['Germany', 'Switzerland', 'Austria'].includes(contact.country ?? '')) {
        segments.add('seg-dach-market');
      }
      if ((contact.country ?? '').toLowerCase() === 'turkey') {
        segments.add('seg-turkey-launch');
      }
      if (role.includes('gtm') || role.includes('flagship') || role.includes('partner')) {
        segments.add('seg-revenue-drivers');
      }
      if (['UAE', 'USA', 'Canada', 'Singapore'].includes(contact.country ?? '')) {
        segments.add('seg-growth-frontier');
      }
      if (contact.type === 'Individual' && (role.includes('ceo') || role.includes('innovation') || role.includes('advisory'))) {
        segments.add('seg-innovation-leaders');
      }

      const segmentIds = Array.from(segments);
      segmentIds.sort();

      const sector = getSector(contact);
      const revenueContribution = computeRevenue(contact, index);
      const touchFrequency = getFrequency(contact);

      return {
        ...contact,
        sector,
        revenueContribution,
        touchFrequency,
        segmentIds,
      };
    });
  })(),

  tasks: [
    {
      id: 't1',
      title: 'Livion Clinic Ziyareti & İlk Toplu Satış (50 adet NAD+)',
      priority: 'High',
      status: 'To Do',
      dueDate: '2024-10-07',
      assignee: 'Sales Team',
      templateId: 'tmpl-enterprise-onboarding',
      templateName: 'Kurumsal Onboarding Playbook',
      tags: ['enterprise', 'sales'],
      automationBadges: [
        { id: 'badge-intake-automation', label: 'Form Otomasyonu', color: '#2563eb' },
        { id: 'badge-churn-alert', label: 'Churn Uyarısı', color: '#ef4444' },
      ],
      sla: {
        id: 'sla-t1-response',
        name: 'Satış Yanıt SLA',
        durationHours: 24,
        status: 'warning',
        startedAt: '2024-10-06T09:00:00.000Z',
        dueAt: '2024-10-07T09:00:00.000Z',
        reminders: [
          { id: 'rem-t1-1', offsetMinutes: 60 * 12, channel: 'email', message: 'Livion görüşmesi için 12 saat kaldı.' },
          { id: 'rem-t1-2', offsetMinutes: 60 * 22, channel: 'push', message: 'Satış takibi kritikte.' },
        ],
        escalation: {
          notifyChannels: ['email'],
          reassignment: { assigneeName: 'Sales Director', note: 'SLA aşıldıysa yönetime aktar.' },
        },
      },
      dependencies: [
        { id: 'dep-t1-gtm', type: 'finish_to_start', targetTaskId: 't3', label: 'GTM sunumu tamamlanmalı', isBlocking: true },
      ],
      triggerIds: ['trigger-sla-breach-notify', 'trigger-dependency-unblocked'],
    },
    {
      id: 't2',
      title: 'Myoact Cihazı Onboarding',
      priority: 'High',
      status: 'To Do',
      dueDate: '2024-10-07',
      assignee: 'Tech Team',
      templateId: 'tmpl-clinic-launch',
      templateName: 'Klinik Açılış Görevleri',
      tags: ['operations', 'device'],
      automationBadges: [{ id: 'badge-supplier', label: 'Tedarikçi Otomasyonu', color: '#7c3aed' }],
      sla: {
        id: 'sla-t2-setup',
        name: 'Cihaz Kurulum SLA',
        durationHours: 36,
        status: 'onTrack',
        startedAt: '2024-10-06T10:00:00.000Z',
        dueAt: '2024-10-08T22:00:00.000Z',
        reminders: [{ id: 'rem-t2-1', offsetMinutes: 60 * 20, channel: 'email', message: 'Kurulum planı gözden geçir.' }],
      },
      dependencies: [
        { id: 'dep-t2-supplies', type: 'start_to_start', targetTaskId: 't18', label: 'Demo cihazı teslim edilmeli' },
      ],
      triggerIds: ['trigger-sla-breach-notify'],
    },
    {
      id: 't3',
      title: 'Lifespin GTM Sunumu & API Entegrasyonu Başlangıcı',
      priority: 'High',
      status: 'In Progress',
      dueDate: '2024-10-08',
      assignee: 'Ali Tınazlı',
      templateId: 'tmpl-enterprise-onboarding',
      templateName: 'Kurumsal Onboarding Playbook',
      automationBadges: [{ id: 'badge-integration-checklist', label: 'Checklist', color: '#10b981' }],
      sla: {
        id: 'sla-t3-gtm',
        name: 'GTM Kick-off',
        durationHours: 48,
        status: 'onTrack',
        startedAt: '2024-10-06T07:30:00.000Z',
        dueAt: '2024-10-08T07:30:00.000Z',
        reminders: [{ id: 'rem-t3-1', offsetMinutes: 60 * 30, channel: 'slack', message: 'GTM sunumu taslağını paylaş.' }],
      },
      dependencies: [
        { id: 'dep-t3-approval', type: 'finish_to_finish', targetTaskId: 't5', label: 'Sözleşme taslağı hizalanmalı' },
      ],
      triggerIds: ['trigger-status-followup'],
    },
    {
      id: 't4',
      title: 'Heilpraktiker ile Sözleşme ve Dripfy Akademi Görevlendirmesi',
      priority: 'Medium',
      status: 'To Do',
      dueDate: '2024-10-08',
      assignee: 'HR',
      templateId: 'tmpl-sales-renewal',
      templateName: 'Yenileme Risk Yönetimi',
      automationBadges: [{ id: 'badge-discovery-brief', label: 'Brief Şablonu', color: '#f97316' }],
      sla: {
        id: 'sla-t4-contract',
        name: 'Sözleşme Tamamlama',
        durationHours: 72,
        status: 'onTrack',
        startedAt: '2024-10-05T14:00:00.000Z',
        dueAt: '2024-10-08T14:00:00.000Z',
        reminders: [{ id: 'rem-t4-1', offsetMinutes: 60 * 48, channel: 'email', message: 'Sözleşme gözden geçirilmelidir.' }],
        escalation: { notifyChannels: ['email'] },
      },
      triggerIds: ['trigger-status-followup'],
    },
    {
      id: 't5',
      title: 'Partner/Representative Vertrag Taslak Değişimi',
      priority: 'Medium',
      status: 'In Progress',
      dueDate: '2024-10-09',
      assignee: 'Legal',
      templateId: 'tmpl-enterprise-onboarding',
      templateName: 'Kurumsal Onboarding Playbook',
      automationBadges: [{ id: 'badge-handoff-automation', label: 'Handoff Otomasyonu', color: '#facc15' }],
      dependencies: [
        { id: 'dep-t5-supply', type: 'finish_to_start', targetTaskId: 't6', label: 'Medical board taslakları bekleniyor' },
      ],
      sla: {
        id: 'sla-t5-contract',
        name: 'Hukuki Revizyon',
        durationHours: 60,
        status: 'warning',
        startedAt: '2024-10-05T09:30:00.000Z',
        dueAt: '2024-10-07T21:30:00.000Z',
        breachedAt: '2024-10-07T22:10:00.000Z',
        reminders: [{ id: 'rem-t5-1', offsetMinutes: 60 * 50, channel: 'email' }],
        escalation: {
          notifyChannels: ['email', 'slack'],
          reassignment: { assigneeName: 'Legal Director', note: 'Hukuk SLA ihlali' },
        },
      },
      triggerIds: ['trigger-sla-breach-notify'],
    },
    {
      id: 't6',
      title: 'Medical Board Yapı ve Sözleşme Taslakları Hazırlığı',
      priority: 'High',
      status: 'To Do',
      dueDate: '2024-10-09',
      assignee: 'Management',
      templateId: 'tmpl-clinic-launch',
      templateName: 'Klinik Açılış Görevleri',
      automationBadges: [{ id: 'badge-supplier', label: 'Tedarikçi Otomasyonu', color: '#7c3aed' }],
      dependencies: [
        { id: 'dep-t6-board', type: 'start_to_start', targetTaskId: 't27', label: 'Komplikasyon planı ile senkronize' },
      ],
      sla: {
        id: 'sla-t6-board',
        name: 'Board Taslakları',
        durationHours: 48,
        status: 'onTrack',
        startedAt: '2024-10-06T08:00:00.000Z',
        dueAt: '2024-10-08T08:00:00.000Z',
        reminders: [{ id: 'rem-t6-1', offsetMinutes: 60 * 30, channel: 'email' }],
      },
      triggerIds: ['trigger-dependency-unblocked'],
    },
    { id: 't7', title: 'Precision Health Clinic ile Genetik Test Mutabakatı', priority: 'High', status: 'To Do', dueDate: '2024-10-10', assignee: 'Dr. Mansoor Mohammed' },
    { id: 't8', title: 'P4-Medizin Leitkonzept Hazırlanması ve ISO9001 Denetimi', priority: 'Medium', status: 'To Do', dueDate: '2024-10-10', assignee: 'QM Team' },
    { id: 't9', title: 'İsviçre PTS ile GMP Expert Belgesi Sonrası Planlama', priority: 'Medium', status: 'To Do', dueDate: '2024-10-11', assignee: 'Operations' },
    { id: 't10', title: 'Nelly ile Anamnese ve Dijital Onam Kararı', priority: 'Low', status: 'To Do', dueDate: '2024-10-11', assignee: 'Legal' },
    { id: 't11', title: 'RBT Referansı (Noah Laith) ile Networking', priority: 'Medium', status: 'To Do', dueDate: '2024-10-07', assignee: 'Marketing' },
    { id: 't12', title: 'Margo Bakü ile Longevity Clinic Dripfy Corner Görüşmesi', priority: 'Medium', status: 'To Do', dueDate: '2024-10-08', assignee: 'Sales Team' },
    { id: 't13', title: 'German Medical ile Press Release Toplantısı', priority: 'High', status: 'In Progress', dueDate: '2024-10-08', assignee: 'Marcus' },
    { id: 't14', title: 'David Lyodds Club ile Wellness Entegrasyon Görüşmesi', priority: 'Medium', status: 'To Do', dueDate: '2024-10-09', assignee: 'Gabriel' },
    { id: 't15', title: 'EGYM - Wellpass ile Remote Health Wellness Entegrasyonu', priority: 'Medium', status: 'To Do', dueDate: '2024-10-10', assignee: 'Okan' },
    { id: 't16', title: 'Edgaras (RBT CEO) ile Kombine Peptid Estetik Görüşmesi', priority: 'High', status: 'To Do', dueDate: '2024-10-11', assignee: 'Management' },
    { id: 't17', title: 'Stanford Healthcare Innovation Labs Sertifika Başvurusu', priority: 'High', status: 'Done', dueDate: '2024-10-04', assignee: 'Admin' },
    { id: 't18', title: 'Nanolive & Mitkondri AI ile Canlı Hücre Görüntüleme Demosu', priority: 'High', status: 'To Do', dueDate: '2024-10-09', assignee: 'Prof. Fatih Toy' },
    { id: 't19', title: 'Lifespan Dubai ile Holo-Tomography Product Demo', priority: 'Medium', status: 'To Do', dueDate: '2024-10-10', assignee: 'Dr. Federico' },
    { id: 't20', title: 'Deeplongevtiy API Faturası Ödemesi ve DeepMind Rapor Talebi', priority: 'High', status: 'In Progress', dueDate: '2024-10-07', assignee: 'Finance' },
    { id: 't21', title: 'Köln Dr Yadigar Genç ile Medical Board Görüşmesi', priority: 'Medium', status: 'To Do', dueDate: '2024-10-11', assignee: 'Management' },
    { id: 't22', title: 'Kliwla Family Office ile Dripfy Flagship Açılışı Görüşmesi', priority: 'High', status: 'To Do', dueDate: '2024-10-10', assignee: 'Osman Altinisik' },
    { id: 't23', title: 'MitoVit ile VOmax Cihazı Demosu', priority: 'Low', status: 'To Do', dueDate: '2024-10-09', assignee: 'Tech Team' },
    { id: 't24', title: 'Metagon\'a Instagram & Story Post Metinleri Teslimi', priority: 'Medium', status: 'Done', dueDate: '2024-10-05', assignee: 'Marketing' },
    { id: 't25', title: 'Implfy\'dan RFID Roll Container Kilit Sistemi Yenilenmesi', priority: 'Low', status: 'To Do', dueDate: '2024-10-11', assignee: 'Operations' },
    { id: 't26', title: 'Brosch Digital ile Hasta Paneli Backend Sunumu', priority: 'Medium', status: 'To Do', dueDate: '2024-10-08', assignee: 'Tech Team' },
    { id: 't27', title: 'Komplikasyon Yönetim Grubu Kurulması', priority: 'Medium', status: 'To Do', dueDate: '2024-10-07', assignee: 'Management' },
    { id: 't28', title: 'LR için Kredi Kartı Entegrasyonu', priority: 'High', status: 'In Progress', dueDate: '2024-10-09', assignee: 'Finance' },
    { id: 't29', title: 'Offenbach Futbolcusunun Myoact Analizi PT', priority: 'Low', status: 'To Do', dueDate: '2024-10-10', assignee: 'PT' },
    { id: 't30', title: 'Sportive Peptid Protokolü Yazılması Eğitimi', priority: 'Medium', status: 'To Do', dueDate: '2024-10-11', assignee: 'Dr. Elif' },
    { id: 't31', title: 'Zadarma Yüklenmesi ve Dripfy Concierge Desk Başlangıcı', priority: 'High', status: 'In Progress', dueDate: '2024-10-07', assignee: 'Tech Team' },
    { id: 't32', title: 'Superchat ile Demo Toplantısı ve Entegrasyon', priority: 'Medium', status: 'To Do', dueDate: '2024-10-08', assignee: 'Sales Team' },
    { id: 't33', title: 'Dr.Frost ve Mitolight Ziyareti/Demo Satın Alma Kararı', priority: 'Medium', status: 'To Do', dueDate: '2024-10-09', assignee: 'Sales Team' },
    { id: 't34', title: 'Frankfurt Healthexpo Katılımcı Listesi Talebi', priority: 'Low', status: 'To Do', dueDate: '2024-10-10', assignee: 'Marketing' },
    { id: 't35', title: 'LR HygieneKonzept için Sözleşme', priority: 'Medium', status: 'To Do', dueDate: '2024-10-11', assignee: 'Legal' },
    { id: 't36', title: 'Helfie.Al Entegrasyonu için Metagon Ceo ile İstişare', priority: 'High', status: 'To Do', dueDate: '2024-10-08', assignee: 'Marian' },
    { id: 't37', title: 'Worknwerk (Cenk) ile Peptid Pack Toplantısı (Istanbul)', priority: 'High', status: 'To Do', dueDate: '2024-10-14', assignee: 'Cenk' },
    { id: 't38', title: 'Onlyhealth.co (MUSE Stemcell) Türkiye Lansmanına Katılım (Istanbul)', priority: 'High', status: 'To Do', dueDate: '2024-10-15', assignee: 'Dr. Patrick Sewell' },
    { id: 't39', title: 'Dr. Adeel Khan ile EBO2 Cihazı Görüşmesi (Istanbul)', priority: 'Medium', status: 'To Do', dueDate: '2024-10-15', assignee: 'Dr. Adeel Khan' },
    { id: 't40', title: 'Hair Chefs CEO\'su ile Dripf Hair Peptid Pack Toplantısı (Istanbul)', priority: 'Medium', status: 'To Do', dueDate: '2024-10-16', assignee: 'Hair Chefs CEO' },
    { id: 't41', title: 'Yar.Doc. Ahmet Emin Sönmez ile Exosome Protokolü Gözden Geçirme (Istanbul)', priority: 'High', status: 'To Do', dueDate: '2024-10-16', assignee: 'Ahmet Emin Sönmez' },
    { id: 't42', title: 'Marstem (Prof. Tunc Hoca) ile Exosome Üretimi Görüşmesi (Istanbul)', priority: 'High', status: 'To Do', dueDate: '2024-10-17', assignee: 'Prof. Tunc Hoca' },
  ],
  taskTemplates: taskTemplateDefinitions,
  taskAutomationTriggers: taskAutomationTriggers,
  taskSLAReports: taskSLAReports,
  capacitySnapshots: [
    {
      id: 'cap-1',
      unitId: 'clinic-frankfurt',
      unitLabel: 'Frankfurt Longevity Clinic',
      capturedAt: '2024-10-06T08:00:00.000Z',
      totalCapacity: 120,
      allocated: 110,
      available: 10,
      backlog: 18,
      utilisation: 0.92,
      forecastedDemand: 138,
      status: 'warning',
      notes: 'Yeni açılan randevular talebi karşılamakta zorlanıyor.',
    },
    {
      id: 'cap-2',
      unitId: 'clinic-istanbul',
      unitLabel: 'İstanbul Flagship',
      capturedAt: '2024-10-06T08:00:00.000Z',
      totalCapacity: 160,
      allocated: 154,
      available: 6,
      backlog: 22,
      utilisation: 0.96,
      forecastedDemand: 170,
      status: 'critical',
      notes: 'Operasyon ekibi hafta sonu destek istiyor.',
    },
    {
      id: 'cap-3',
      unitId: 'mobile-popups',
      unitLabel: 'Mobil Longevity Pop-up',
      capturedAt: '2024-10-06T08:00:00.000Z',
      totalCapacity: 60,
      allocated: 42,
      available: 18,
      backlog: 8,
      utilisation: 0.7,
      forecastedDemand: 55,
      status: 'stable',
      notes: 'Frankfurt etkinliği sonrası geçici talep düşüşü.',
    },
  ],
  customerProfiles: [
    {
      id: 'cust-precision-health',
      name: 'Precision Health Clinic',
      lifecycleStage: 'active',
      ownerId: 'u1',
      ownerName: 'Demo User',
      monthlyRecurringRevenue: 18500,
      healthScore: 0.58,
      churnRiskScore: 0.72,
      lifetimeValue: 210000,
      lastInteractionAt: '2024-10-05T12:30:00.000Z',
      nextRenewalDate: '2024-12-01',
      segmentIds: ['seg-strategic-growth'],
      tags: ['priority', 'medical'],
      attributes: {
        country: 'Canada',
        productBundle: 'Precision Longevity',
      },
    },
    {
      id: 'cust-livion',
      name: 'Livion Clinic',
      lifecycleStage: 'onboarding',
      ownerId: 'u2',
      ownerName: 'Admin User',
      monthlyRecurringRevenue: 14200,
      healthScore: 0.64,
      churnRiskScore: 0.48,
      lifetimeValue: 168000,
      lastInteractionAt: '2024-10-04T09:15:00.000Z',
      nextRenewalDate: '2025-01-15',
      segmentIds: ['seg-longevity-pioneers'],
      tags: ['expansion', 'emea'],
      attributes: {
        country: 'Germany',
        onboardingStatus: 'logistics',
      },
    },
    {
      id: 'cust-deeplongevity',
      name: 'Deeplongevity',
      lifecycleStage: 'atRisk',
      ownerId: 'u3',
      ownerName: 'Finance Owner',
      monthlyRecurringRevenue: 9800,
      healthScore: 0.42,
      churnRiskScore: 0.81,
      lifetimeValue: 124000,
      lastInteractionAt: '2024-09-28T16:45:00.000Z',
      nextRenewalDate: '2024-11-30',
      segmentIds: ['seg-growth-frontier'],
      tags: ['premium', 'apac'],
      attributes: {
        country: 'Singapore',
        supportTier: 'gold',
      },
    },
  ],
  users: [
      { id: 'u1', name: 'Demo User', email: 'demo@dripfy.com', role: 'user', lastLogin: '2024-07-26 10:00', operationalRole: 'operations', department: 'Operations' },
      { id: 'u2', name: 'Admin User', email: 'admin@dripfy.de', role: 'admin', lastLogin: '2024-07-26 11:30', operationalRole: 'admin', department: 'Expansion' },
      { id: 'u3', name: 'Finance Owner', email: 'finance@dripfy.com', role: 'user', lastLogin: '2024-07-26 11:35', operationalRole: 'finance', department: 'Revenue' },
  ],
  okrs: [
    {
      id: 'okr-1',
      objective: 'Launch Frankfurt Longevity Center',
      ownerRole: 'operations',
      department: 'Expansion',
      startDate: '2024-09-01',
      targetDate: '2024-12-31',
      progress: 0.35,
      status: 'active',
      tags: ['launch', 'frankfurt'],
      keyResults: [
        { id: 'kr-1', title: 'Secure flagship location lease', metricUnit: 'contracts', baseline: 0, target: 1, current: 1, status: 'completed' },
        { id: 'kr-2', title: 'Hire core clinical team', metricUnit: 'hires', baseline: 0, target: 5, current: 2, status: 'onTrack' },
        { id: 'kr-3', title: 'Complete regulatory checklist', metricUnit: 'percent', baseline: 0, target: 100, current: 45, status: 'atRisk' },
      ],
      metrics: { baseline: 0, target: 100, current: 35, unit: 'percent' },
      lastUpdatedAt: '2024-10-01T09:00:00.000Z',
      lastUpdatedBy: 'admin@dripfy.de',
      requiresValidation: true,
      validatedAt: null,
      validatedBy: null,
    },
    {
      id: 'okr-2',
      objective: 'Improve partner revenue retention',
      ownerRole: 'finance',
      department: 'Revenue',
      startDate: '2024-07-01',
      targetDate: '2024-12-01',
      progress: 0.6,
      status: 'active',
      tags: ['revenue', 'partner'],
      keyResults: [
        { id: 'kr-4', title: 'Reduce outstanding invoices', metricUnit: 'percent', baseline: 35, target: 10, current: 22, status: 'onTrack' },
        { id: 'kr-5', title: 'Increase recurring revenue', metricUnit: 'eur', baseline: 120000, target: 180000, current: 150000, status: 'onTrack' },
      ],
      metrics: { baseline: 120000, target: 180000, current: 150000, unit: 'eur' },
      lastUpdatedAt: '2024-09-28T12:15:00.000Z',
      lastUpdatedBy: 'finance@dripfy.com',
      requiresValidation: false,
      validatedAt: null,
      validatedBy: null,
    },
  ],
  auditLog: [
    {
      id: 'l1',
      user: 'Admin User',
      action: 'Updated',
      targetType: 'Task',
      targetId: 't17',
      timestamp: '2024-07-26 11:32',
      details: 'Status changed to Done',
      label: 'tasks-status',
      sourceModule: 'tasks',
      criticality: 'medium',
    },
    {
      id: 'l2',
      user: 'Admin User',
      action: 'Created',
      targetType: 'Contact',
      targetId: 'ct25',
      timestamp: '2024-07-26 11:35',
      details: 'Added new company: Hair Chefs',
      label: 'contacts-new',
      sourceModule: 'crm',
      criticality: 'low',
    },
    {
      id: 'l3',
      user: 'Admin User',
      action: 'Updated',
      targetType: 'OKR',
      targetId: 'okr-1',
      timestamp: '2024-10-01T09:05:00.000Z',
      details: 'Progress updated to 35%',
      label: 'okr-progress',
      sourceModule: 'okr',
      criticality: 'high',
    },
  ],
  userPermissions: [
      {
          userId: 'u1',
          userName: 'Demo User',
          permissions: {
              schedule: { view: true, edit: true },
              financials: { view: true, edit: true },
              challenges: { view: true, edit: true },
              advantages: { view: true, edit: true },
              contacts: { view: true, edit: true },
              tasks: { view: true, edit: true },
          }
      }
  ],
  signupRequests: [
      {
        id: 'sr1',
        name: 'Laura Schmidt',
        email: 'laura.s@example.com',
        phone: '+49 123456789',
        position: 'Team Lead',
        status: 'pending',
        timestamp: '2024-07-27T09:15:00.000Z',
        country: 'Germany',
        countryCode: '+49',
        attribution: {
          source: 'referral',
          campaign: 'oktoberfest-partners',
          country: 'Germany',
          medium: 'partner',
          landingPage: '/signup?utm_source=referral&utm_campaign=oktoberfest-partners',
          referrer: 'https://partner.hasiripi.com',
        },
        tags: ['source:referral', 'campaign:oktoberfest-partners', 'country:Germany'],
      }
  ],
  signupFunnel: {
    stages: [
      { id: 'visit', label: 'Landing Page Ziyaretleri', order: 0 },
      { id: 'start', label: 'Form Başlangıcı', order: 1 },
      { id: 'code-sent', label: 'Kod Gönderildi', order: 2 },
      { id: 'verified', label: 'Kod Doğrulandı', order: 3 },
      { id: 'qualified', label: 'Nitelikli Lead', order: 4 },
      { id: 'approved', label: 'Onaylandı', order: 5 },
    ],
    events: [
      { id: 'e1', leadId: 'lead-1', stageId: 'visit', occurredAt: '2024-09-01T09:00:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e2', leadId: 'lead-1', stageId: 'start', occurredAt: '2024-09-01T09:02:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e3', leadId: 'lead-1', stageId: 'code-sent', occurredAt: '2024-09-01T09:02:30.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e4', leadId: 'lead-1', stageId: 'verified', occurredAt: '2024-09-01T09:05:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e5', leadId: 'lead-1', stageId: 'qualified', occurredAt: '2024-09-01T09:07:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e6', leadId: 'lead-1', stageId: 'approved', occurredAt: '2024-09-02T10:00:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },

      { id: 'e7', leadId: 'lead-2', stageId: 'visit', occurredAt: '2024-09-03T10:00:00.000Z', source: 'organic', campaign: 'seo-longform', country: 'Germany' },
      { id: 'e8', leadId: 'lead-2', stageId: 'start', occurredAt: '2024-09-03T10:04:00.000Z', source: 'organic', campaign: 'seo-longform', country: 'Germany' },
      { id: 'e9', leadId: 'lead-2', stageId: 'code-sent', occurredAt: '2024-09-03T10:05:00.000Z', source: 'organic', campaign: 'seo-longform', country: 'Germany' },
      { id: 'e10', leadId: 'lead-2', stageId: 'verified', occurredAt: '2024-09-03T10:08:00.000Z', source: 'organic', campaign: 'seo-longform', country: 'Germany' },

      { id: 'e11', leadId: 'lead-3', stageId: 'visit', occurredAt: '2024-09-05T14:30:00.000Z', source: 'referral', campaign: 'oktoberfest-partners', country: 'Germany' },
      { id: 'e12', leadId: 'lead-3', stageId: 'start', occurredAt: '2024-09-05T14:32:00.000Z', source: 'referral', campaign: 'oktoberfest-partners', country: 'Germany' },
      { id: 'e13', leadId: 'lead-3', stageId: 'code-sent', occurredAt: '2024-09-05T14:32:45.000Z', source: 'referral', campaign: 'oktoberfest-partners', country: 'Germany' },

      { id: 'e14', leadId: 'lead-4', stageId: 'visit', occurredAt: '2024-09-07T08:12:00.000Z', source: 'event', campaign: 'longevity-frankfurt', country: 'Germany' },
      { id: 'e15', leadId: 'lead-4', stageId: 'start', occurredAt: '2024-09-07T08:13:10.000Z', source: 'event', campaign: 'longevity-frankfurt', country: 'Germany' },
      { id: 'e16', leadId: 'lead-4', stageId: 'code-sent', occurredAt: '2024-09-07T08:13:55.000Z', source: 'event', campaign: 'longevity-frankfurt', country: 'Germany' },
      { id: 'e17', leadId: 'lead-4', stageId: 'verified', occurredAt: '2024-09-07T08:15:20.000Z', source: 'event', campaign: 'longevity-frankfurt', country: 'Germany' },
      { id: 'e18', leadId: 'lead-4', stageId: 'qualified', occurredAt: '2024-09-07T08:18:00.000Z', source: 'event', campaign: 'longevity-frankfurt', country: 'Germany' },

      { id: 'e19', leadId: 'lead-5', stageId: 'visit', occurredAt: '2024-09-10T11:45:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e20', leadId: 'lead-5', stageId: 'start', occurredAt: '2024-09-10T11:46:00.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
      { id: 'e21', leadId: 'lead-5', stageId: 'code-sent', occurredAt: '2024-09-10T11:46:40.000Z', source: 'paid', campaign: 'launch-dubai', country: 'United Arab Emirates' },
    ],
  },
  abTests: [
    {
      id: 'ab1',
      name: 'Signup CTA Metni',
      goal: 'Kod doğrulama oranını artır',
      status: 'running',
      startDate: '2024-09-01',
      variants: [
        { id: 'control', label: 'Kontrol', participants: 320, conversions: 92, revenue: 0 },
        { id: 'variant-a', label: '"Hemen erişim sağlayın" CTA', participants: 305, conversions: 118, revenue: 0 },
      ],
    },
    {
      id: 'ab2',
      name: 'Funnel Form Adımları',
      goal: 'Form tamamlama oranını yükselt',
      status: 'completed',
      startDate: '2024-07-15',
      endDate: '2024-08-15',
      variants: [
        { id: 'multi-step', label: 'Çok Adımlı Form', participants: 540, conversions: 210 },
        { id: 'single-step', label: 'Tek Sayfa Form', participants: 525, conversions: 256 },
      ],
    },
  ],
  campaignPerformance: [
    {
      id: 'cmp-1',
      name: 'Dubai Launch Ads',
      source: 'paid',
      country: 'United Arab Emirates',
      period: { start: '2024-08-25', end: '2024-09-24' },
      metrics: { leads: 420, conversions: 132, spend: 8400, revenue: 22800 },
    },
    {
      id: 'cmp-2',
      name: 'Oktoberfest Partner Referral',
      source: 'referral',
      country: 'Germany',
      period: { start: '2024-09-01', end: '2024-09-24' },
      metrics: { leads: 160, conversions: 74, spend: 2100, revenue: 16400 },
    },
    {
      id: 'cmp-3',
      name: 'Longevity Frankfurt Event',
      source: 'event',
      country: 'Germany',
      period: { start: '2024-09-05', end: '2024-09-25' },
      metrics: { leads: 96, conversions: 41, spend: 4800, revenue: 19600 },
    },
  ],
  campaignInsights: [
    {
      id: 'insight-1',
      title: 'Partner referansları en yüksek dönüşümü sağladı',
      detail: 'Oktoberfest partner kampanyası %46 dönüşüm ile paid kanalların %31 oranını geçti.',
      severity: 'success',
    },
    {
      id: 'insight-2',
      title: 'Dubai reklamlarında maliyet optimizasyonu fırsatı',
      detail: 'CPC %18 artarken dönüşüm oranı sabit kaldı. Yeni kreatiflerle yeniden test önerilir.',
      severity: 'warning',
    },
  ],
  segmentDefinitions: [
    {
      id: 'seg-strategic-partners',
      name: 'Stratejik Partnerler',
      description: 'Kurumsal iş ortakları ve gelir odaklı ilişkiler.',
      color: '#0f766e',
      tags: ['partner', 'enterprise'],
      rules: [
        {
          id: 'seg-strategic-partners-core',
          matcher: 'all',
          conditions: [
            { field: 'type', operator: 'equals', value: 'Company' },
            { field: 'revenueContribution', operator: 'gte', value: 60000 },
            { field: 'touchFrequency', operator: 'in', value: ['weekly', 'biweekly', 'monthly'] },
          ],
        },
      ],
    },
    {
      id: 'seg-medical-network',
      name: 'Medikal Ağ',
      description: 'Tıbbi danışmanlar, klinikler ve sağlık inovasyonu paydaşları.',
      color: '#1d4ed8',
      tags: ['medical', 'clinic'],
      rules: [
        {
          id: 'seg-medical-network-expertise',
          matcher: 'any',
          conditions: [
            { field: 'role', operator: 'contains', value: 'medical' },
            { field: 'role', operator: 'contains', value: 'clinic' },
            { field: 'sector', operator: 'contains', value: 'Healthcare' },
          ],
        },
      ],
    },
    {
      id: 'seg-dach-market',
      name: 'DACH Pazarı',
      description: 'Almanya, Avusturya ve İsviçre bölgesindeki ilişkiler.',
      color: '#fb923c',
      tags: ['geo', 'dach'],
      rules: [
        {
          id: 'seg-dach-market-geo',
          matcher: 'all',
          conditions: [
            { field: 'country', operator: 'in', value: ['Germany', 'Switzerland', 'Austria'] },
          ],
        },
      ],
    },
    {
      id: 'seg-turkey-launch',
      name: 'Türkiye Lansmanı',
      description: 'İstanbul ve Türkiye merkezli büyüme ilişkileri.',
      color: '#be123c',
      tags: ['geo', 'launch'],
      rules: [
        {
          id: 'seg-turkey-launch-core',
          matcher: 'all',
          conditions: [
            { field: 'country', operator: 'equals', value: 'Turkey' },
          ],
        },
      ],
    },
    {
      id: 'seg-growth-frontier',
      name: 'Yeni Pazar Öncüleri',
      description: 'Kuzey Amerika ve Körfez açılımları için yüksek potansiyelli ilişkiler.',
      color: '#7c3aed',
      tags: ['expansion'],
      rules: [
        {
          id: 'seg-growth-frontier-geo',
          matcher: 'any',
          conditions: [
            { field: 'country', operator: 'in', value: ['USA', 'Canada', 'UAE', 'Singapore'] },
          ],
        },
      ],
    },
    {
      id: 'seg-revenue-drivers',
      name: 'Gelir Hızlandırıcılar',
      description: 'GTM, flagship ve yüksek gelir katkılı temaslar.',
      color: '#16a34a',
      tags: ['revenue'],
      rules: [
        {
          id: 'seg-revenue-drivers-core',
          matcher: 'all',
          conditions: [
            { field: 'revenueContribution', operator: 'gte', value: 50000 },
            { field: 'role', operator: 'contains', value: 'partner' },
          ],
        },
      ],
    },
    {
      id: 'seg-innovation-leaders',
      name: 'İnovasyon Liderleri',
      description: 'Yönetici düzeyindeki vizyonerler ve ürün inovasyonu destekçileri.',
      color: '#0ea5e9',
      tags: ['innovation'],
      rules: [
        {
          id: 'seg-innovation-leaders-core',
          matcher: 'any',
          conditions: [
            { field: 'role', operator: 'contains', value: 'CEO' },
            { field: 'role', operator: 'contains', value: 'innovation' },
            { field: 'role', operator: 'contains', value: 'board' },
          ],
        },
      ],
    },
  ],
  segmentPerformance: [
    {
      segmentId: 'seg-strategic-partners',
      segmentName: 'Stratejik Partnerler',
      memberCount: 9,
      revenueContribution: 540000,
      revenueGrowth: 18,
      engagementScore: 86,
      expansionPotential: 32,
    },
    {
      segmentId: 'seg-medical-network',
      segmentName: 'Medikal Ağ',
      memberCount: 11,
      revenueContribution: 210000,
      revenueGrowth: 12,
      engagementScore: 91,
      expansionPotential: 24,
    },
    {
      segmentId: 'seg-dach-market',
      segmentName: 'DACH Pazarı',
      memberCount: 10,
      revenueContribution: 320000,
      revenueGrowth: 15,
      engagementScore: 78,
      expansionPotential: 28,
    },
    {
      segmentId: 'seg-turkey-launch',
      segmentName: 'Türkiye Lansmanı',
      memberCount: 13,
      revenueContribution: 260000,
      revenueGrowth: 22,
      engagementScore: 83,
      expansionPotential: 35,
    },
    {
      segmentId: 'seg-growth-frontier',
      segmentName: 'Yeni Pazar Öncüleri',
      memberCount: 8,
      revenueContribution: 190000,
      revenueGrowth: 27,
      engagementScore: 74,
      expansionPotential: 41,
    },
    {
      segmentId: 'seg-innovation-leaders',
      segmentName: 'İnovasyon Liderleri',
      memberCount: 7,
      revenueContribution: 150000,
      revenueGrowth: 10,
      engagementScore: 88,
      expansionPotential: 18,
    },
  ],
  segmentDrillDowns: [
    {
      id: 'drill-sp-1',
      segmentId: 'seg-strategic-partners',
      title: 'Pipeline Değeri',
      metric: 'pipelineValue',
      value: 620000,
      delta: 14,
      period: 'Son 90 gün',
      narrative: 'Livion Clinic ve Kliwla Family Office anlaşmaları pipeline üzerinde.',
    },
    {
      id: 'drill-sp-2',
      segmentId: 'seg-strategic-partners',
      title: 'Yenileme Oranı',
      metric: 'retention',
      value: 94,
      delta: 6,
      period: 'Son 30 gün',
      narrative: 'Kurumsal partnerlerde yenileme oranı hedefin üzerinde seyretti.',
    },
    {
      id: 'drill-med-1',
      segmentId: 'seg-medical-network',
      title: 'Randevu Sayısı',
      metric: 'touches',
      value: 37,
      delta: 9,
      period: 'Aylık',
      narrative: 'Medical board üyeleri ile ortalama 3.4 temas gerçekleştirildi.',
    },
    {
      id: 'drill-turkey-1',
      segmentId: 'seg-turkey-launch',
      title: 'Lead Akışı',
      metric: 'leads',
      value: 128,
      delta: 18,
      period: 'Son 6 hafta',
      narrative: 'İstanbul merkezli kampanyalar yeni klinik partner taleplerini artırdı.',
    },
    {
      id: 'drill-frontier-1',
      segmentId: 'seg-growth-frontier',
      title: 'Pipeline Hacmi',
      metric: 'pipelineValue',
      value: 210000,
      delta: 21,
      period: 'Son 45 gün',
      narrative: 'Dubai ve Toronto görüşmeleri ölçeklenebilir gelir fırsatları yaratıyor.',
    },
    {
      id: 'drill-innovation-1',
      segmentId: 'seg-innovation-leaders',
      title: 'Mentorluk Saatleri',
      metric: 'advisoryHours',
      value: 64,
      delta: 11,
      period: 'Çeyreklik',
      narrative: 'İnovasyon liderleri ürün yol haritasına aktif katkı veriyor.',
    },
  ],
  relationshipTimeline: [
    {
      id: 'rel-1',
      contactId: 'ct17',
      segmentIds: ['seg-strategic-partners', 'seg-dach-market'],
      occurredAt: '2024-10-03T09:30:00.000Z',
      channel: 'meeting',
      summary: 'Livion Clinic ile flagship açılışı planlama toplantısı gerçekleştirildi.',
      sentiment: 'positive',
      followUp: 'Hukuk ekibiyle sözleşme revizyonu paylaşıldı.',
      owner: 'Operations',
    },
    {
      id: 'rel-2',
      contactId: 'ct22',
      segmentIds: ['seg-strategic-partners', 'seg-revenue-drivers', 'seg-dach-market'],
      occurredAt: '2024-10-01T15:00:00.000Z',
      channel: 'call',
      summary: 'Kliwla Family Office ile gelir paylaşımı modeli gözden geçirildi.',
      sentiment: 'positive',
      followUp: 'Finans ekibi KPI kartlarını güncelliyor.',
      owner: 'Finance',
    },
    {
      id: 'rel-3',
      contactId: 'ct7',
      segmentIds: ['seg-medical-network', 'seg-turkey-launch'],
      occurredAt: '2024-09-29T08:00:00.000Z',
      channel: 'meeting',
      summary: 'Nanolive entegrasyonu için teknik değerlendirme oturumu yapıldı.',
      sentiment: 'neutral',
      followUp: 'Ekim ayı demo planı gönderildi.',
      owner: 'Product',
    },
    {
      id: 'rel-4',
      contactId: 'ct8',
      segmentIds: ['seg-growth-frontier'],
      occurredAt: '2024-09-27T17:30:00.000Z',
      channel: 'event',
      summary: 'Dubai Longevity Circle etkinliğinde Lifespan Dubai ile tanıtım sunumu yapıldı.',
      sentiment: 'positive',
      followUp: 'Özel paket teklifinin e-posta ile paylaşılması planlandı.',
      owner: 'Expansion',
    },
    {
      id: 'rel-5',
      contactId: 'ct14',
      segmentIds: ['seg-medical-network', 'seg-growth-frontier'],
      occurredAt: '2024-10-04T12:15:00.000Z',
      channel: 'call',
      summary: 'Dr. Adeel Khan ile kombine protokol validasyonu görüşmesi.',
      sentiment: 'positive',
      followUp: 'Klinik pilot protokolü 10 Ekim\'de başlatılacak.',
      owner: 'Medical',
    },
    {
      id: 'rel-6',
      contactId: 'ct23',
      segmentIds: ['seg-turkey-launch', 'seg-revenue-drivers'],
      occurredAt: '2024-09-30T13:45:00.000Z',
      channel: 'email',
      summary: 'Worknwerk ile İstanbul lansmanında ortak içerik takvimi paylaşıldı.',
      sentiment: 'neutral',
      followUp: 'Ekim kampanyası için içerik onayı bekleniyor.',
      owner: 'Marketing',
    },
  ],
  campaignRecommendations: [
    {
      id: 'rec-1',
      segmentId: 'seg-strategic-partners',
      title: 'Partner Başarı Hikayeleri Serisi',
      description: 'Kurumsal partnerlerde genişleme için referans vaka e-postaları ve webinar dizisi.',
      suggestedChannels: ['email', 'webinar'],
      expectedLift: 0.18,
      audienceSize: 9,
      cta: 'Özel partner demo randevusu planla',
      recommendedSendDate: '2024-10-12',
    },
    {
      id: 'rec-2',
      segmentId: 'seg-medical-network',
      title: 'Medikal Advisory Bülteni',
      description: 'Board üyeleri için aylık protokol güncellemeleri ve klinik araştırma özetleri.',
      suggestedChannels: ['email', 'notification'],
      expectedLift: 0.22,
      audienceSize: 11,
      cta: 'Yeni protokol pilotuna katılım talep et',
      recommendedSendDate: '2024-10-09',
    },
    {
      id: 'rec-3',
      segmentId: 'seg-turkey-launch',
      title: 'İstanbul Lansman Aktivasyonları',
      description: 'Yerel partnerlerle ortak canlı etkinlik ve push bildirim kampanyası.',
      suggestedChannels: ['notification', 'event'],
      expectedLift: 0.26,
      audienceSize: 13,
      cta: 'Açılış etkinliği kayıtlarını topla',
      recommendedSendDate: '2024-10-15',
    },
    {
      id: 'rec-4',
      segmentId: 'seg-growth-frontier',
      title: 'Yeni Pazar Discovery Dizisi',
      description: 'Körfez ve Kuzey Amerika partnerleri için kişiselleştirilmiş drip kampanyası.',
      suggestedChannels: ['email', 'sms'],
      expectedLift: 0.19,
      audienceSize: 8,
      cta: 'Uzaktan demo oturumu planla',
      recommendedSendDate: '2024-10-18',
    },
  ],
  portalState: {
    profile: {
      id: 'portal-profile-1',
      invitationId: 'inv-1',
      email: 'partner.external@example.com',
      contactName: 'Selin Kaya',
      company: 'Longevity Partners GmbH',
      stakeholderUserId: 'ext-1',
      createdAt: '2024-09-28T08:00:00.000Z',
      updatedAt: '2024-10-05T09:30:00.000Z',
      lastSyncedAt: '2024-10-05T09:30:00.000Z',
      statuses: [
        {
          id: 'status-intake',
          title: 'Onboarding Başlangıcı',
          description: 'Portal profili oluşturuldu, temel bilgiler tamamlandı.',
          status: 'completed',
          dueDate: '2024-09-30T16:00:00.000Z',
          acknowledgedAt: '2024-09-29T10:12:00.000Z',
          lastUpdatedAt: '2024-09-29T10:12:00.000Z',
        },
        {
          id: 'status-compliance',
          title: 'Uyumluluk Belgeleri',
          description: 'Gerekli sözleşme ve sertifikaların yüklenmesi bekleniyor.',
          status: 'in-progress',
          dueDate: '2024-10-07T16:00:00.000Z',
          acknowledgedAt: '2024-10-01T08:45:00.000Z',
          lastUpdatedAt: '2024-10-03T14:30:00.000Z',
        },
        {
          id: 'status-training',
          title: 'Operasyon Brifingi',
          description: 'Portal ve MIS entegrasyonu için 30 dakikalık eğitim oturumu.',
          status: 'pending',
          dueDate: null,
          acknowledgedAt: null,
          lastUpdatedAt: '2024-09-28T08:00:00.000Z',
        },
      ],
    },
    documents: [
      {
        id: 'portal-doc-1',
        profileId: 'portal-profile-1',
        title: 'Uyumluluk Çerçevesi',
        description: 'Harici paydaş sözleşmesi ve KVKK onay formu.',
        category: 'compliance',
        createdAt: '2024-09-30T09:00:00.000Z',
        updatedAt: '2024-10-03T14:30:00.000Z',
        createdBy: { id: 'ext-1', name: 'Selin Kaya', email: 'partner.external@example.com' },
        approval: {
          status: 'pending',
          decidedAt: null,
          decidedBy: null,
          notes: null,
        },
        versions: [
          {
            id: 'portal-doc-1-v1',
            version: 1,
            fileName: 'uyumluluk-cercevesi-v1.pdf',
            uploadedAt: '2024-09-30T09:00:00.000Z',
            uploadedBy: { id: 'ext-1', name: 'Selin Kaya', email: 'partner.external@example.com' },
            notes: 'İlk taslak',
            secureLinks: [],
          },
          {
            id: 'portal-doc-1-v2',
            version: 2,
            fileName: 'uyumluluk-cercevesi-v2.pdf',
            uploadedAt: '2024-10-03T14:30:00.000Z',
            uploadedBy: { id: 'ext-1', name: 'Selin Kaya', email: 'partner.external@example.com' },
            notes: 'Hukuk geri bildirimi işlendi',
            secureLinks: [
              {
                id: 'portal-doc-1-link',
                createdAt: '2024-10-03T14:35:00.000Z',
                createdBy: { id: 'ext-1', name: 'Selin Kaya', email: 'partner.external@example.com' },
                expiresAt: '2024-10-04T14:35:00.000Z',
                url: 'https://app.dripfy.local/portal/documents/portal-doc-1/download?token=sample',
              },
            ],
          },
        ],
      },
      {
        id: 'portal-doc-2',
        profileId: 'portal-profile-1',
        title: 'Pazarlama Varlıkları',
        description: 'Onaylı görseller ve marka yönergeleri.',
        category: 'asset',
        createdAt: '2024-10-02T11:20:00.000Z',
        updatedAt: '2024-10-02T11:20:00.000Z',
        createdBy: { id: 'adm-1', name: 'Dripfy Admin', email: 'admin@dripfy.com' },
        approval: {
          status: 'approved',
          decidedAt: '2024-10-02T11:35:00.000Z',
          decidedBy: { id: 'adm-1', name: 'Dripfy Admin', email: 'admin@dripfy.com' },
          notes: 'Paydaş ile paylaşılabilir.',
        },
        versions: [
          {
            id: 'portal-doc-2-v1',
            version: 1,
            fileName: 'longevity-brand-kit.zip',
            uploadedAt: '2024-10-02T11:20:00.000Z',
            uploadedBy: { id: 'adm-1', name: 'Dripfy Admin', email: 'admin@dripfy.com' },
            secureLinks: [],
          },
        ],
      },
    ],
    supportRequests: [
      {
        id: 'portal-support-1',
        profileId: 'portal-profile-1',
        subject: 'MIS erişimi için API anahtarı talebi',
        message: 'Kendi CRM sistemimizle eşitleme yapmak için güvenli bir API anahtarına ihtiyacımız var.',
        category: 'integration',
        status: 'in-progress',
        priority: 'high',
        createdAt: '2024-10-01T07:50:00.000Z',
        updatedAt: '2024-10-04T09:05:00.000Z',
        createdBy: { id: 'ext-1', name: 'Selin Kaya', email: 'partner.external@example.com' },
      },
    ],
    messages: [
      {
        id: 'portal-message-1',
        profileId: 'portal-profile-1',
        body: 'Merhaba Selin, uyumluluk belgelerinin ikinci versiyonu için teşekkürler. Hukuk ekibi incelemeyi bugün tamamlayacak.',
        direction: 'outbound',
        author: { id: 'adm-2', name: 'Melih Kurt', email: 'melih@dripfy.com' },
        timestamp: '2024-10-03T15:00:00.000Z',
      },
      {
        id: 'portal-message-2',
        profileId: 'portal-profile-1',
        body: 'Güncelleme için teşekkürler. Eğitim oturumunun linkini paylaşabilir misiniz?',
        direction: 'inbound',
        author: { id: 'ext-1', name: 'Selin Kaya', email: 'partner.external@example.com' },
        timestamp: '2024-10-04T08:20:00.000Z',
      },
    ],
    usage: {
      totalEvents: 7,
      lastActivityAt: '2024-10-04T09:05:00.000Z',
      breakdown: {
        'invitation.accepted': 1,
        'document.created': 2,
        'document.version': 1,
        'support.requested': 1,
        'message.sent': 2,
      },
    },
  },
  insightRecords: [],
};
