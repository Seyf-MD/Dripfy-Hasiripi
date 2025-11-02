# Dripfy MIS Dashboard

Dripfy yönetim paneli; çok dilli React/Vite arayüzü, e-posta doğrulamalı kayıt akışı ve PHP tabanlı bir API ile çalışan modern bir MIS (Management Information System) uygulamasıdır. Bu dosya, projeyi ilk kez inceleyen birinin bile geliştirme ve yayına alma süreçlerini baştan sona anlayabilmesi için hazırlandı.

---

## 1. Hızlı Başlangıç

```bash
git clone <repo>
cd Dripfy-Hasiripi
npm install
cp .env.example .env    # Gerekli alanları doldurun
npm run dev:full        # Vite + Express dev sunucusu birlikte açılır
```

Tarayıcı: http://localhost:3000
Geliştirme süresince Express API `http://localhost:4000` üzerinden çalışır ve SMTP ayarlarınızı `.env` dosyasından okur.

> Not: Frontend tarafının dev API’ye bağlanması için `.env` veya `.env.development` dosyanıza `VITE_API_BASE=http://localhost:4000` ve `JWT_SECRET`, `JWT_EXPIRES_IN` gibi kimlik doğrulama değişkenlerini eklemeyi unutmayın.

---

## 2. Mimari Genel Bakış

| Katman | Teknoloji | Açıklama |
|--------|-----------|----------|
| **Ön Yüz** | React 19, Vite, TailwindCSS | Tüm dashboard ekranları, tema yönetimi, çoklu dil desteği |
| **Geliştirme API’si** | Node.js + Express | Yerel çalışırken doğrulama kodları ve e-postaları gönderir (`npm run server`) |
| **Kimlik Doğrulama** | JWT + bcrypt | `/api/auth/login` ve `/api/auth/logout` dev ortamı admin oturumu |
| **Üretim API’si** | PHP 8 + PHPMailer | Paylaşımlı hosting üzerinde çalışan, doğrulama kodu ve kayıt taleplerini yöneten `public/api/signup/*` |
| **Veri Saklama** | JSON dosyaları | `public/api/runtime/signup_codes.json` (kodlar) ve `signup_requests.json` (bekleyen talepler); PHP scripti tarafından yönetilir |

**Signup akışı**  
1. Kullanıcı formu doldurur → `api/signup/index.php` kullanıcıya 6 haneli kod e-postalar.  
2. Kullanıcı kodu girer → aynı endpoint kodu doğrular, admin’e ve kullanıcıya bilgi e-postası gönderir, talebi dosyaya kaydeder.  
3. Admin panelinde “Kayıt Talepleri” listelenir.  
4. Admin onaylarsa React tarafı yeni kullanıcı + izin + kişi kaydı oluşturur; PHP tarafındaki kayıt silinir.

---

## 3. Dizinyapısı

```
.
├── components/               # UI bileşenleri
│   ├── LoginPage.tsx         # Yeni kullanıcı kayıt süreci ve doğrulama ekranı
│   ├── tabs/                 # Dashboard sekmeleri
│   └── ...
├── context/
│   ├── AuthContext.tsx       # JWT oturumu yöneten context
│   └── ThemeContext.tsx      # Tema context'i
├── data/                     # Demo/mock veriler
├── public/
│   ├── api/
│   │   ├── signup/
│   │   │   ├── common.php    # PHP yardımcı fonksiyonlar (kod üretme, saklama)
│   │   │   ├── index.php     # Kod gönderme + talep oluşturma API’si
│   │   │   └── requests.php  # Bekleyen talepleri listeleme/silme API’si
│   │   └── vendor/PHPMailer/ # PHPMailer kaynak dosyaları
│   └── i18n/                 # Build-time dil dosyaları
├── server/
│   ├── auth/                 # Login/logout router'ı ve JWT yardımcıları
│   ├── data/users.json       # Dev ortamındaki admin kullanıcılar
│   ├── services/userService.js
│   └── index.js              # Geliştirme sırasında çalışan Express API
├── services/signupService.ts # Frontend tarafı fetch yardımcıları
├── types.ts                  # TypeScript tipleri
├── index.html                # Vite giriş noktası (tema ayarlarıyla birlikte)
└── README.md                 # Bu belge
```

---

## 4. Ortam Değişkenleri

| Değişken | Açıklama | Dev | Prod |
|----------|----------|-----|------|
| `GEMINI_API_KEY` | Chatbot için Google Gemini anahtarı | ✓ | ✓ |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Doğrulama e-postaları için SMTP bilgileri | ✓ | ✓ |
| `SMTP_SECURE` | `true` (TLS/SSL) veya `false` | ✓ | ✓ |
| `MAIL_FROM` | Gönderici adı/mail, ör: `Dripfy <dripfy@hasiripi.com>` | ✓ | ✓ |
| `SIGNUP_NOTIFY_TO` | Admin bildirimi alacak adres | ✓ | ✓ |
| `SEND_WELCOME_EMAIL` | Kullanıcıya hoş geldin maili gönderilsin mi? (`true/false`) | ✓ | ✓ |
| `API_PORT` | Express dev sunucusunun portu (varsayılan `4000`) | ✓ | – |
| `CORS_ORIGINS` | Dev API’ye izinli origin listesi | ✓ | – |
| `SIGNUP_CODE_TTL` | Kod geçerliliği (ms cinsinden) – opsiyonel | ✓ | ✓ |
| `VITE_API_BASE` | Frontend fetch istekleri için Express taban URL’si (`http://localhost:4000`) | ✓ | – |
| `JWT_SECRET` | Login sırasında imzalanan JWT anahtarı | ✓ | – |
| `JWT_EXPIRES_IN` | Token süresi (örn. `15m`) | ✓ | – |
| `AUTH_COOKIE_NAME` | HttpOnly oturum çerezi adı (varsayılan `dripfy_admin_token`) | ✓ | – |
| `JWT_COOKIE_MAX_AGE` | Çerez ömrü (`s`, `m`, `h`, `d` veya saniye) | ✓ | – |

> Üretimde PHP scriptleri `.env` dosyasını okumaz; SMTP bilgilerini PHP dosyalarındaki `sendSignupEmail` fonksiyonunda güncellemeniz yeterlidir. Hosting ortamında `public/api/runtime/` dizininin yazma iznine sahip olduğundan emin olun.

### Güvenlik ve rotasyon

- **SMTP şifresi / servis hesabı**: Paylaşımlı hesap bilgilerini düzenli aralıklarla yenileyin ve `.env` ile `public/api/signup/common.php` içindeki değerleri güncelleyin. Eski şifreleri saklamayın.
- **JWT/AUTH gizli anahtarları**: `JWT_SECRET` ve `AUTH_SECRET` değişkenlerini en az 32 karakterlik rastgele dizelerle doldurun. Ekip değişikliklerinde bu değerleri döndürüp yeniden deploy edin.
- **Runtime dosyaları**: PHP tarafı güncel parolaları `public/api/runtime/auth_users.json` içine yazar. Şifre döndürdükten sonra bu dosyanın yalnızca yeni hash'i içerdiğinden emin olun veya backup'tan temizleyin.

### `.env` oluşturma
```bash
cp .env.example .env
# Geliştirme sırasında Vite’ın Express API’yi kullanması için:
cp .env.example .env.development
```

---

## 5. Geliştirme Adımları

1. `npm run dev:full` komutu hem Vite’ı hem Express API’yi paralel çalıştırır. Dilerseniz ayrı ayrı `npm run server` ve `npm run dev` komutlarını da kullanabilirsiniz.
2. Signup kodları gerçek SMTP üzerinden gönderilir. Test ortamında mail erişiminiz yoksa `.env` içinde SMTP bilgilerinizi geçici olarak sahte SMTP (Mailtrap vb.) ile değiştirebilirsiniz.
3. Yönetici oturumu için `/api/auth/login` endpoint’ini kullanın. Varsayılan admin hesabı `server/data/users.json` dosyasında tanımlıdır ve parolası `ChangeMe123!` değerinin bcrypt hash’i olarak saklanır. Farklı bir parola oluşturmak için `node -e "import('bcrypt').then(async b => console.log(await b.hash('YeniSifre', 10)))"` komutuyla yeni hash üretip dosyayı güncelleyin.

---

## 6. Deployment (Paylaşımlı Hosting / FTP)

1. **Build**: `npm run build`  
   Vite, üretim dosyalarını `dist/` altına oluşturur.
2. **`dist/` klasörünü yükleyin**:  
   - PHP scriptleri `public/api/signup/*` klasörleriyle birlikte gelir; FTP ile olduğu gibi yüklenmelidir.  
   - `public/api/runtime/` içinde yalnızca `.htaccess` yer alır; dosya yazma izinlerini (ör. `755`) kontrol edin.
3. **Güncel dist’i yayınlamak için** `scripts/ftp_upload.py` kullanabilirsiniz:
   ```bash
   FTP_HOST=ftp.hasiripi.com \
   FTP_USER=siteadmin@hasiripi.com \
   FTP_PASS=*** \
   python3 scripts/ftp_upload.py --local dist --remote / --passive
   ```
4. Barındırıcı PHP sürümünün 8+ olduğundan ve `mail.hasiripi.com` SMTP erişimine izin verdiğinden emin olun.

---

## 7. Admin & Kullanıcı İş Akışı

0. **Admin giriş yapar** → `/api/auth/login` endpoint’i JWT üretir ve HttpOnly çerez/Authorization başlığı ile oturumu doğrular.
1. **Kullanıcı kayıt formunu doldurur** → `Dripfy doğrulama kodunuz` başlıklı e-posta gelir.
2. **Kod doğrulanır** → Admin adresine (ör. `dripfy@hasiripi.com`) talep özeti, kullanıcıya “kaydınız alındı” e-postası gönderilir.
3. **Admin panelinde “Kayıt Talepleri” sekmesi** → tüm bekleyen talepler listelenir.
4. Onay → kullanıcı + izin + kişi kaydı oluşturulur ve talep listeden kaldırılır.  
   Red → talep silinir, audit log’a “Denied” kaydı eklenir.

---

## 8. Scriptler & NPM Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Vite geliştirme sunucusu |
| `npm run server` | Express SMTP proxy (yalnızca dev) |
| `npm run dev:full` | Her ikisini aynı anda çalıştırır |
| `npm run build` | Üretim build’i (`dist/`) |
| `npm run preview` | Build edilmiş uygulamayı yerelde çalıştırır |

Python scriptleri:
- `scripts/ftp_upload.py` – dist klasörünü FTP’ye yükler (`--help` ile seçenekleri görebilirsiniz).

---

## 9. Sorun Giderme

- **Kod e-postası gelmiyor**:  
  - SMTP şifresini kontrol edin (`public/api/signup/common.php` → `sendSignupEmail` fonksiyonundaki bilgiler).  
  - Hosting’inizin 465 portunu engellemediğinden emin olun.  
  - `public/api/runtime/signup_codes.json` dosyasının yazılabildiğini kontrol edin.
- **Kayıt talebi admin panelinde görünmüyor**:  
  - `public/api/signup/index.php` doğrulama adımı, talebi `signup_requests.json` içine kaydeder. Bu dosya bozuksa silebilir, API’nin yeniden oluşturmasına izin verebilirsiniz.  
  - Admin paneli açıldığında `fetchSignupRequests()` çağrısı yapılır; önce `/api/auth/login` ile oturum açtığınızdan ve isteklerin `Authorization` başlığı/çerezi taşıdığından emin olun.
- **Safari’de beyaz şeritler**: `index.html` içindeki tema ayarları safe-area’ları yönetir; farklı cihazlarda sorun görürseniz `meta theme-color` değerlerini kontrol edin.

---

## 10. Katkıda Bulunma & Kod Stili

- React bileşenlerinde mümkün olduğunca fonksiyonları `useCallback` ile sarmalayın ve TypeScript tiplerini güncel tutun.
- Yeni backend fonksiyonları eklerken PHP ve Express tarafındaki davranışın eşleşmesine dikkat edin.
- `npm run build` komutunu çalıştırıp hata olmadığını doğrulamadan deployment yapmayın.

## 11. Dokümantasyon ve Referanslar

- `docs/email-branding.md` – E-posta şablon renkleri, yardımcı fonksiyonlar ve HTML/Text sürümlerini güncelleme adımları.
- `docs/testing.md` – Kayıt ve hata yönetimi için manuel test senaryoları.
- `public/api/signup/common.php` ve `public/api/auth/common.php` – Üretimde kullanılan PHP yardımcıları; Express (`server/index.js`) ile uyumlu tutulmalıdır.
- `scripts/ftp_upload.py --help` – FTP dağıtım sürecini otomasyonla yapmak için kullanılabilir.

---

Bu dokümantasyon, projenin bütünsel resmini yeni katılan bir geliştiriciye aktarmak ve eski metinlerden kalan kafa karışıklığını gidermek amacıyla hazırlanmıştır. Sorular için `dripfy@hasiripi.com` yönetici hesabını kullanabilirsiniz.
