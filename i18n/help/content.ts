import type { Language } from '../LanguageContext';
import type { HelpLocaleContent } from './types';

const englishContent: HelpLocaleContent = {
  locale: 'en',
  categories: [
    {
      id: 'getting-started',
      title: 'Getting started',
      description: 'Kick off with navigation tips, dashboard layout, and onboarding flows.',
      icon: 'Compass',
      keywords: ['setup', 'welcome', 'dashboard'],
    },
    {
      id: 'automation',
      title: 'Workflow automation',
      description: 'Automate repetitive work with playbooks, rules, and chatbot actions.',
      icon: 'Workflow',
      keywords: ['automation', 'rules', 'bots'],
    },
    {
      id: 'analytics',
      title: 'Analytics & reporting',
      description: 'Understand KPIs, build custom reports, and share insights.',
      icon: 'BarChart',
      keywords: ['kpi', 'reports', 'metrics'],
    },
    {
      id: 'collaboration',
      title: 'Collaboration & permissions',
      description: 'Manage roles, permissions, and shared workspaces.',
      icon: 'Users',
      keywords: ['roles', 'permissions', 'teams'],
    },
    {
      id: 'help-center',
      title: 'Help center & support',
      description: 'Find answers, contact support, or request guided onboarding.',
      icon: 'LifeBuoy',
      keywords: ['support', 'faq', 'tour'],
    },
  ],
  articles: [
    {
      id: 'onboarding-basics',
      categoryId: 'getting-started',
      title: 'Onboarding checklist for new teams',
      summary: 'Invite teammates, configure your workspace, and learn the dashboard layout in less than 10 minutes.',
      content: `Follow these five essentials to get productive quickly.

- Invite teammates from the Admin panel using single-use links.
- Configure primary KPIs in the analytics board to unlock insights.
- Walk through the guided tour to learn navigation shortcuts.
- Connect calendar and finance data sources to sync live metrics.
- Bookmark the Help Center to surface contextual tips anywhere.`,
      keywords: ['invite', 'setup', 'workspace', 'tour'],
      relatedArticleIds: ['collaboration-roles', 'analytics-widgets'],
      lastUpdated: '2025-01-12',
      estimatedReadingMinutes: 4,
      popularityScore: 98,
    },
    {
      id: 'customizing-dashboard',
      categoryId: 'getting-started',
      title: 'Customize your dashboard layout',
      summary: 'Rearrange tiles, pin your favourite metrics, and save views by role.',
      content: `Personalise every widget.

- Drag & drop KPI cards into any order.
- Use the "Save view" action to keep role-specific layouts.
- Toggle compact mode when presenting in meetings.
- Share layouts with teammates directly from the quick actions bar.`,
      keywords: ['layout', 'widgets', 'personalization'],
      relatedArticleIds: ['analytics-widgets'],
      lastUpdated: '2024-12-04',
      estimatedReadingMinutes: 3,
      popularityScore: 76,
    },
    {
      id: 'automation-blueprints',
      categoryId: 'automation',
      title: 'Automation blueprints library',
      summary: 'Trigger approvals, schedule reports, and notify teams automatically with reusable templates.',
      content: `Start with proven recipes.

- Use the "Finance approvals" blueprint to capture multi-step sign-off.
- Configure escalation rules to remind owners before deadlines.
- Combine chatbot actions with queue-based automations for complex workflows.
- Monitor executions from the Automation activity log.`,
      keywords: ['automation', 'blueprint', 'workflow', 'queue'],
      relatedArticleIds: ['chatbot-knowledge'],
      lastUpdated: '2025-02-02',
      estimatedReadingMinutes: 5,
      popularityScore: 91,
    },
    {
      id: 'analytics-widgets',
      categoryId: 'analytics',
      title: 'Build dynamic analytics widgets',
      summary: 'Design KPI groups, filter dashboards per market, and export actionable insights.',
      content: `Build trustworthy insights.

- Create KPI groups per region and tie them to approval flows.
- Use comparison mode to visualise growth week over week.
- Share live dashboards via secure links that respect viewer permissions.
- Export to CSV or schedule PDF snapshots for leadership updates.`,
      keywords: ['analytics', 'kpi', 'export', 'dashboard'],
      relatedArticleIds: ['customizing-dashboard'],
      lastUpdated: '2025-01-28',
      estimatedReadingMinutes: 6,
      popularityScore: 83,
    },
    {
      id: 'collaboration-roles',
      categoryId: 'collaboration',
      title: 'Understand roles & permissions',
      summary: 'Map organisational roles to platform capabilities and ensure compliant access control.',
      content: `Role-based access keeps data secure.

- Viewer: monitor dashboards and export read-only reports.
- Manager: approve workflows and assign tasks within their department.
- Finance: unlock ledger exports plus budgeting automations.
- Admin: configure integrations, permissions, and organisation-wide settings.
- Use custom permission overrides for exceptional cases.`,
      keywords: ['roles', 'permissions', 'access'],
      relatedArticleIds: ['onboarding-basics'],
      lastUpdated: '2024-11-18',
      estimatedReadingMinutes: 4,
      popularityScore: 87,
    },
    {
      id: 'chatbot-knowledge',
      categoryId: 'help-center',
      title: 'Use the chatbot for contextual help',
      summary: 'Ask a question anywhere and receive tailored answers with knowledge base references.',
      content: `The assistant recommends help articles automatically.

- Type natural language questions in your preferred language.
- Select knowledge sources to focus on policies, analytics, or records.
- Receive quick links to suggested help center articles.
- Submit feedback to improve recommendations over time.`,
      keywords: ['chatbot', 'support', 'knowledge base'],
      relatedArticleIds: ['automation-blueprints', 'onboarding-basics'],
      lastUpdated: '2025-02-10',
      estimatedReadingMinutes: 3,
      popularityScore: 94,
    },
  ],
  faqs: [
    {
      id: 'faq-data-refresh',
      categoryId: 'analytics',
      question: 'How often do dashboard metrics refresh?',
      answer: 'Metrics refresh every 15 minutes for connected integrations. Manual CSV uploads trigger immediate recalculation. You can force a refresh from the analytics header actions.',
      tags: ['analytics', 'data', 'refresh'],
    },
    {
      id: 'faq-tour-reset',
      categoryId: 'help-center',
      question: 'Can I restart the guided tour?',
      answer: 'Yes. Open the Help Center, scroll to Guided Tours, and select "Restart" for the page you want to revisit. Tours adapt based on your role permissions.',
      tags: ['tour', 'onboarding'],
    },
    {
      id: 'faq-automation-limits',
      categoryId: 'automation',
      question: 'Are there limits on automation runs?',
      answer: 'Starter plans include 5,000 automation runs per month. Upgrade to Scale for unlimited runs and advanced logging. Contact support for temporary increases.',
      tags: ['automation', 'limits', 'pricing'],
    },
    {
      id: 'faq-role-changes',
      categoryId: 'collaboration',
      question: 'How do I change a teammate’s role?',
      answer: 'Navigate to Admin Panel → Members, select the teammate, and choose a new role. Changes apply immediately and are tracked in the audit log.',
      tags: ['roles', 'permissions'],
    },
  ],
  suggestedArticleIds: ['onboarding-basics', 'automation-blueprints', 'chatbot-knowledge'],
};

const turkishContent: HelpLocaleContent = {
  locale: 'tr',
  categories: [
    {
      id: 'getting-started',
      title: 'Başlarken',
      description: 'Gezinme ipuçları, pano yerleşimi ve ilk kurulum adımlarıyla hızlı başlangıç yapın.',
      icon: 'Compass',
      keywords: ['kurulum', 'karşılama', 'pano'],
    },
    {
      id: 'automation',
      title: 'İş akışı otomasyonu',
      description: 'Tekrarlayan işleri şablonlar, kurallar ve chatbot aksiyonlarıyla otomatikleştirin.',
      icon: 'Workflow',
      keywords: ['otomasyon', 'kural', 'bot'],
    },
    {
      id: 'analytics',
      title: 'Analitik ve raporlama',
      description: "KPI'ları anlayın, özel raporlar oluşturun ve içgörüleri paylaşın.",
      icon: 'BarChart',
      keywords: ['kpi', 'rapor', 'metrik'],
    },
    {
      id: 'collaboration',
      title: 'İş birliği ve yetkiler',
      description: 'Rolleri, izinleri ve paylaşılan çalışma alanlarını yönetin.',
      icon: 'Users',
      keywords: ['roller', 'izinler', 'takım'],
    },
    {
      id: 'help-center',
      title: 'Yardım merkezi ve destek',
      description: 'Yanıt bulun, destekle iletişime geçin veya rehberli tur talep edin.',
      icon: 'LifeBuoy',
      keywords: ['destek', 'sss', 'tur'],
    },
  ],
  articles: [
    {
      id: 'onboarding-basics',
      categoryId: 'getting-started',
      title: 'Yeni ekipler için onboarding kontrol listesi',
      summary: 'Ekibi davet edin, çalışma alanınızı yapılandırın ve birkaç dakika içinde pano düzenini öğrenin.',
      content: `Hızlıca verimli olmak için bu beş adıma uyun.

- Tek kullanımlık bağlantılarla Yönetici panelinden ekip arkadaşlarını davet edin.
- Analitik panosunda ana KPI'ları tanımlayarak içgörüleri açığa çıkarın.
- Gezinme kısayollarını öğrenmek için rehberli turu tamamlayın.
- Canlı metrikleri eşitlemek için takvim ve finans entegrasyonlarını bağlayın.
- Her yerden bağlamsal ipuçları almak için Yardım Merkezini favorilere ekleyin.`,
      keywords: ['davet', 'kurulum', 'çalışma alanı', 'tur'],
      relatedArticleIds: ['collaboration-roles', 'analytics-widgets'],
      lastUpdated: '2025-01-12',
      estimatedReadingMinutes: 4,
      popularityScore: 98,
    },
    {
      id: 'customizing-dashboard',
      categoryId: 'getting-started',
      title: 'Panonuzu kişiselleştirin',
      summary: 'Kutucukları yeniden sıralayın, favori metrikleri sabitleyin ve role göre görünümler kaydedin.',
      content: `Her widget'ı kendinize göre uyarlayın.

- KPI kartlarını sürükleyip bırakarak istediğiniz sıraya dizin.
- "Görünümü kaydet" eylemiyle role özel düzenler oluşturun.
- Toplantılarda sunum yaparken kompakt modu açın.
- Hızlı eylemler çubuğundan düzenleri ekip arkadaşlarınızla paylaşın.`,
      keywords: ['düzen', 'widget', 'kişiselleştirme'],
      relatedArticleIds: ['analytics-widgets'],
      lastUpdated: '2024-12-04',
      estimatedReadingMinutes: 3,
      popularityScore: 76,
    },
    {
      id: 'automation-blueprints',
      categoryId: 'automation',
      title: 'Otomasyon şablon kütüphanesi',
      summary: 'Onayları tetikleyin, rapor planlayın ve ekipleri tekrar eden görevler için otomatik bilgilendirin.',
      content: `Kanıtlanmış tariflerle başlayın.

- Çok adımlı onaylar için "Finans onayı" şablonunu kullanın.
- Sorumluları son tarih öncesi uyarmak için eskalasyon kuralları tanımlayın.
- Karmaşık akışlarda chatbot aksiyonlarını kuyruk bazlı otomasyonlarla birleştirin.
- Otomasyon aktivite günlüğünden yürütmeleri izleyin.`,
      keywords: ['otomasyon', 'şablon', 'iş akışı', 'kuyruk'],
      relatedArticleIds: ['chatbot-knowledge'],
      lastUpdated: '2025-02-02',
      estimatedReadingMinutes: 5,
      popularityScore: 91,
    },
    {
      id: 'analytics-widgets',
      categoryId: 'analytics',
      title: 'Dinamik analitik widget’ları oluşturun',
      summary: 'Pazar bazında KPI grupları kurun, panoları filtreleyin ve içgörüleri dışa aktarın.',
      content: `Güvenilir içgörüler üretin.

- Bölge bazlı KPI grupları oluşturup onay akışlarına bağlayın.
- Haftalık büyümeyi görmek için karşılaştırma modunu açın.
- İzinlere saygı duyan güvenli bağlantılarla canlı panoları paylaşın.
- CSV olarak dışa aktarın veya yönetime düzenli PDF özetleri planlayın.`,
      keywords: ['analitik', 'kpi', 'dışa aktarma', 'pano'],
      relatedArticleIds: ['customizing-dashboard'],
      lastUpdated: '2025-01-28',
      estimatedReadingMinutes: 6,
      popularityScore: 83,
    },
    {
      id: 'collaboration-roles',
      categoryId: 'collaboration',
      title: 'Rolleri ve izinleri anlayın',
      summary: 'Kurumsal rolleri platform yetenekleriyle eşleyin ve güvenli erişim sağlayın.',
      content: `Rol temelli erişim veriyi güvende tutar.

- İzleyici: Panoları görüntüler ve yalnızca okunur raporları dışa aktarır.
- Yönetici: Departmanı içinde akışları onaylar ve görev atar.
- Finans: Muhasebe dışa aktarımlarını ve bütçe otomasyonlarını açar.
- Admin: Entegrasyonları, izinleri ve genel ayarları yapılandırır.
- İstisnai durumlar için özel izin tanımları ekleyin.`,
      keywords: ['roller', 'izinler', 'erişim'],
      relatedArticleIds: ['onboarding-basics'],
      lastUpdated: '2024-11-18',
      estimatedReadingMinutes: 4,
      popularityScore: 87,
    },
    {
      id: 'chatbot-knowledge',
      categoryId: 'help-center',
      title: 'Bağlamsal yardım için chatbot kullanın',
      summary: 'Herhangi bir yerde soru sorun, bilgi tabanı referanslarıyla öneriler alın.',
      content: `Asistan yardım makalelerini otomatik önerir.

- Sorularınızı istediğiniz dilde doğal olarak yazın.
- Politika, analitik veya kayıt odaklı kaynakları seçerek filtreleyin.
- Yardım merkezi makalelerine hızlı bağlantılar alın.
- Önerileri geliştirmek için geri bildirim bırakın.`,
      keywords: ['chatbot', 'destek', 'bilgi tabanı'],
      relatedArticleIds: ['automation-blueprints', 'onboarding-basics'],
      lastUpdated: '2025-02-10',
      estimatedReadingMinutes: 3,
      popularityScore: 94,
    },
  ],
  faqs: [
    {
      id: 'faq-data-refresh',
      categoryId: 'analytics',
      question: 'Panodaki metrikler ne sıklıkla yenilenir?',
      answer: 'Bağlı entegrasyonlar için metrikler her 15 dakikada bir yenilenir. Manuel CSV yüklemeleri anında yeniden hesaplama başlatır. Analitik üst menüsünden zorla yenileme yapabilirsiniz.',
      tags: ['analitik', 'veri', 'yenileme'],
    },
    {
      id: 'faq-tour-reset',
      categoryId: 'help-center',
      question: 'Rehberli turu yeniden başlatabilir miyim?',
      answer: 'Evet. Yardım Merkezini açın, Rehberli Turlar bölümüne ilerleyin ve yeniden görmek istediğiniz sayfa için "Yeniden Başlat" seçeneğine dokunun. Turlar rol izinlerinize göre uyarlanır.',
      tags: ['tur', 'onboarding'],
    },
    {
      id: 'faq-automation-limits',
      categoryId: 'automation',
      question: 'Otomasyon çalıştırma sınırı var mı?',
      answer: 'Başlangıç planı ayda 5.000 otomasyon çalıştırması içerir. Sınırsız yürütme ve gelişmiş loglama için Scale planına yükseltebilirsiniz. Geçici artışlar için destekle iletişime geçin.',
      tags: ['otomasyon', 'limit', 'fiyat'],
    },
    {
      id: 'faq-role-changes',
      categoryId: 'collaboration',
      question: 'Bir ekip arkadaşının rolünü nasıl değiştiririm?',
      answer: 'Yönetici Paneli → Üyeler sekmesine gidin, ekip arkadaşını seçin ve yeni rol belirleyin. Değişiklikler anında uygulanır ve denetim günlüğünde kaydedilir.',
      tags: ['roller', 'izinler'],
    },
  ],
  suggestedArticleIds: ['onboarding-basics', 'automation-blueprints', 'chatbot-knowledge'],
};

function cloneContent(source: HelpLocaleContent, locale: Language): HelpLocaleContent {
  return {
    locale,
    categories: source.categories.map((category) => ({ ...category })),
    articles: source.articles.map((article) => ({ ...article })),
    faqs: source.faqs.map((faq) => ({ ...faq })),
    suggestedArticleIds: source.suggestedArticleIds ? [...source.suggestedArticleIds] : undefined,
  };
}

export const helpContentByLanguage: Record<Language, HelpLocaleContent> = {
  en: englishContent,
  tr: turkishContent,
  de: cloneContent(englishContent, 'de'),
  ru: cloneContent(englishContent, 'ru'),
  ar: cloneContent(englishContent, 'ar'),
};
