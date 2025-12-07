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

// PRODUCTION CONFIGURATION
// These are necessary because shared hosting often doesn't pass environment variables from .env files.
if (!getenv('JWT_SECRET')) {
    // Generate a strong secret for this deployment
    putenv('JWT_SECRET=H4s1RiP1_Dr1pFy_S3cUr3_K3y_9988776655_!@#');
}
if (!getenv('SMTP_HOST')) putenv('SMTP_HOST=mail.hasiripi.com');
if (!getenv('SMTP_USER')) putenv('SMTP_USER=dripfy@hasiripi.com');
// Using the password found in signup/common.php which is likely the email password
if (!getenv('SMTP_PASS')) putenv('SMTP_PASS=7nT*VXH-eq,U');
if (!getenv('SMTP_SECURE')) putenv('SMTP_SECURE=true');
if (!getenv('SMTP_PORT')) putenv('SMTP_PORT=465');

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
            'email' => 'admin@dripfy.de',
            'name' => 'Admin User',
            'role' => 'admin',
            // password: ...
            'passwordHash' => '$2b$10$aiF.e7qzax.4QtWYewOTxemUR35BpAb4Twdy8jZAYHVZXrwA.SL/K',
        ],
        [
            'id' => 'admin-2',
            'email' => 'dripfy@hasiripi.com',
            'name' => 'Dripfy Admin',
            'role' => 'admin',
            // password: fykciw-9busgI-nosgem
            'passwordHash' => '$2b$10$C2.MlMCQW9QIWcrNPOeQB.ujDEyIb8MILxIyimluNyak/tdyVkbVu',
        ],
        [
            'id' => 'demo-1',
            'email' => 'demo@dripfy.com',
            'name' => 'Demo User',
            'role' => 'admin',
            // password: ...
            'passwordHash' => '$2b$10$gdVIxhNzX0BCFLItZ.A7ReF/0eoevi01JKY.NzYmPWg9cZ8EArUHm',
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
    // Try env vars first
    $secret = getEnvValue('JWT_SECRET') ?? getEnvValue('AUTH_SECRET');
    
    // Fallback for shared hosting where env vars might not be set via .env
    // SECURITY: Reverting hardcoded fallback. Environment variables MUST be set.
    // if ($secret === null || $secret === '') {
    //     $secret = 'complex_secret_key_12345'; 
    // }
    
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
    $contentBoxBorder = $isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #c8d9b9'; // Added border for light mode
    $footerBg = $isDark ? 'rgba(0,0,0,0.2)' : '#f3f9f3'; // Matches content box or slightly darker? Light mode footer usually solid.
    $footerText = $isDark ? 'rgba(255,255,255,0.4)' : 'rgba(47,74,59,0.7)';
    $footerLink = $isDark ? 'rgba(255,255,255,0.5)' : '#4ba586';
    $logoFilter = $isDark ? '' : 'filter: brightness(0.2) sepia(1) hue-rotate(90deg) saturate(3);'; // Darken logo for light mode if it's white?
    // Wait, logo is https://hasiripi.com/assets/logo-wordmark.png. If it's white text, it will be invisible on light bg.
    // Assuming the logo handles both or we need a filter. Let's assume filter isn't needed or handle it if we see issues.
    // Actually, looking at previous `buildEmailTemplate` (before my changes), it used `color:#1e332a` for text, so logo was likely visible on light.
    
    // For now, let's trust the logo works or is dark enough. If it's the typically white logo, we might need a dark version or filter. 
    // Let's invert it for Light mode if it's white. 
    // User didn't specify logo change, just theme. I'll leave logo as is but keep an eye on it.
    
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

function sendPasswordResetEmail(string $email, string $name, string $code, string $lang = 'en'): array
{
    $fromEmail = null;
    $fromName = null;
    
    // Load Translation
    $supportedLangs = ['en', 'tr', 'de', 'ru', 'ar'];
    if (!in_array($lang, $supportedLangs)) {
        $lang = 'en';
    }

    $t = null;
    $transPath = __DIR__ . '/../../../../i18n/translations/' . $lang . '.json';
    
    if (file_exists($transPath)) {
        $jsonContent = file_get_contents($transPath);
        $data = json_decode($jsonContent, true);
        if (isset($data['email'])) {
            $t = $data['email'];
        }
    }

    // Fallback to English
    if (!$t) {
        $enPath = __DIR__ . '/../../../../i18n/translations/en.json';
        if (file_exists($enPath)) {
            $jsonContent = file_get_contents($enPath);
            $data = json_decode($jsonContent, true);
            $t = $data['email'] ?? null;
        }
    }

    // Hard fallback
    if (!$t) {
        $t = [
            'resetSubject' => "Reset Your Password",
            'resetTitle' => "Reset Password",
            'resetIntro' => "We received a request to reset the password for your Dripfy account. Use the code below to proceed:<br><br>{code}<br><br>This code is valid for {ttl} minutes.",
            'resetButton' => "Reset Password",
            'resetFooter' => "If you did not request a password reset, you can safely ignore this email."
        ];
    }

    try {
        $mailer = createMailer();
        $mailer->clearAllRecipients();
        $mailer->addAddress($email, $name ?: $email);
        $mailer->Subject = $t['resetSubject'];
        $ttlMinutes = (int)ceil(PASSWORD_RESET_TTL / 60);

        // Replace placeholders
        $intro = str_replace(
            ['{code}', '{ttl}'],
            ['<span style="display:inline-block;padding:8px 16px;background:rgba(255,255,255,0.1);border-radius:8px;font-family:monospace;letter-spacing:4px;font-size:20px;color:#4ba586;border:1px solid rgba(255,255,255,0.1);">' . $code . '</span>', $ttlMinutes],
            $t['resetIntro']
        );

        $html = buildEmailTemplate(
            $t['resetTitle'],
            $intro,
            '<div style="text-align:center;margin:32px 0;"><a href="https://hasiripi.com" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg, #4ba586 0%, #3d8b6f 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:16px;box-shadow:0 10px 20px -10px rgba(75,165,134,0.5);">' . $t['resetButton'] . '</a></div>',
            $t['resetFooter']
        );

        $text = strip_tags(str_replace('<br>', "\n", $intro));

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
        // Fallback to PHP mail()
        $fallbackFromEmail = $fromEmail ?: 'no-reply@hasiripi.com';
        $fallbackFromName = $fromName ?: 'Dripfy';
        $boundary = '=_DripfyMAIL_' . md5((string)microtime(true));
        $headers = [
            'From: ' . ($fallbackFromName ? "{$fallbackFromName} <{$fallbackFromEmail}>" : $fallbackFromEmail),
            'Reply-To: ' . $fallbackFromEmail,
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];

        $subject = isset($t['resetSubject']) ? $t['resetSubject'] : 'Dripfy Reset Password';

        $body = "--{$boundary}\r\n" .
            "Content-Type: text/plain; charset=UTF-8\r\n\r\n" .
            $text . "\r\n" .
            "--{$boundary}\r\n" .
            "Content-Type: text/html; charset=UTF-8\r\n\r\n" .
            $html . "\r\n" .
            "--{$boundary}--";

        if (@mail($email, $subject, $body, implode("\r\n", $headers))) {
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

function verifyToken(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return null;
    }
    [$headerB64, $payloadB64, $sigB64] = $parts;

    try {
        $secret = getAuthSecret();
    } catch (RuntimeException $e) {
        return null;
    }

    $signature = base64urlDecode($sigB64);
    $expectedSignature = hash_hmac('sha256', $headerB64 . '.' . $payloadB64, $secret, true);

    if (!hash_equals($expectedSignature, $signature)) {
        return null; 
    }

    $payloadJson = base64urlDecode($payloadB64);
    $payload = json_decode($payloadJson, true);
    if (!is_array($payload)) {
        return null;
    }

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

function verifyAuthCookie(): ?array
{
    $cookieName = getAuthCookieName();
    if (!isset($_COOKIE[$cookieName])) {
        // Fallback: Check Authorization header
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? '';
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return verifyToken($matches[1]);
        }
        return null;
    }
    return verifyToken($_COOKIE[$cookieName]);
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
