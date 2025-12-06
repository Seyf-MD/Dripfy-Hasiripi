# Dripfy MIS Dashboard (v2.0 - iOS 28 Redesign)

Dripfy yönetim paneli, modern bir MIS (Management Information System) uygulamasıdır. Bu versiyon (v2.0), **"iOS 28" konsepti** ile tamamen yeniden tasarlanmış, **Glassmorphism** (buzlu cam) efektleri, akıcı animasyonlar ve üst düzey kullanıcı deneyimi sunan bir arayüze sahiptir.

Arka planda çok dilli React/Vite mimarisi, Express (dev) ve PHP (prod) hibrid yapısı ile çalışır.

---

## 🌟 v2.0 Yenilikleri (iOS 28 Redesign)

Bu sürümde yapılan temel değişiklikler:

### 1. Görsel Tasarım ve UX
- **Ultra-Glassmorphism:** Tüm paneller, modallar ve kartlar iOS tarzı buzlu cam efektine sahiptir.
- **Akıcı Animasyonlar:** Sayfa geçişleri, modal açılışları ve hover efektleri özel CSS animasyonları (`animate-fade-in-up`, `ios-glass`) ile güçlendirildi.
- **Karanlık/Aydınlık Mod:** Sistem, tema seçimine göre dinamik olarak sınır renklerini (`border`) ve arka plan opaklıklarını ayarlar. (Örn: Light modda sınırlar belirginleşirken, Dark modda daha silikleşir).

### 2. Özel Bileşenler
- **iOS Date Picker:** Standart HTML tarih seçicisi yerine, hem manuel giriş (klavye) hem de görsel seçim (takvim) destekleyen, özel tasarlanmış bir tarih seçici geliştirildi. `GG Ay YYYY` formatında kullanıcı dostu gösterim yapar.
- **Sürükle-Bırak Takvim:** Haftalık takvim görünümünde etkinlikler günler arasında sürükle-bırak yöntemiyle taşınabilir.

### 3. Güvenlik İyileştirmeleri
- **.env Yapısı:** FTP şifreleri ve Admin bypass şifreleri kod içinden **tamamen temizlendi**. Artık sadece `.env` dosyasından okunuyor.
- **Güvenli Dağıtım:** `download_ftp.js` ve diğer scriptler artık kimlik bilgilerini environment değişkenlerinden alır.

---

## 🚀 Hızlı Başlangıç (Geliştiriciler İçin)

Projeyi ilk kez bilgisayarınıza indirdiyseniz aşağıdaki adımları izleyin:

### 1. Kurulum

```bash
git clone <repo-url>
cd Dripfy-Hasiripi-2
npm install
```

### 2. Ortam Değişkenleri (.env)

Kök dizinde `.env` dosyası oluşturun (veya `.env.example`'dan kopyalayın). Aşağıdaki değerler **zorunludur**:

```ini
# Chatbot için (Google Gemini)
GEMINI_API_KEY=AIzaSy...

# FTP Scriptleri için (Opsiyonel, deployment yapacaksanız gerekli)
FTP_HOST=ftp.ornek.com
FTP_USER=admin@ornek.com
FTP_PASSWORD=GizliSifre

# Local Geliştirme Admin Girişi (Dev Ortamı İçin)
VITE_ADMIN_EMAIL=admin@dripfy.com
VITE_ADMIN_PASSWORD=GucluBirSifre
```

### 3. Uygulamayı Çalıştırma

Geliştirme modunda hem Frontend (Vite) hem Backend (Express) sunucusunu aynı anda başlatmak için:

```bash
npm run dev:full
```
Tarayıcıda: `http://localhost:3000`

---

## 🏗 Proje Yapısı

Yeni gelenler için klasörlerin ne işe yaradığını basitçe açıklayalım:

- **`components/`**: Butonlar, modallar, giriş ekranı gibi tüm React parçaları burada.
    - `EditModal.tsx`: Veri düzenleme/ekleme penceresi. (iOS Date Picker burada tanımlıdır).
    - `tabs/`: Ana ekrandaki sekmelerin (Takvim, Finans, vb.) içerikleri.
- **`context/`**:
    - `AuthContext.tsx`: Giriş yapan kullanıcının bilgisini saklar. (Mock login mantığı buradadır).
    - `ThemeContext.tsx`: Dark/Light mod geçişini yönetir.
- **`i18n/`**: Çoklu dil alt yapısı.
    - `i18n/translations/tr.json`: Türkçe çeviriler. Yeni bir metin ekleyecekseniz buraya ve `en.json` dosyasına eklemelisiniz.
- **`public/api/`**: **Sadece Üretim (Production)** ortamında çalışan PHP kodları.
    - Sunucuya yüklendiğinde (FTP ile), bu PHP dosyaları çalışır.
    - Local geliştirme sırasında bu klasör **çalışmaz**, onun yerine `server/` klasöründeki Node.js API çalışır.
- **`server/`**: **Sadece Geliştirme (Development)** ortamında çalışan Node.js/Express API.

---

## ⚠️ Önemli Notlar

1. **Dil Dosyaları:**
   `t('schedule.title')` gibi bir kod görürseniz, bu metin `i18n/translations/tr.json` içinden geliyordur. Sabit metin yazmak yerine daima çeviri anahtarı kullanın.

2. **Takvim Mantığı:**
   Takvim verileri `App.tsx` içindeki `dashboardData` state'inde tutulur. Gerçek bir veritabanı yerine şimdilik tarayıcı belleğinde ve örnek JSON dosyalarında çalışır.

3. **Deploy (Canlıya Alma):**
   ```bash
   npm run build
   ```
   Bu komut `dist/` klasörünü oluşturur. Bu klasörün içindekileri FTP ile sunucunuza yükleyebilirsiniz.

---

## 🔧 Sık Karşılaşılan Sorunlar

- **"Admin girişi yapamıyorum":** `.env` dosyanızda `VITE_ADMIN_EMAIL` ve `VITE_ADMIN_PASSWORD` değerlerinin doğru ayarlandığından emin olun.
- **"Değişikliklerim yansımadı":** Tarayıcı önbelleğini temizleyin veya `npm run dev:full` komutunu durdurup tekrar başlatın.
- **"Takvim çizgileri görünmüyor":** Light modda çizgiler çok hafif gri, Dark modda beyazdır. `WeeklyScheduleTab.tsx` dosyasındaki `border-white/10` (Dark) ve `border-black/5` (Light) sınıflarını kontrol edin.
