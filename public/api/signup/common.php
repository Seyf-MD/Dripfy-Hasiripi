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
    try {
        $mailer->isSMTP();
        $mailer->Host = 'mail.hasiripi.com';
        $mailer->SMTPAuth = true;
        $mailer->Username = 'dripfy@hasiripi.com';
        $mailer->Password = '7nT*VXH-eq,U';
        $mailer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mailer->Port = 465;
        $mailer->CharSet = 'UTF-8';
        $mailer->Encoding = 'base64';

        $mailer->setFrom('dripfy@hasiripi.com', 'Dripfy');
        $mailer->addAddress($recipient);
        $mailer->addReplyTo('dripfy@hasiripi.com', 'Dripfy');

        $mailer->isHTML(true);
        $mailer->Subject = $subject;
        $mailer->Body = $htmlBody;
        $mailer->AltBody = $textBody;

        $mailer->send();
        return true;
    } catch (Exception $e) {
        error_log('Signup mail PHPMailer error: ' . $e->getMessage());
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
