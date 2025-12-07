<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/PHPMailer/Exception.php';
require_once __DIR__ . '/../vendor/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/PHPMailer/SMTP.php';

/**
 * Basit admin kimlik doğrulama yardımcıları.
 * PHP tarafı paylaşımlı hosting üzerinde çalıştığından dolayı
 * JWT üretimi için minimal bir HMAC imzalı token kullanıyoruz.
 */

const AUTH_DEFAULT_COOKIE = 'dripfy_admin_token';

const AUTH_DEFAULT_EXPIRY = '15m';
const AUTH_RUNTIME_DIR = __DIR__ . '/../runtime';
const AUTH_USERS_FILE = AUTH_RUNTIME_DIR . '/auth_users.json';
const PASSWORD_RESET_FILE = AUTH_RUNTIME_DIR . '/password_resets.json';
const PASSWORD_RESET_TTL = 900; // 15 minutes

/**
 * Varsayılan admin kullanıcı listesi.
 */
function getDefaultAuthUsers(): array
{
    return [
        [
            'id' => 'admin-1',
            'email' => 'dripfy@hasiripi.com',
            'name' => 'Dripfy Admin',
            'role' => 'admin',
            'passwordHash' => '$2b$10$uuIEUBBcgU5LIO31tKZSoOShRrgIJHBoy//TmxIANJkl5K0Jip5Ky',
        ],
    ];
}

function getEnvValue(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $default;
    }
    return $value;
}

function parseDurationToSeconds(?string $value): int
{
    $value = $value !== null ? trim($value) : '';
    if ($value === '') {
        return 15 * 60;
    }
    if (ctype_digit($value)) {
        return (int)$value;
    }
    if (preg_match('/^(\d+)([smhd])$/i', $value, $matches) === 1) {
        $amount = (int)$matches[1];
        $unit = strtolower($matches[2]);
        switch ($unit) {
            case 's':
                return $amount;
            case 'm':
                return $amount * 60;
            case 'h':
                return $amount * 60 * 60;
            case 'd':
                return $amount * 60 * 60 * 24;
        }
    }
    return 15 * 60;
}

function base64urlEncode(string $input): string
{
    return rtrim(strtr(base64_encode($input), '+/', '-_'), '=');
}

function base64urlDecode(string $input): string
{
    $pad = strlen($input) % 4;
    if ($pad > 0) {
        $input .= str_repeat('=', 4 - $pad);
    }
    return base64_decode(strtr($input, '-_', '+/')) ?: '';
}

function getAuthSecret(): string
{
    $secret = getEnvValue('JWT_SECRET') ?? getEnvValue('AUTH_SECRET');
    if ($secret === null || $secret === '') {
        throw new \RuntimeException('Secure configuration error: JWT_SECRET or AUTH_SECRET environment variable is required.');
    }
    return $secret;
}

function ensureAuthRuntimeDir(): void
{
    if (!is_dir(AUTH_RUNTIME_DIR)) {
        mkdir(AUTH_RUNTIME_DIR, 0775, true);
    }
}

/**
 * Builds the shared transactional email shell so every security message shares
 * one consistent layout and palette.
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
                  Bu mesajı <a href="mailto:info@dripfy.de" style="color:#4ba586;text-decoration:none;">info@dripfy.de</a> üzerinden yanıtlayabilirsiniz.
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
 * Renders the verification code in a visually prominent block so the user can
 * spot it immediately even on small screens.
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
 * @return array<string, array>
 */
function loadRuntimeUsers(): array
{
    ensureAuthRuntimeDir();
    if (!file_exists(AUTH_USERS_FILE)) {
        return [];
    }

    $contents = file_get_contents(AUTH_USERS_FILE);
    if ($contents === false) {
        return [];
    }

    $data = json_decode($contents, true);
    if (!is_array($data)) {
        return [];
    }

    $normalised = [];
    foreach ($data as $entry) {
        if (!is_array($entry) || empty($entry['email'])) {
            continue;
        }
        $email = strtolower(trim((string)$entry['email']));
        if ($email === '') {
            continue;
        }
        $normalised[$email] = $entry;
    }

    return $normalised;
}

/**
 * @param array<string, array> $users
 */
function saveRuntimeUsers(array $users): void
{
    ensureAuthRuntimeDir();
    file_put_contents(
        AUTH_USERS_FILE,
        json_encode(array_values($users), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

/**
 * @return array<int, array>
 */
function getAuthUsers(): array
{
    $defaults = [];
    foreach (getDefaultAuthUsers() as $defaultUser) {
        $email = strtolower(trim($defaultUser['email'] ?? ''));
        if ($email === '') {
            continue;
        }
        $defaults[$email] = $defaultUser;
    }

    $overrides = loadRuntimeUsers();
    $merged = $defaults;

    foreach ($overrides as $email => $user) {
        $merged[$email] = array_merge(
            $merged[$email] ?? [],
            $user
        );
    }

    return array_values($merged);
}

function findAuthUserByEmail(string $email): ?array
{
    $normalised = strtolower(trim($email));
    if ($normalised === '') {
        return null;
    }

    $overrides = loadRuntimeUsers();
    if (isset($overrides[$normalised])) {
        return $overrides[$normalised];
    }

    foreach (getDefaultAuthUsers() as $user) {
        if (strtolower(trim($user['email'] ?? '')) === $normalised) {
            return $user;
        }
    }
    return null;
}

function updateAuthUserPassword(string $email, string $passwordHash): bool
{
    $normalised = strtolower(trim($email));
    if ($normalised === '') {
        return false;
    }

    $users = loadRuntimeUsers();
    if (!isset($users[$normalised])) {
        $baseUser = findAuthUserByEmail($email);
        if ($baseUser === null) {
            return false;
        }
        $users[$normalised] = $baseUser;
    }

    $users[$normalised]['passwordHash'] = $passwordHash;
    saveRuntimeUsers($users);
    return true;
}

/**
 * @return array<string, array>
 */
function loadPasswordResetStore(): array
{
    ensureAuthRuntimeDir();
    if (!file_exists(PASSWORD_RESET_FILE)) {
        return [];
    }
    $raw = file_get_contents(PASSWORD_RESET_FILE);
    if ($raw === false) {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return [];
    }

    $now = time();
    $cleaned = [];
    foreach ($data as $entry) {
        if (!is_array($entry) || empty($entry['email']) || empty($entry['code'])) {
            continue;
        }
        $email = strtolower(trim((string)$entry['email']));
        if ($email === '') {
            continue;
        }
        $expires = isset($entry['expires']) ? (int)$entry['expires'] : 0;
        if ($expires < $now) {
            continue;
        }
        $cleaned[$email] = [
            'email' => $email,
            'code' => (string)$entry['code'],
            'expires' => $expires,
        ];
    }

    if (count($cleaned) !== count($data)) {
        savePasswordResetStore($cleaned);
    }

    return $cleaned;
}

/**
 * @param array<string, array> $store
 */
function savePasswordResetStore(array $store): void
{
    ensureAuthRuntimeDir();
    file_put_contents(
        PASSWORD_RESET_FILE,
        json_encode(array_values($store), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function generateResetCode(): string
{
    return (string)random_int(100000, 999999);
}

function createPasswordResetRecord(string $email): ?string
{
    $normalised = strtolower(trim($email));
    if ($normalised === '') {
        return null;
    }
    $store = loadPasswordResetStore();
    $code = generateResetCode();
    $store[$normalised] = [
        'email' => $normalised,
        'code' => $code,
        'expires' => time() + PASSWORD_RESET_TTL,
    ];
    savePasswordResetStore($store);
    return $code;
}

function validatePasswordResetCode(string $email, string $code): bool
{
    $normalised = strtolower(trim($email));
    if ($normalised === '') {
        return false;
    }
    $store = loadPasswordResetStore();
    if (!isset($store[$normalised])) {
        return false;
    }
    $record = $store[$normalised];
    if (($record['code'] ?? '') !== trim($code)) {
        return false;
    }
    if (($record['expires'] ?? 0) < time()) {
        unset($store[$normalised]);
        savePasswordResetStore($store);
        return false;
    }
    return true;
}

function consumePasswordResetCode(string $email): void
{
    $normalised = strtolower(trim($email));
    if ($normalised === '') {
        return;
    }
    $store = loadPasswordResetStore();
    if (isset($store[$normalised])) {
        unset($store[$normalised]);
        savePasswordResetStore($store);
    }
}

function createMailer(): PHPMailer
{
    $mailer = new PHPMailer(true);
    $mailer->isSMTP();
    $mailer->Host = getEnvValue('SMTP_HOST', '');
    $mailer->Port = (int)getEnvValue('SMTP_PORT', '465');
    $mailer->SMTPAuth = true;
    $mailer->Username = getEnvValue('SMTP_USER', '');
    $mailer->Password = getEnvValue('SMTP_PASS', '');
    $mailer->SMTPSecure = getEnvValue('SMTP_SECURE', 'true') === 'false' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
    $mailer->CharSet = 'UTF-8';
    $mailer->setFrom(getEnvValue('MAIL_FROM', getEnvValue('SMTP_USER', 'no-reply@hasiripi.com')));
    return $mailer;
}

function sendPasswordResetEmail(string $email, string $name, string $code): array
{
    $fromEmail = null;
    $fromName = null;
    try {
        $mailer = createMailer();
        $mailer->clearAllRecipients();
        $mailer->addAddress($email, $name ?: $email);
        $mailer->Subject = 'Dripfy Yönetim Paneli | Şifre Yenileme Kodunuz';
        $ttlMinutes = (int)ceil(PASSWORD_RESET_TTL / 60);
        $html = buildEmailTemplate(
            'Şifre yenileme kodunuz',
            'Dripfy Yönetim Paneli parolanızı güvenle yenilemeniz için doğrulama kodunuz aşağıdadır.',
            buildCodeBlock($code) .
                '<p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#2f4a3b;">Kod ' . $ttlMinutes . ' dakika boyunca geçerlidir. Talep size ait değilse bu mesajı yok sayabilir veya bizimle iletişime geçebilirsiniz.</p>' .
                '<a href="https://hasiripi.com" style="display:inline-block;padding:14px 28px;border-radius:16px;background:linear-gradient(135deg,#4ba586,#84a084);color:#0b1612;font-weight:600;text-decoration:none;font-size:14px;">Panelde Parolamı Yenile</a>',
            'Destek için her zaman <a href="mailto:info@dripfy.de" style="color:#4ba586;text-decoration:none;">info@dripfy.de</a> adresine yazabilirsiniz.'
        );

        $text = "Merhaba {$name},\n\nDripfy Yönetim Paneli parolanızı sıfırlamak için kodunuz: {$code}\nKod {$ttlMinutes} dakika boyunca geçerlidir. Talep size ait değilse bu mesajı göz ardı edebilir veya info@dripfy.de adresinden bize ulaşabilirsiniz.\n\nSaygılarımızla,\nDripfy Güvenlik Ekibi";

        $mailer->Body = $html;
        $mailer->AltBody = $text;
        $mailer->isHTML(true);
        $fromEmail = $mailer->From;
        $fromName = $mailer->FromName;
        $mailer->send();
        return ['ok' => true, 'error' => null];
    } catch (Exception $ex) {
        $message = '[auth] Password reset email could not be sent: ' . $ex->getMessage();
        error_log($message);
        // Fallback to PHP mail() so users still receive reset code if SMTP is blocked.
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
            $text . "\r\n" .
            "--{$boundary}\r\n" .
            "Content-Type: text/html; charset=UTF-8\r\n\r\n" .
            $html . "\r\n" .
            "--{$boundary}--";

        if (mail($email, 'Dripfy Yönetim Paneli | Şifre Yenileme Kodunuz', $body, implode("\r\n", $headers))) {
            return ['ok' => true, 'error' => null, 'fallback' => 'mail'];
        }
        return ['ok' => false, 'error' => $ex->getMessage()];
    }
}

function getAuthCookieName(): string
{
    return getEnvValue('AUTH_COOKIE_NAME', AUTH_DEFAULT_COOKIE) ?? AUTH_DEFAULT_COOKIE;
}

function getAuthExpirySeconds(): int
{
    $tokenTtl = parseDurationToSeconds(getEnvValue('JWT_EXPIRES_IN', AUTH_DEFAULT_EXPIRY));
    $cookieTtl = parseDurationToSeconds(getEnvValue('JWT_COOKIE_MAX_AGE', (string)$tokenTtl));
    return max($tokenTtl, $cookieTtl);
}

function generateToken(array $user): string
{
    $secret = getAuthSecret();
    $now = time();
    $expires = $now + getAuthExpirySeconds();

    $headerJson = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payloadJson = json_encode([
        'sub' => $user['id'],
        'email' => $user['email'],
        'role' => $user['role'],
        'name' => $user['name'],
        'iat' => $now,
        'exp' => $expires,
    ]);

    if ($headerJson === false || $payloadJson === false) {
        throw new \RuntimeException('Failed to encode token payload');
    }

    $header = base64urlEncode($headerJson);
    $payload = base64urlEncode($payloadJson);

    $signature = hash_hmac('sha256', $header . '.' . $payload, $secret, true);
    return $header . '.' . $payload . '.' . base64urlEncode($signature);
}

function mapUserToPublic(array $user): array
{
    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'],
        'lastLogin' => date(DATE_ATOM),
    ];
}

function sendJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
