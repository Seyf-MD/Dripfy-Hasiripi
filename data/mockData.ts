import { ScheduleItem, Payment, Challenge, Advantage, Contact, Task } from '../types';

export const scheduleData: { germany: ScheduleItem[]; istanbul: ScheduleItem[] } = {
  germany: [
    { id: 1, title: 'Entegrasyon toplantısı sonrası Driss (LR BME-Head)', assignees: ['Dr.Umut Zinc', 'Dr. Jhon Doe Team'], tags: [{ text: 'visit', color: 'purple' }, { text: 'high', color: 'red' }] },
    { id: 2, title: 'İsviçre Bankası ile toplantı ve Sharman Ailesi Ortaklığı', assignees: ['Dr. Riyadh Team'], tags: [{ text: 'call', color: 'green' }, { text: 'high', color: 'red' }] },
    { id: 3, title: 'Vegan pure serisi sunumu (Franchise Day)', assignees: ['Dr. Sinan Team'], tags: [{ text: 'done', color: 'orange' }, { text: 'high', color: 'red' }] },
    { id: 4, title: 'Lipozomal Vitamin C Formülü', assignees: ['Dr. Uwell'], tags: [{ text: 'notify', color: 'blue' }, { text: 'medium', color: 'yellow' }] },
  ],
  istanbul: [
    { id: 1, title: 'Pazarlama ile ilgili peptide updates', assignees: ['Dr. Cem'], tags: [{ text: 'meeting', color: 'blue' }, { text: 'high', color: 'red' }] },
    { id: 2, title: 'Gelecekteki M.I.S. Council listesi ve sunum update', assignees: ['Dr. Ali İstanbul'], tags: [{ text: 'meeting', color: 'blue' }, { text: 'high', color: 'red' }] },
    { id: 3, title: 'Dr. Nail Han ile planlanan video-BR2 çekimi', assignees: ['Dr. Gökhan Kurt'], tags: [{ text: 'meeting', color: 'blue' }, { text: 'medium', color: 'yellow' }] },
    { id: 4, title: 'Dudak Dolgusu Etkinliği 2023 için yapılan pratik gün', assignees: ['Ahmet Kurt, ICD'], tags: [{ text: 'meeting', color: 'blue' }, { text: 'medium', color: 'yellow' }] },
  ],
};

// FIX: Replaced `any` with specific types for `overview`, `breakdown`, and `categories` to ensure type safety.
export const financialData: {
  overview: { totalPending: number; paid: number; total: number };
  payments: Payment[];
  breakdown: { [key: string]: number };
  categories: { [key: string]: number };
} = {
    overview: {
        totalPending: 64100,
        paid: 20000,
        total: 84100,
    },
    payments: [
        { id: 1, title: 'Ibo', amount: 500, status: 'pending', tags: [{ text: 'Passive', color: 'blue' }] },
        { id: 2, title: 'PTS İsviçre', amount: 1500, status: 'pending', tags: [{ text: 'Contribution', color: 'purple' }] },
        { id: 3, title: 'Dubai press release', amount: 500, status: 'pending', tags: [{ text: 'Marketing', color: 'pink' }] },
        { id: 4, title: 'Bilet uçak', amount: 500, status: 'pending', tags: [{ text: 'Travel', color: 'orange' }] },
        { id: 5, title: 'Hamburg', amount: 400, status: 'pending', tags: [{ text: 'Travel', color: 'orange' }] },
        { id: 6, title: 'Myoact', amount: 350, status: 'pending', tags: [{ text: 'Logistics', color: 'green' }] },
        { id: 7, title: 'ChatGpt Pro', amount: 250, status: 'pending', tags: [{ text: 'Software', color: 'teal' }] },
    ],
    breakdown: {
        'Pazartesi': 2000,
        'Salı': 2000,
        'Çarşamba': 2100,
    },
    categories: {
        'Contribution': 1500,
        'Travel': 900,
        'Passive': 500,
        'Marketing': 500,
        'Logistics': 350,
        'Software': 250,
    }
};

export const challengesAndAdvantages: { challenges: Challenge[]; advantages: Advantage[] } = {
  challenges: [
    { id: 1, title: 'Zaman Kısıtlılığı', description: 'Hamburg ve İstanbul ziyaretleri sebebiyle zaman kısıtlılığı.', tags: [{ text: 'high impact', color: 'red' }, { text: 'Operational', color: 'gray' }] },
    { id: 2, title: 'Teknoloji Ekipmanları', description: 'iPad ve iPhone alınması gerekli.', tags: [{ text: 'action impact', color: 'yellow' }, { text: 'Technology', color: 'gray' }] },
    { id: 3, title: 'Tesisat Düzenlemesi', description: 'LR camın dış yüzüne milchglass kaplanması gibi usta başı işlerin zaman alması.', tags: [{ text: 'action impact', color: 'yellow' }, { text: 'Maintenance', color: 'gray' }] },
    { id: 4, title: 'Yazılım Abonelikleri', description: 'ChatGPT Pro aboneliği.', tags: [{ text: 'low impact', color: 'green' }, { text: 'Software', color: 'gray' }] },
  ],
  advantages: [
    { id: 1, title: 'MVP Başarısı', description: 'Dripfy NAD serumunun, ilk Proof of Concept yerimiz olan Longevity Rooms içerisinde faaliyete başladığı için Live on Action deneyimler ile hız kazanmış oluyoruz.', tags: [{ text: 'high impact', color: 'red' }, { text: 'Product', color: 'gray' }] },
    { id: 2, title: 'Proof of Concept', description: 'istikrarlı bir şekilde büyüyen LR x Dripfy işbirliğine katılan Team memberlar uyum içerisinde özverili içten ve profesyonel yaklaşımda bulunuyorlar.', tags: [{ text: 'high impact', color: 'red' }, { text: 'Validation', color: 'gray' }] },
    { id: 3, title: 'Takım Uyumu', description: 'süregelen networking imkanlari hiz kazanmamiza yardimci oluyor.', tags: [{ text: 'high impact', color: 'red' }, { text: 'Team', color: 'gray' }] },
  ],
};

export const contactsData: { individuals: Contact[]; organizations: Contact[] } = {
  individuals: [
    { id: 1, name: 'Dr. Ali Tınazlı', role: 'Medical Consultant', tags: [{ text: 'active', color: 'green' }, { text: 'key', color: 'red' }, { text: 'advisor', color: 'blue' }] },
    { id: 2, name: 'Dr. Bülent Uğurlu', role: 'Medical Board Partner', tags: [{ text: 'negotiating', color: 'yellow' }, { text: 'high', color: 'red' }, { text: 'board', color: 'blue' }] },
    { id: 3, name: 'Dr. Ali Assar', role: 'Board Tutor', tags: [{ text: 'negotiating', color: 'yellow' }, { text: 'high', color: 'red' }, { text: 'board', color: 'blue' }] },
    { id: 4, name: 'Dr. Mansoor Mohammed', role: 'Precision Health Clinic', tags: [{ text: 'active', color: 'green' }, { text: 'key', color: 'red' }, { text: 'partner', color: 'blue' }] },
  ],
  organizations: [
    { id: 1, name: 'Livion Clinic', role: 'Partner Clinic', tags: [{ text: 'active', color: 'green' }, { text: 'key', color: 'red' }, { text: 'B2B', color: 'purple' }] },
    { id: 2, name: 'Myoact', role: 'Device Partner', tags: [{ text: 'active', color: 'green' }, { text: 'key', color: 'red' }, { text: 'tech', color: 'purple' }] },
    { id: 3, name: 'Lifespin Health', role: 'API Partner', tags: [{ text: 'active', color: 'green' }, { text: 'key', color: 'red' }, { text: 'tech', color: 'purple' }] },
    { id: 4, name: 'Nanolive', role: 'Tech Partner', tags: [{ text: 'pending', color: 'yellow' }, { text: 'medium', color: 'orange' }, { text: 'B2B', color: 'purple' }] },
    { id: 5, name: 'Deep Longevity', role: 'Singapore', tags: [{ text: 'active', color: 'green' }, { text: 'key', color: 'red' }, { text: 'tech', color: 'purple' }] },
  ],
};

export const tasksData: Task[] = [
    { id: 1, title: 'M&E + Sales to Livion Clinic', description: 'Completed sales presentation. Sheet M/E-2 to Livion Clinic', status: 'in-progress', priority: 'high', assignee: 'Lucas Doe', tags: [{ text: 'in-progress', color: 'blue' }, { text: 'meeting', color: 'purple' }] },
    { id: 2, title: 'Myoact Device Onboarding', description: 'Problem/onboarding solved. Dr. Judy header fixed.', status: 'in-progress', priority: 'high', assignee: 'Lucas Doe', tags: [{ text: 'in-progress', color: 'blue' }, { text: 'integration', color: 'green' }] },
    { id: 3, title: 'Lifespin API Integration', description: 'Start API Integration based on presentation of Google Power plan', status: 'pending', priority: 'high', assignee: 'Dev Team', tags: [{ text: 'pending', color: 'yellow' }, { text: 'integration', color: 'green' }] },
    { id: 4, title: 'Medical Board Contracts', description: 'Structure and send out drafts for medical board members', status: 'pending', priority: 'high', assignee: 'Legal Team', tags: [{ text: 'pending', color: 'yellow' }, { text: 'contract', color: 'orange' }] },
    { id: 5, title: 'ISO9001 Audit Documentation', description: 'All revisions accepted, preparation until 2th process edition for ISO9001 audit document', status: 'completed', priority: 'medium', assignee: 'Admin', tags: [{ text: 'completed', color: 'gray' }, { text: 'administrative', color: 'pink' }] },
];