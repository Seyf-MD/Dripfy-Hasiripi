<?php
declare(strict_types=1);

/**
 * Ortak yardımcı fonksiyonlar: doğrulama kodlarının üretilmesi, saklanması ve e-posta ile gönderilmesi.
 * PHP tarafı tek bir dosya sistemi üzerinde çalıştığı için kalıcı veri ihtiyacı
 * JSON dosyalarıyla çözüldü. Her fonksiyon statik hosting senaryosuna uygun olacak
 * şekilde yan etkilerini yalnızca `public/api/runtime` klasörü altına yazar.
 */

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
function buildEmailTemplate(string $title, string $intro, string $contentHtml, ?string $footerNote = null): string
{
    $footerBlock = '';
    if ($footerNote !== null && $footerNote !== '') {
        $footerBlock = '<p style="margin:24px 0 0;font-size:12px;line-height:18px;color:rgba(47,74,59,0.7);">' . $footerNote . '</p>';
    }

    $currentYear = date('Y');

    return <<<HTML
<!DOCTYPE html>
<html lang="tr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dripfy MIS</title>
  </head>
  <body style="margin:0;padding:0;background-color:#edf6ed;font-family:'Montserrat','Segoe UI',sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#edf6ed;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;border-radius:28px;overflow:hidden;background-color:#faf9f6;border:1px solid #c8d9b9;box-shadow:0 22px 60px rgba(200,217,185,0.45);">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#4ba586 0%,#84a084 70%,#94a073 100%);">
                <table role="presentation" width="100%">
                  <tr>
                    <td align="left">
                      <span style="display:inline-block;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(245,250,244,0.9);font-weight:600;">Dripfy MIS</span>
                    </td>
                    <td align="right">
                      <img src="https://hasiripi.com/assets/logo-wordmark.png" alt="Dripfy" style="height:32px;border:0;">
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px 42px;color:#1e332a;">
                <h1 style="margin:0 0 12px;font-size:26px;color:#1e332a;line-height:32px;">{$title}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:24px;color:rgba(47,74,59,0.85);">{$intro}</p>
                {$contentHtml}
                {$footerBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f3f9f3;border-top:1px solid #c8d9b9;">
                <p style="margin:0;font-size:12px;line-height:18px;color:rgba(47,74,59,0.7);">
                  © {$currentYear} Dripfy MIS. Tüm hakları saklıdır.<br>
                  Bu mesajı <a href="mailto:dripfy@hasiripi.com" style="color:#4ba586;text-decoration:none;">dripfy@hasiripi.com</a> üzerinden yanıtlayabilirsiniz.
                </p>
              </td>
            </tr>
          </table>
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
