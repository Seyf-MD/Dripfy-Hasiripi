<?php
declare(strict_types=1);

/**
 * Ortak yardımcı fonksiyonlar: doğrulama kodlarının üretilmesi, saklanması ve e-posta ile gönderilmesi.
 * PHP tarafı tek bir dosya sistemi üzerinde çalıştığı için kalıcı veri ihtiyacı
 * JSON dosyalarıyla çözüldü. Her fonksiyon statik hosting senaryosuna uygun olacak
 * şekilde yan etkilerini yalnızca `public/api/runtime` klasörü altına yazar.
 */

// PRODUCTION CONFIGURATION
if (!getenv('SMTP_HOST')) putenv('SMTP_HOST=mail.hasiripi.com');
if (!getenv('SMTP_USER')) putenv('SMTP_USER=dripfy@hasiripi.com');
if (!getenv('SMTP_PASS')) putenv('SMTP_PASS=7nT*VXH-eq,U');
if (!getenv('SMTP_SECURE')) putenv('SMTP_SECURE=true');
if (!getenv('SMTP_PORT')) putenv('SMTP_PORT=465');
if (!getenv('MAIL_FROM')) putenv('MAIL_FROM=dripfy@hasiripi.com');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/PHPMailer/Exception.php';
require_once __DIR__ . '/../vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/PHPMailer/SMTP.php';

const SIGNUP_RUNTIME_DIR = __DIR__ . '/../runtime';
const SIGNUP_STORE_FILE = SIGNUP_RUNTIME_DIR . '/signup_codes.json';
const SIGNUP_CODE_TTL = 600; // seconds
const SIGNUP_REQUESTS_FILE = SIGNUP_RUNTIME_DIR . '/signup_requests.json';

function getEnvValue(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

function resolveMailerSetting(string $key, string $default): string
{
    $value = getEnvValue($key, '');
    if ($value === null || $value === '' || $value === false) {
        return $default;
    }
    return $value;
}

/**
 * Builds the shared transactional email shell so signup and reset messages
 * look identical in every mail client.
 *
 * @param string      $title       Heading rendered at the top of the card.
 * @param string      $intro       Lead paragraph below the heading.
 * @param string      $contentHtml Pre-rendered HTML body (code block, tables).
 * @param string|null $footerNote  Optional helper text shown under the body.
 */
function buildEmailTemplate(string $title, string $intro, string $contentHtml, ?string $footerNote = null, string $theme = 'light'): string
{
    // Theme configurations
    $isDark = ($theme === 'dark');

    // Colors
    $bodyBg = $isDark ? '#0f172a' : '#edf6ed';
    $tableBg = $isDark ? '#020408' : '#edf6ed';
    $containerBg = $isDark ? 'rgba(255,255,255,0.03)' : '#faf9f6';
    $containerBorder = $isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #c8d9b9';
    $containerShadow = $isDark ? '0 25px 50px -12px rgba(0,0,0,0.5)' : '0 22px 60px rgba(200,217,185,0.45)';
    $mainText = $isDark ? '#ffffff' : '#1e332a';
    $subText = $isDark ? '#cbd5e1' : 'rgba(47,74,59,0.85)';
    $contentBoxBg = $isDark ? 'rgba(255,255,255,0.05)' : '#f3f9f3';
    $contentBoxBorder = $isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #c8d9b9';
    $footerBg = $isDark ? 'rgba(0,0,0,0.2)' : '#f3f9f3';
    $footerText = $isDark ? 'rgba(255,255,255,0.4)' : 'rgba(47,74,59,0.7)';
    $footerLink = $isDark ? 'rgba(255,255,255,0.5)' : '#4ba586';

    $footerBlock = '';
    if ($footerNote !== null && $footerNote !== '') {
        $footerBlock = '<p style="margin:24px 0 0;font-size:12px;line-height:18px;color:' . $footerText . ';">' . $footerNote . '</p>';
    }

    $currentYear = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dripfy</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');
    </style>
  </head>
  <body style="margin:0;padding:0;background-color:{$bodyBg};font-family:'Outfit','Helvetica Neue','Segoe UI',sans-serif;color:{$mainText};">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:{$tableBg};padding:40px 10px;">
      <tr>
        <td align="center">
          <!-- Glass Container -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;border-radius:32px;overflow:hidden;background-color:{$containerBg};border:{$containerBorder};box-shadow:{$containerShadow};backdrop-filter:blur(20px);">
            
            <!-- Header with Gradient Line -->
            <tr>
              <td style="padding:0;">
                <div style="height:4px;width:100%;background:linear-gradient(90deg, #4ba586, #84a084);"></div>
              </td>
            </tr>

            <!-- Logo Area -->
            <tr>
              <td style="padding:40px 40px 20px;text-align:center;">
                 <img src="https://hasiripi.com/assets/logo-wordmark.png" alt="Dripfy" style="height:40px;border:0;display:block;margin:0 auto;">
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td style="padding:10px 40px 40px;color:{$subText};text-align:left;">
                <h1 style="margin:0 0 16px;font-size:28px;font-weight:600;color:{$mainText};text-align:center;letter-spacing:-0.02em;">{$title}</h1>
                <p style="margin:0 0 32px;font-size:16px;line-height:26px;color:{$subText};text-align:center;font-weight:300;">{$intro}</p>
                
                <!-- Content Box -->
                <div style="background-color:{$contentBoxBg};border-radius:24px;padding:32px;border:{$contentBoxBorder};">
                    {$contentHtml}
                </div>

                <div style="text-align:center;">
                    {$footerBlock}
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:32px 40px;background-color:{$footerBg};border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
                <p style="margin:0 0 12px;font-size:12px;line-height:18px;color:{$footerText};">
                  © {$currentYear} Dripfy Inc. Tüm hakları saklıdır.
                </p>
                <div style="font-size:12px;color:rgba(255,255,255,0.3);">
                  <a href="https://hasiripi.com" style="color:{$footerLink};text-decoration:none;margin:0 8px;">Web Sitesi</a> •
                  <a href="mailto:info@dripfy.de" style="color:{$footerLink};text-decoration:none;margin:0 8px;">Destek</a> •
                  <a href="#" style="color:{$footerLink};text-decoration:none;margin:0 8px;">Gizlilik</a>
                </div>
              </td>
            </tr>
          </table>
          
          <p style="margin-top:24px;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;">
            Bu e-posta otomatik olarak oluşturulmuştur, lütfen yanıtlamayınız.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
HTML;
}

/**
 * Produces a two column key/value table for mail summaries and hides
 * attributes with empty values so we do not end up with blank rows.
 */
function buildKeyValueList(array $items): string
{
    if (empty($items)) {
        return '';
    }
    $rows = '';
    foreach ($items as $label => $value) {
        $safeLabel = htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $safeValue = htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $rows .= <<<HTML
        <tr>
        <td style="padding:10px 14px;font-size:13px;color:rgba(47,74,59,0.8);background:#f3f9f3;border-radius:14px 0 0 14px;border:1px solid #c8d9b9;border-right:0;">{$safeLabel}</td>
        <td style="padding:10px 14px;font-size:13px;color:#1e332a;background:#edf6ed;border-radius:0 14px 14px 0;border:1px solid #c8d9b9;border-left:0;">{$safeValue}</td>
        </tr>
HTML;
    }

    return <<<HTML
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-spacing:0 8px;margin:0 0 12px;">
      {$rows}
    </table>
HTML;
}

/**
 * Renders the 6-digit verification code in a visually prominent block.
 */
function buildCodeBlock(string $code): string
{
    $safeCode = htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    return <<<HTML
    <div style="margin:0 0 24px;">
      <div style="display:inline-block;padding:18px 28px;border-radius:18px;background:linear-gradient(135deg,rgba(75,165,134,0.12),rgba(148,174,161,0.08));border:1px solid #c8d9b9;">
        <span style="font-size:28px;letter-spacing:0.4em;color:#1e332a;font-weight:600;">{$safeCode}</span>
      </div>
    </div>
HTML;
}

/**
 * `public/api/runtime` klasörünü oluşturur. Hosting ilk yüklendiğinde mevcut olmayabilir.
 */
function ensureRuntimeDirectory(): void
{
    if (!is_dir(SIGNUP_RUNTIME_DIR)) {
        mkdir(SIGNUP_RUNTIME_DIR, 0775, true);
    }
}

/**
 * Kod doğrulama saklama dosyasını okur ve süresi dolmuş girişleri temizler.
 */
function loadSignupStore(): array
{
    ensureRuntimeDirectory();

    if (!file_exists(SIGNUP_STORE_FILE)) {
        return [];
    }

    $contents = file_get_contents(SIGNUP_STORE_FILE);
    if ($contents === false) {
        return [];
    }

    $data = json_decode($contents, true);
    if (!is_array($data)) {
        return [];
    }

    $now = time();
    $filtered = [];
    foreach ($data as $email => $entry) {
        if (!is_array($entry)) {
            continue;
        }
        if (!isset($entry['expires']) || (int)$entry['expires'] < $now) {
            continue;
        }
        $filtered[$email] = $entry;
    }

    if (count($filtered) !== count($data)) {
        saveSignupStore($filtered);
    }

    return $filtered;
}

function saveSignupStore(array $store): void
{
    ensureRuntimeDirectory();
    file_put_contents(SIGNUP_STORE_FILE, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function loadSignupRequests(): array
{
    ensureRuntimeDirectory();
    if (!file_exists(SIGNUP_REQUESTS_FILE)) {
        return [];
    }

    $contents = file_get_contents(SIGNUP_REQUESTS_FILE);
    if ($contents === false) {
        return [];
    }

    $data = json_decode($contents, true);
    if (!is_array($data)) {
        return [];
    }

    usort($data, static function ($a, $b) {
        return ($b['timestamp'] ?? 0) <=> ($a['timestamp'] ?? 0);
    });

    return $data;
}

function saveSignupRequests(array $requests): void
{
    ensureRuntimeDirectory();
    file_put_contents(SIGNUP_REQUESTS_FILE, json_encode($requests, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/**
 * Formdan gelen ham veriyi normalize eder; trim, telefon rakam filtreleri vb.
 */
function normaliseSignupPayload(array $input): array
{
    $firstName = trim((string)($input['firstName'] ?? ''));
    $lastName = trim((string)($input['lastName'] ?? ''));
    $legacyName = trim((string)($input['name'] ?? ''));
    $name = trim($firstName . ' ' . $lastName);
    if ($name === '') {
        $name = $legacyName;
    }

    $email = trim((string)($input['email'] ?? ''));
    $countryCode = trim((string)($input['countryCode'] ?? ''));
    $country = trim((string)($input['country'] ?? ''));
    $phoneDigits = preg_replace('/[^0-9]/', '', (string)($input['phone'] ?? ''));
    $position = trim((string)($input['position'] ?? ''));
    $company = trim((string)($input['company'] ?? ''));

    return [
        'firstName' => $firstName,
        'lastName' => $lastName,
        'name' => $name,
        'email' => $email,
        'countryCode' => $countryCode,
        'country' => $country,
        'phoneDigits' => $phoneDigits,
        'position' => $position,
        'company' => $company,
    ];
}

/**
 * Kaydın minimum gereksinimlerini kontrol eder. Hata mesajı döner veya `null`.
 */
function validateSignupPayload(array $payload, bool $requireNames = true): ?string
{
    $name = $payload['name'] ?? '';
    $firstName = $payload['firstName'] ?? '';

    if ($requireNames) {
        if (($firstName === '' || mb_strlen($firstName) < 2) && ($name === '' || mb_strlen($name) < 2)) {
            return 'İsim eksik veya çok kısa';
        }
    } elseif ($name === '' || mb_strlen($name) < 2) {
        return 'İsim eksik veya çok kısa';
    }

    $email = $payload['email'] ?? '';
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 'Geçersiz e-posta adresi';
    }

    $phoneDigits = $payload['phoneDigits'] ?? '';
    if ($phoneDigits === '' || mb_strlen($phoneDigits) < 6) {
        return 'Telefon numarası eksik veya çok kısa';
    }

    $position = $payload['position'] ?? '';
    if ($position === '') {
        return 'Pozisyon seçimi gerekli';
    }

    $countryCode = $payload['countryCode'] ?? '';
    if ($countryCode === '') {
        return 'Ülke kodu gerekli';
    }

    return null;
}

/**
 * Ülke kodu ve numarayı son kullanıcıya gösterilecek formata çevirir.
 */
function formatPhone(array $payload): string
{
    $countryCode = $payload['countryCode'] ?? '';
    $phoneDigits = $payload['phoneDigits'] ?? '';
    return trim(($countryCode !== '' ? $countryCode . ' ' : '') . $phoneDigits);
}

/**
 * Admin ve kullanıcı e-postalarında kullanılan bilgi satırlarını üretir.
 */
function buildInfoLines(array $payload): array
{
    $lines = [
        'İsim: ' . ($payload['name'] ?? ''),
        'E-posta: ' . ($payload['email'] ?? ''),
        'Telefon: ' . formatPhone($payload),
        'Pozisyon: ' . ($payload['position'] ?? ''),
    ];

    if (!empty($payload['company'])) {
        $lines[] = 'Firma: ' . $payload['company'];
    }

    if (!empty($payload['country'])) {
        $lines[] = 'Ülke: ' . $payload['country'];
    }

    return $lines;
}

/**
 * PHPMailer üzerinden TLS/465 SMTP gönderimi yapar.
 */
function sendSignupEmail(string $recipient, string $subject, string $textBody, string $htmlBody): bool
{
    $mailer = new PHPMailer(true);
    $fromEmail = null;
    $fromName = null;

    try {
        $mailer->isSMTP();
        $mailer->Host = resolveMailerSetting('SMTP_HOST', 'mail.hasiripi.com');
        $mailer->Port = (int)resolveMailerSetting('SMTP_PORT', '465');

        $username = resolveMailerSetting('SMTP_USER', 'dripfy@hasiripi.com');
        $password = resolveMailerSetting('SMTP_PASS', '7nT*VXH-eq,U');
        if ($username !== '') {
            $mailer->SMTPAuth = true;
            $mailer->Username = $username;
            $mailer->Password = $password;
        } else {
            $mailer->SMTPAuth = false;
        }

        $secure = strtolower(resolveMailerSetting('SMTP_SECURE', 'ssl'));
        if (in_array($secure, ['false', 'none', '0'], true)) {
            $mailer->SMTPAutoTLS = false;
            $mailer->SMTPSecure = false;
        } elseif (in_array($secure, ['tls', 'starttls'], true)) {
            $mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        }

        $mailer->CharSet = 'UTF-8';
        $mailer->Encoding = 'base64';

        $mailFrom = resolveMailerSetting('MAIL_FROM', $username ?: 'no-reply@hasiripi.com');
        $fromEmail = $mailFrom;
        $fromName = 'Dripfy';
        if (preg_match('/^(.*)<(.+)>$/', $mailFrom, $matches)) {
            $fromName = trim($matches[1], "\" '");
            $fromEmail = trim($matches[2]);
        }

        $mailer->setFrom($fromEmail, $fromName);
        $mailer->addReplyTo($fromEmail, $fromName);
        $mailer->addAddress($recipient);

        $mailer->isHTML(true);
        $mailer->Subject = $subject;
        $mailer->Body = $htmlBody;
        $mailer->AltBody = $textBody;

        $mailer->send();
        return true;
    } catch (Exception $e) {
        error_log('Signup mail PHPMailer error: ' . $e->getMessage());
        // Fallback to PHP's mail() with multipart/alternative for HTML + text.
        $fallbackFromEmail = $fromEmail ?: 'no-reply@hasiripi.com';
        $fallbackFromName = $fromName ?: 'Dripfy';
        $boundary = '=_DripfyMAIL_' . md5((string)microtime(true));
        $headers = [
            'From: ' . ($fallbackFromName ? "{$fallbackFromName} <{$fallbackFromEmail}>" : $fallbackFromEmail),
            'Reply-To: ' . $fallbackFromEmail,
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $body = "--{$boundary}\r\n" .
            "Content-Type: text/plain; charset=UTF-8\r\n\r\n" .
            $textBody . "\r\n" .
            "--{$boundary}\r\n" .
            "Content-Type: text/html; charset=UTF-8\r\n\r\n" .
            $htmlBody . "\r\n" .
            "--{$boundary}--";

        if (mail($recipient, $subject, $body, implode("\r\n", $headers))) {
            return true;
        }
        return false;
    }
}

function generateVerificationCode(): string
{
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function generateRequestId(): string
{
    return 'sr' . bin2hex(random_bytes(8));
}

function storeSignupRequest(array $payload): array
{
    $requests = loadSignupRequests();
    $request = [
        'id' => generateRequestId(),
        'name' => $payload['name'] ?? '',
        'firstName' => $payload['firstName'] ?? '',
        'lastName' => $payload['lastName'] ?? '',
        'email' => $payload['email'] ?? '',
        'phone' => formatPhone($payload),
        'countryCode' => $payload['countryCode'] ?? '',
        'country' => $payload['country'] ?? '',
        'company' => $payload['company'] ?? '',
        'position' => $payload['position'] ?? '',
        'status' => 'pending',
        'timestamp' => time(),
    ];

    $requests[] = $request;
    saveSignupRequests($requests);

    return $request;
}

function removeSignupRequest(string $id): bool
{
    $requests = loadSignupRequests();
    $filtered = array_filter($requests, static fn ($request) => ($request['id'] ?? '') !== $id);

    if (count($filtered) === count($requests)) {
        return false;
    }

    saveSignupRequests(array_values($filtered));
    return true;
}
