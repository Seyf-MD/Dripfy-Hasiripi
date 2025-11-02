import type { ChatbotPromptTemplate } from '../../types';

export const PROMPT_TEMPLATES: ChatbotPromptTemplate[] = [
  {
    id: 'policy-summary',
    name: 'Policy Summary',
    description: 'Önemli politika veya prosedür maddelerini hızla özetler.',
    prompt: 'Lütfen aşağıdaki politika/prosedür metnini özetleyip kritik adımları çıkar: ',
    recommendedSources: ['docs'],
  },
  {
    id: 'incident-report',
    name: 'Incident Report Draft',
    description: 'Olay bildirimlerinde hangi aksiyonların alınması gerektiğini belirler.',
    prompt: 'Aşağıdaki durum için olay raporu taslağı oluştur ve gerekli aksiyonları listele: ',
    recommendedSources: ['docs', 'data'],
  },
  {
    id: 'customer-update',
    name: 'Customer Update',
    description: 'Müşterilere gönderilecek kısa durum bilgilendirmesi hazırlar.',
    prompt: 'Bu gelişme için müşteri bilgilendirme metni hazırla: ',
    recommendedSources: ['data'],
  },
];

export const DEFAULT_TEMPLATE_ID = PROMPT_TEMPLATES[0]?.id ?? 'policy-summary';
