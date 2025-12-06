
export interface ReleaseNote {
    version: string;
    date: string;
    title: { [lang: string]: string };
    description: { [lang: string]: string };
    features: { [lang: string]: string[] };
}

export const releaseNotes: ReleaseNote[] = [
    {
        version: '2.0.0',
        date: '2025-12-06',
        title: {
            tr: 'Management Information System Update',
            en: 'Management Information System Update',
            de: 'Management Information System Update',
            ru: 'Обновление информационной системы управления',
            ar: 'تحديث نظام المعلومات الإدارية'
        },
        description: {
            tr: 'Dripfy tamamen yenilendi! iOS 28 konseptinden ilham alan ultra-modern tasarım, akıcı animasyonlar ve gelişmiş kullanıcı deneyimi ile tanışın.',
            en: 'Dripfy is completely reimagined! Meet the ultra-modern design inspired by the iOS 28 concept, fluid animations, and enhanced user experience.',
            de: 'Dripfy ist komplett neu erfunden! Entdecken Sie das ultramoderne Design, inspiriert vom iOS 28-Konzept, flüssige Animationen und ein verbessertes Benutzererlebnis.',
            ru: 'Dripfy полностью переосмыслен! Встречайте ультрасовременный дизайн, вдохновленный концепцией iOS 28, плавные анимации и улучшенный пользовательский опыт.',
            ar: 'تم إعادة تصور Dripfy بالكامل! تعرف على التصميم فائق الحداثة المستوحى من مفهوم iOS 28، والرسوم المتحركة السلسة، وتجربة المستخدم المحسّنة.'
        },
        features: {
            tr: [
                '✨ Ultra-Glassmorphism: Tüm arayüzde modern buzlu cam efektleri',
                '📅 Akıllı Takvim: Sürükle-bırak desteği ve yeni iOS tarzı tarih seçici',
                '🌗 Dinamik Tema: Karanlık ve Aydınlık mod için özel optimize edilmiş renk paletleri',
                '🔒 Gelişmiş Güvenlik: Kimlik doğrulama ve veri güvenliği altyapısı güçlendirildi',
                '⚡ Performans Artışı: Sayfa geçişleri ve yükleme süreleri optimize edildi'
            ],
            en: [
                '✨ Ultra-Glassmorphism: Modern frosted glass effects throughout the UI',
                '📅 Smart Calendar: Drag-and-drop support and new iOS-style date picker',
                '🌗 Dynamic Theme: Optimized color palettes for Light and Dark modes',
                '🔒 Enhanced Security: Strengthened authentication and data security infrastructure',
                '⚡ Performance Boost: Optimized page transitions and load times'
            ],
            de: [
                '✨ Ultra-Glassmorphism: Moderne Milchglaseffekte in der gesamten Benutzeroberfläche',
                '📅 Intelligenter Kalender: Drag-and-Drop-Unterstützung und neuer Datumswähler im iOS-Stil',
                '🌗 Dynamisches Thema: Optimierte Farbpaletten für Hell- und Dunkelmodus',
                '🔒 Verbesserte Sicherheit: Verstärkte Authentifizierungs- und Datensicherheitsinfrastruktur',
                '⚡ Leistungssteigerung: Optimierte Seitenübergänge und Ladezeiten'
            ],
            ru: [
                '✨ Ультра-Глассморфизм: Современные эффекты матового стекла во всем интерфейсе',
                '📅 Умный календарь: Поддержка перетаскивания и новый выбор даты в стиле iOS',
                '🌗 Динамическая тема: Оптимизированные цветовые палитры для светлого и темного режимов',
                '🔒 Улучшенная безопасность: Усиленная инфраструктура аутентификации и безопасности данных',
                '⚡ Повышение производительности: Оптимизированные переходы страниц и время загрузки'
            ],
            ar: [
                '✨ Ultra-Glassmorphism: تأثيرات الزجاج المصنفر الحديثة في جميع أنحاء واجهة المستخدم',
                '📅 التقويم الذكي: دعم السحب والإفلات ومنتقي التاريخ الجديد بأسلوب iOS',
                '🌗 الثيم الديناميكي: لوحات ألوان محسّنة للأوضاع الفاتحة والداكنة',
                '🔒 أمان محسّن: تعزيز بنية المصادقة وأمن البيانات',
                '⚡ تعزيز الأداء: تحسين انتقالات الصفحة وأوقات التحميل'
            ]
        }
    }
];

export const LATEST_VERSION = releaseNotes[0].version;
