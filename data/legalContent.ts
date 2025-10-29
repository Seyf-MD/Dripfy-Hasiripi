import { Language } from '../i18n/LanguageContext';

export type LegalPageKey = 'impressum' | 'privacy' | 'terms';

export const LEGAL_LANGUAGES: Language[] = ['tr', 'en', 'de', 'ru', 'ar'];

const deImpressum = `
<h2>Impressum</h2>
<p><strong>Dripfy GmbH (in Gründung)</strong><br/>Neue Mainzer Straße 66<br/>60311 Frankfurt am Main<br/>Deutschland</p>
<p><strong>Vertretungsberechtigte Personen:</strong><br/>Geschäftsführer: Dr. Hikmet Hasiripi<br/>Prokurist: Abdullah Hasiripi, MD</p>
<p><strong>Kontakt:</strong><br/>E-Mail: <a href="mailto:info@dripfy.de" target="_blank" rel="noopener noreferrer">info@dripfy.de</a></p>
<p><strong>Registereintrag:</strong><br/>Eintragung im Handelsregister: in Vorbereitung<br/>Registergericht: Amtsgericht Frankfurt am Main</p>
<p><strong>Umsatzsteuer-ID:</strong><br/>Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz: wird nachgereicht.</p>
<p><strong>Verantwortlich für den Inhalt gemäß § 55 Abs. 2 RStV:</strong><br/>Dr. Hikmet Hasiripi<br/>Neue Mainzer Straße 66<br/>60311 Frankfurt am Main</p>
`;

const enImpressum = `
<h2>Imprint</h2>
<p><strong>Dripfy GmbH (in formation)</strong><br/>Neue Mainzer Straße 66<br/>60311 Frankfurt am Main<br/>Germany</p>
<p><strong>Authorised representatives:</strong><br/>Managing Director: Dr. Hikmet Hasiripi<br/>Procurist: Abdullah Hasiripi, MD</p>
<p><strong>Contact:</strong><br/>E-mail: <a href="mailto:info@dripfy.de" target="_blank" rel="noopener noreferrer">info@dripfy.de</a></p>
<p><strong>Commercial register:</strong><br/>Registration with the commercial register: in progress<br/>Competent court: Local Court of Frankfurt am Main</p>
<p><strong>VAT ID:</strong><br/>VAT identification number pursuant to §27 a of the German VAT Act will be provided after registration.</p>
<p><strong>Person responsible according to § 55 para. 2 Interstate Broadcasting Treaty:</strong><br/>Dr. Hikmet Hasiripi<br/>Neue Mainzer Straße 66<br/>60311 Frankfurt am Main</p>
`;

const trImpressum = `
<h2>Künye</h2>
<p><strong>Dripfy GmbH (kuruluş aşamasında)</strong><br/>Neue Mainzer Straße 66<br/>60311 Frankfurt am Main<br/>Almanya</p>
<p><strong>Temsile yetkili kişiler:</strong><br/>Genel Müdür: Dr. Hikmet Hasiripi<br/>Prokürist: Abdullah Hasiripi, MD</p>
<p><strong>İletişim:</strong><br/>E-posta: <a href="mailto:info@dripfy.de" target="_blank" rel="noopener noreferrer">info@dripfy.de</a></p>
<p><strong>Ticaret sicili:</strong><br/>Tescil işlemi devam ediyor<br/>Yetkili mahkeme: Frankfurt am Main Yerel Mahkemesi</p>
<p><strong>Vergi numarası:</strong><br/>§27 a UStG uyarınca KDV kimlik numarası kayıt sonrası paylaşılacaktır.</p>
<p><strong>İçerikten sorumlu kişi (RStV § 55 Abs. 2):</strong><br/>Dr. Hikmet Hasiripi<br/>Neue Mainzer Straße 66<br/>60311 Frankfurt am Main</p>
`;

const ruImpressum = `
<h2>Выходные данные</h2>
<p><strong>Dripfy GmbH (в стадии регистрации)</strong><br/>Neue Mainzer Straße 66<br/>60311 Франкфурт-на-Майне<br/>Германия</p>
<p><strong>Уполномоченные представители:</strong><br/>Управляющий директор: Dr. Hikmet Hasiripi<br/>Прокурист: Abdullah Hasiripi, MD</p>
<p><strong>Контакты:</strong><br/>Эл. почта: <a href="mailto:info@dripfy.de" target="_blank" rel="noopener noreferrer">info@dripfy.de</a></p>
<p><strong>Регистрация в торговом реестре:</strong><br/>Процедура регистрации находится в процессе<br/>Компетентный суд: Amtsgericht Frankfurt am Main</p>
<p><strong>Идентификационный номер НДС:</strong><br/>Будет указан после завершения регистрации в соответствии с §27 a UStG.</p>
<p><strong>Ответственный за содержание согласно § 55 абз. 2 RStV:</strong><br/>Dr. Hikmet Hasiripi<br/>Neue Mainzer Straße 66<br/>60311 Франкфурт-на-Майне</p>
`;

const arImpressum = `
<h2>البيانات القانونية</h2>
<p><strong>شركة Dripfy ذات المسؤولية المحدودة (قيد التأسيس)</strong><br/>Neue Mainzer Straße 66<br/>60311 فرانكفورت أم ماين<br/>ألمانيا</p>
<p><strong>الأشخاص المخولون بالتمثيل:</strong><br/>المدير العام: الدكتور حكمت حصيريبي<br/>المفوض بالتوقيع: عبد الله حصيريبي، MD</p>
<p><strong>بيانات الاتصال:</strong><br/>البريد الإلكتروني: <a href="mailto:info@dripfy.de" target="_blank" rel="noopener noreferrer">info@dripfy.de</a></p>
<p><strong>السجل التجاري:</strong><br/>قيد التسجيل في السجل التجاري<br/>المحكمة المختصة: محكمة فرانكفورت أم ماين المحلية</p>
<p><strong>رقم التعريف الضريبي:</strong><br/>سيتم توفير رقم ضريبة القيمة المضافة وفقًا للفقرة §27 a من قانون ضريبة القيمة المضافة بعد التسجيل.</p>
<p><strong>المسؤول عن المحتوى وفق §55 الفقرة 2 من معاهدة البث الإعلامي:</strong><br/>الدكتور حكمت حصيريبي<br/>Neue Mainzer Straße 66<br/>60311 فرانكفورت أم ماين</p>
`;

const dePrivacy = `
<h2>Datenschutz gemäß DSGVO</h2>
<p><strong>1. Verantwortlicher</strong><br/>Dripfy GmbH, Neue Mainzer Straße 66, 60311 Frankfurt am Main.</p>
<p><strong>2. Datenverarbeitung</strong><br/>Erhobene Daten: Name, Geburtsdatum, Gesundheits- und Genomdaten, Bild-/Videodaten (nach Einwilligung).<br/>Die Verarbeitung erfolgt ausschließlich zur Erbringung unserer Dienstleistungen.</p>
<p><strong>3. Speicherung &amp; Sicherheit</strong><br/>Alle Daten werden gemäß Art. 5 DSGVO gespeichert und geschützt.<br/>Zugriff haben ausschließlich autorisierte Personen; wo möglich werden Daten pseudonymisiert oder anonymisiert.<br/>Betroffene können Auskunft, Berichtigung oder Löschung verlangen (Art. 15–17 DSGVO).</p>
<p><strong>4. Einwilligung zu Forschungszwecken (optional)</strong><br/>Anonymisierte medizinische Daten können mit gesonderter Einwilligung für Forschungs- und Entwicklungszwecke im Bereich Longevity genutzt werden.</p>
`;

const enPrivacy = `
<h2>GDPR Privacy Information</h2>
<p><strong>1. Controller</strong><br/>Dripfy GmbH, Neue Mainzer Straße 66, 60311 Frankfurt am Main, Germany.</p>
<p><strong>2. Data Processing</strong><br/>Collected data: name, date of birth, health and genomic information, image/video material (with consent).<br/>Processing is carried out solely to deliver our services.</p>
<p><strong>3. Storage &amp; Security</strong><br/>All data is stored and protected in accordance with Art. 5 GDPR.<br/>Access is restricted to authorised personnel; data is pseudonymised or anonymised wherever possible.<br/>Data subjects may request access, rectification or erasure (Art. 15–17 GDPR).</p>
<p><strong>4. Optional research consent</strong><br/>With explicit consent, anonymised medical data may be used for research and development relating to longevity.</p>
`;

const trPrivacy = `
<h2>KVKK ve GDPR Uyumlu Gizlilik Bilgilendirmesi</h2>
<p><strong>1. Veri Sorumlusu</strong><br/>Dripfy GmbH, Neue Mainzer Straße 66, 60311 Frankfurt am Main, Almanya.</p>
<p><strong>2. Veri İşleme</strong><br/>Toplanan veriler: İsim, doğum tarihi, sağlık ve genom verileri, görsel/işitsel kayıtlar (açık rıza ile).<br/>Veriler yalnızca hizmetlerimizi sunmak amacıyla işlenir.</p>
<p><strong>3. Saklama ve Güvenlik</strong><br/>Tüm veriler GDPR Madde 5’e uygun şekilde saklanır ve korunur.<br/>Erişim sadece yetkili personele açıktır; mümkün olan her yerde veriler takma adlandırılır veya anonimleştirilir.<br/>İlgili kişiler erişim, düzeltme veya silme talebinde bulunabilir (Madde 15–17).</p>
<p><strong>4. Araştırma Amaçlı Rıza (opsiyonel)</strong><br/>Ayrı onay verilmesi durumunda anonimleştirilmiş tıbbi veriler uzun ömürlülük alanındaki Ar-Ge çalışmalarında kullanılabilir.</p>
`;

const ruPrivacy = `
<h2>Политика конфиденциальности (GDPR)</h2>
<p><strong>1. Ответственный оператор данных</strong><br/>Dripfy GmbH, Neue Mainzer Straße 66, 60311 Франкфурт-на-Майне, Германия.</p>
<p><strong>2. Обработка данных</strong><br/>Собираемые данные: имя, дата рождения, медицинские и генетические сведения, фото/видеоматериалы (по согласованию).<br/>Обработка выполняется исключительно для оказания наших услуг.</p>
<p><strong>3. Хранение и безопасность</strong><br/>Все данные хранятся и защищаются в соответствии со ст. 5 GDPR.<br/>Доступ разрешён только уполномоченным лицам; при возможности данные псевдонимизируются или анонимизируются.<br/>Субъекты данных могут требовать доступ, исправление или удаление (ст. 15–17 GDPR).</p>
<p><strong>4. Согласие на исследовательские цели (опционально)</strong><br/>По отдельному согласию обезличенные медицинские данные могут использоваться для исследований и разработки в области долголетия.</p>
`;

const arPrivacy = `
<h2>معلومات الخصوصية وفق اللائحة العامة لحماية البيانات GDPR</h2>
<p><strong>1. المسؤول عن البيانات</strong><br/>شركة Dripfy GmbH، العنوان: Neue Mainzer Straße 66، 60311 فرانكفورت أم ماين، ألمانيا.</p>
<p><strong>2. معالجة البيانات</strong><br/>البيانات التي يتم جمعها: الاسم، تاريخ الميلاد، المعلومات الصحية والوراثية، الصور أو مقاطع الفيديو (بعد الحصول على الموافقة).<br/>تتم المعالجة حصريًا بهدف تقديم خدماتنا.</p>
<p><strong>3. التخزين والأمان</strong><br/>يتم تخزين جميع البيانات وحمايتها وفقًا للمادة 5 من GDPR.<br/>يقتصر الوصول على الأشخاص المخولين فقط؛ ويتم إخفاء الهوية أو ترميز البيانات قدر الإمكان.<br/>يجوز لصاحب البيانات طلب الاطلاع أو التصحيح أو الحذف (المواد 15-17 من GDPR).</p>
<p><strong>4. الموافقة على الأبحاث (اختياري)</strong><br/>بعد الحصول على موافقة منفصلة، يمكن استخدام البيانات الطبية المجهولة الهوية لأغراض البحث والتطوير في مجال طول العمر.</p>
`;

const deTerms = `
<h2>Website Nutzungsbedingungen</h2>
<p><strong>1. Annahme der Bedingungen</strong><br/>Mit dem Zugriff auf diese Website erklären Sie sich mit diesen Nutzungsbedingungen einverstanden. Wenn Sie nicht zustimmen, nutzen Sie die Website bitte nicht.</p>
<p><strong>2. Geistiges Eigentum</strong><br/>Alle Inhalte, einschließlich Texte, Grafiken, Logos, Bilder, Audio und Software, sind Eigentum der Dripfy GmbH (in Gründung) oder ihrer Lizenzgeber.</p>
<p><strong>3. Nutzerverhalten</strong><br/>Sie verpflichten sich, alle geltenden Gesetze einzuhalten, keine rechtswidrigen Handlungen vorzunehmen und die Sicherheit der Website nicht zu beeinträchtigen.</p>
<p><strong>4. Datenschutz</strong><br/>Die Verarbeitung personenbezogener Daten richtet sich nach unserer <a href="#privacy" rel="noopener noreferrer" target="_blank">Datenschutzerklärung</a>.</p>
<p><strong>5. Haftungsausschluss</strong><br/>Die Website wird &bdquo;wie besehen&ldquo; bereitgestellt, ohne Gewähr für Fehlerfreiheit, Sicherheit oder Verfügbarkeit.</p>
<p><strong>6. Haftungsbeschränkung</strong><br/>Dripfy haftet nicht für indirekte, zufällige oder Folgeschäden, die aus der Nutzung der Website entstehen.</p>
<p><strong>7. Änderungen</strong><br/>Wir behalten uns vor, diese Bedingungen jederzeit ohne Vorankündigung anzupassen.</p>
<p><strong>8. Kontakt</strong><br/>Fragen zu den Bedingungen richten Sie bitte an <a href="mailto:info@dripfy.com" target="_blank" rel="noopener noreferrer">info@dripfy.com</a>.</p>
`;

const enTerms = `
<h2>Website Terms &amp; Conditions</h2>
<p><strong>1. Acceptance</strong><br/>By accessing this website you agree to these Terms &amp; Conditions. If you do not agree, please refrain from using the site.</p>
<p><strong>2. Intellectual property</strong><br/>All content, including text, graphics, logos, images, audio and software, is owned by Dripfy GmbH (in formation) or its licensors.</p>
<p><strong>3. User conduct</strong><br/>You agree to comply with all applicable laws, refrain from illegal activity and not compromise the security of the website.</p>
<p><strong>4. Privacy</strong><br/>Our handling of personal data is described in the <a href="#privacy" rel="noopener noreferrer" target="_blank">Privacy Policy</a>.</p>
<p><strong>5. Disclaimer</strong><br/>The website is provided “as is” without warranties regarding accuracy, security or uninterrupted availability.</p>
<p><strong>6. Limitation of liability</strong><br/>Dripfy is not liable for indirect, incidental or consequential damages arising from the use of the website.</p>
<p><strong>7. Changes</strong><br/>We reserve the right to modify these Terms at any time without prior notice.</p>
<p><strong>8. Contact</strong><br/>For questions please contact <a href="mailto:info@dripfy.com" target="_blank" rel="noopener noreferrer">info@dripfy.com</a>.</p>
`;

const trTerms = `
<h2>Web Sitesi Kullanım Şartları</h2>
<p><strong>1. Şartların kabulü</strong><br/>Bu web sitesine erişerek Kullanım Şartları’nı kabul etmiş olursunuz. Kabul etmiyorsanız lütfen siteyi kullanmayın.</p>
<p><strong>2. Fikri mülkiyet</strong><br/>Metin, grafik, logo, görsel, ses ve yazılım dahil tüm içerik Dripfy GmbH’ye (kuruluş aşamasında) veya lisans verenlerine aittir.</p>
<p><strong>3. Kullanıcı davranışı</strong><br/>Tüm yürürlükteki yasalara uymayı, yasa dışı faaliyetlerden kaçınmayı ve web sitesinin güvenliğini tehlikeye atmamayı taahhüt edersiniz.</p>
<p><strong>4. Gizlilik</strong><br/>Kişisel verilerin işlenmesine ilişkin bilgiler <a href="#privacy" rel="noopener noreferrer" target="_blank">Gizlilik Politikamızda</a> açıklanmıştır.</p>
<p><strong>5. Sorumluluk reddi</strong><br/>Web sitesi “olduğu gibi” sunulur; doğruluk, güvenlik veya kesintisiz hizmet konusunda garanti verilmez.</p>
<p><strong>6. Sorumluluğun sınırlandırılması</strong><br/>Dripfy, web sitesinin kullanımı sonucu ortaya çıkan dolaylı, tesadüfi veya sonuçsal zararlardan sorumlu değildir.</p>
<p><strong>7. Değişiklikler</strong><br/>Bu şartları önceden bildirimde bulunmaksızın değiştirme hakkımız saklıdır.</p>
<p><strong>8. İletişim</strong><br/>Sorularınız için <a href="mailto:info@dripfy.com" target="_blank" rel="noopener noreferrer">info@dripfy.com</a> adresine yazabilirsiniz.</p>
`;

const ruTerms = `
<h2>Условия использования сайта</h2>
<p><strong>1. Принятие условий</strong><br/>Получая доступ к этому сайту, вы соглашаетесь с настоящими условиями. Если вы не согласны, пожалуйста, не используйте сайт.</p>
<p><strong>2. Интеллектуальная собственность</strong><br/>Все материалы, включая текст, графику, логотипы, изображения, аудио и программное обеспечение, принадлежат Dripfy GmbH (на стадии регистрации) или её лицензиарам.</p>
<p><strong>3. Поведение пользователя</strong><br/>Вы обязуетесь соблюдать применимое законодательство, не совершать незаконных действий и не нарушать безопасность сайта.</p>
<p><strong>4. Конфиденциальность</strong><br/>Обработка персональных данных описана в <a href="#privacy" rel="noopener noreferrer" target="_blank">Политике конфиденциальности</a>.</p>
<p><strong>5. Отказ от гарантий</strong><br/>Сайт предоставляется «как есть», без гарантий точности, безопасности или бесперебойной работы.</p>
<p><strong>6. Ограничение ответственности</strong><br/>Dripfy не несёт ответственности за косвенные, случайные или последующие убытки, возникающие при использовании сайта.</p>
<p><strong>7. Изменения</strong><br/>Мы оставляем за собой право изменять настоящие условия без предварительного уведомления.</p>
<p><strong>8. Контакты</strong><br/>По вопросам обращайтесь по адресу <a href="mailto:info@dripfy.com" target="_blank" rel="noopener noreferrer">info@dripfy.com</a>.</p>
`;

const arTerms = `
<h2>شروط وأحكام الموقع الإلكتروني</h2>
<p><strong>1. قبول الشروط</strong><br/>عند دخولك إلى هذا الموقع فإنك توافق على هذه الشروط والأحكام. إذا كنت لا توافق، يرجى عدم استخدام الموقع.</p>
<p><strong>2. الملكية الفكرية</strong><br/>جميع المحتويات بما في ذلك النصوص والرسومات والشعارات والصور والملفات الصوتية والبرامج مملوكة لشركة Dripfy GmbH (قيد التأسيس) أو للجهات المرخِّصة لها.</p>
<p><strong>3. سلوك المستخدم</strong><br/>تلتزم بالامتثال لجميع القوانين المعمول بها، والامتناع عن أي نشاط غير قانوني، وعدم تعريض أمن الموقع للخطر.</p>
<p><strong>4. الخصوصية</strong><br/>يتم توضيح كيفية التعامل مع البيانات الشخصية في <a href="#privacy" rel="noopener noreferrer" target="_blank">سياسة الخصوصية</a>.</p>
<p><strong>5. إخلاء المسؤولية</strong><br/>يُقدَّم الموقع «كما هو» دون أي ضمانات تتعلق بالدقة أو الأمان أو التوفر المستمر.</p>
<p><strong>6. حدود المسؤولية</strong><br/>لا تتحمل شركة Dripfy المسؤولية عن أي أضرار غير مباشرة أو عرضية أو لاحقة تنشأ عن استخدام الموقع.</p>
<p><strong>7. التعديلات</strong><br/>نحتفظ بالحق في تعديل هذه الشروط في أي وقت دون إشعار مسبق.</p>
<p><strong>8. التواصل</strong><br/>للاستفسارات، يرجى التواصل على <a href="mailto:info@dripfy.com" target="_blank" rel="noopener noreferrer">info@dripfy.com</a>.</p>
`;

export const legalContent: Record<LegalPageKey, Record<Language, string>> = {
  impressum: {
    de: deImpressum,
    en: enImpressum,
    tr: trImpressum,
    ru: ruImpressum,
    ar: arImpressum,
  },
  privacy: {
    de: dePrivacy,
    en: enPrivacy,
    tr: trPrivacy,
    ru: ruPrivacy,
    ar: arPrivacy,
  },
  terms: {
    de: deTerms,
    en: enTerms,
    tr: trTerms,
    ru: ruTerms,
    ar: arTerms,
  },
};

export const LEGAL_DEFAULT_LANGUAGE: Language = 'en';
