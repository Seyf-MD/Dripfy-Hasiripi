<?php
declare(strict_types=1);

/**
 * Kayıt endpoint'i iki modla çalışır:
 *  - mode=send-code (veya code alanı yoksa): doğrulama kodu üretir ve e-posta gönderir.
 *  - mode=finalize: gelen kodu doğrular, admin/kullanıcıya bilgi maili gönderir, talebi saklar.
 */

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput ?? '', true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Geçersiz veri gönderildi']);
    exit;
}

$mode = isset($input['mode']) ? (string)$input['mode'] : '';

if ($mode === 'send-code' || !isset($input['code'])) {
    // Send verification code flow
    $payload = normaliseSignupPayload($input);
    $validationError = validateSignupPayload($payload);
    if ($validationError !== null) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $validationError]);
        exit;
    }

    $code = generateVerificationCode();
    $ttlMinutes = (int)ceil(SIGNUP_CODE_TTL / 60);
    $displayName = $payload['firstName'] !== '' ? $payload['firstName'] : $payload['name'];
    $intro = 'Dripfy Yönetim Paneli\'ne güvenle erişebilmeniz için doğrulama kodunuz hazır.';
    $userHtml = buildEmailTemplate(
        'Doğrulama kodunuz',
        $intro,
        buildCodeBlock($code) .
            '<p style="margin:0 0 18px;font-size:14px;line-height:22px;color:#2f4a3b;">Kod ' . $ttlMinutes . ' dakika boyunca geçerlidir. Talep size ait değilse lütfen bu mesajı görmezden gelin.</p>' .
            '<a href="https://hasiripi.com" style="display:inline-block;padding:14px 28px;border-radius:16px;background:linear-gradient(135deg,#4ba586,#84a084);color:#0b1612;font-weight:600;text-decoration:none;font-size:14px;">Paneli Aç</a>',
        'Sorularınız için <a href="mailto:info@dripfy.de" style="color:#84a084;text-decoration:none;">info@dripfy.de</a> adresinden bize ulaşabilirsiniz.'
    );

    $userText = "Merhaba {$displayName},\n\nDripfy Yönetim Paneli doğrulama kodunuz: {$code}\nKod {$ttlMinutes} dakika boyunca geçerlidir. Talep size ait değilse bu mesajı yok sayabilirsiniz.\n\nDripfy Ekibi";

    if (!sendSignupEmail($payload['email'], 'Dripfy Yönetim Paneli | Doğrulama Kodunuz', $userText, $userHtml)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Kod gönderilemedi. Lütfen daha sonra tekrar deneyin.']);
        exit;
    }

    $store = loadSignupStore();
    $store[strtolower($payload['email'])] = [
        'hash' => password_hash($code, PASSWORD_DEFAULT),
        'expires' => time() + SIGNUP_CODE_TTL,
        'payload' => $payload,
    ];
    saveSignupStore($store);

    echo json_encode(['ok' => true]);
    exit;
}

// Finalize signup flow
$email = trim((string)($input['email'] ?? ''));
$code = trim((string)($input['code'] ?? ''));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Geçersiz e-posta adresi']);
    exit;
}

if ($code === '' || !ctype_digit($code)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Doğrulama kodu eksik']);
    exit;
}

$store = loadSignupStore();
$storeKey = strtolower($email);

if (!isset($store[$storeKey])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Doğrulama kodu bulunamadı veya süresi doldu']);
    exit;
}

$entry = $store[$storeKey];
if (!password_verify($code, $entry['hash'] ?? '')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Geçersiz doğrulama kodu']);
    exit;
}

$payload = $entry['payload'] ?? [];
$payload['name'] = $payload['name'] ?? trim(($payload['firstName'] ?? '') . ' ' . ($payload['lastName'] ?? ''));

$infoLines = buildInfoLines($payload);
$infoBlock = implode("\n", $infoLines);
$detailPairs = [
    'Ad Soyad' => $payload['name'] ?? '',
    'E-posta' => $payload['email'] ?? $email,
    'Telefon' => formatPhone($payload),
    'Pozisyon' => $payload['position'] ?? '',
    'Firma' => $payload['company'] ?? '',
    'Ülke' => $payload['country'] ?? '',
];
$detailPairs = array_filter($detailPairs, static fn($value) => $value !== null && $value !== '');
$detailTable = buildKeyValueList($detailPairs);

$submittedAt = date('d.m.Y H:i');
$adminBody = "Merhaba,\n\nDripfy yönetim paneline yeni bir kayıt talebi ulaştı:\n\n{$infoBlock}\n\nGönderilme tarihi: {$submittedAt}\n\nPanel üzerinden talebi inceleyebilirsiniz.\n\nDripfy Otomasyon Hizmeti";
$adminHtml = buildEmailTemplate(
    'Yeni kayıt talebi',
    'Merhaba, Dripfy yönetim paneline yeni bir kayıt talebi ulaştı.',
    $detailTable . '<p style="margin:8px 0 0;font-size:13px;line-height:20px;color:#2f4a3b;">Gönderilme tarihi: ' . htmlspecialchars($submittedAt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>',
    'Talebi panel üzerinden inceleyebilirsiniz.'
);

$userGreeting = $payload['firstName'] !== '' ? $payload['firstName'] : ($payload['name'] ?? '');
$safeGreeting = htmlspecialchars($userGreeting, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
$userBody = "Merhaba {$userGreeting},\n\nDripfy Yönetim Paneli kayıt talebiniz bize ulaştı. Ekibimiz bilgilerinizi inceleyerek en kısa sürede dönüş yapacak.\n\nBilgileriniz:\n{$infoBlock}\n\nBu e-postaya yanıt vererek bize ulaşabilirsiniz.\n\nSaygılarımızla,\nDripfy Ekibi";
$userHtml = buildEmailTemplate(
    'Talebiniz bize ulaştı',
    'Dripfy Yönetim Paneli kayıt talebiniz başarıyla kaydedildi. Ekibimiz bilgilerinizi inceleyerek kısa süre içerisinde dönüş yapacak.',
    '<p style="margin:0 0 14px;font-size:14px;line-height:22px;color:#2f4a3b;"><strong>Bilgileriniz</strong></p>' .
        $detailTable .
        '<p style="margin:12px 0 0;font-size:13px;line-height:20px;color:#2f4a3b;">Her türlü soru ve isteğiniz için bu e-postaya yanıt verebilirsiniz.</p>',
    'Saygılarımızla, Dripfy Ekibi'
);

$adminSent = sendSignupEmail('info@dripfy.de', '[Dripfy] Yeni kayıt talebi - ' . ($payload['name'] ?? ''), $adminBody, $adminHtml);
$userSent = sendSignupEmail($payload['email'] ?? $email, 'Dripfy Yönetim Paneli | Talebiniz Alındı', $userBody, $userHtml);

unset($store[$storeKey]);
saveSignupStore($store);

if (!$adminSent && !$userSent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Mail gönderilemedi']);
    exit;
}

$storedRequest = storeSignupRequest($payload);

$responsePayload = [
    'id' => $storedRequest['id'],
    'name' => $payload['name'] ?? '',
    'firstName' => $payload['firstName'] ?? '',
    'lastName' => $payload['lastName'] ?? '',
    'email' => $payload['email'] ?? $email,
    'countryCode' => $payload['countryCode'] ?? '',
    'country' => $payload['country'] ?? '',
    'phone' => formatPhone($payload),
    'position' => $payload['position'] ?? '',
    'company' => $payload['company'] ?? '',
    'status' => 'pending',
    'timestamp' => date(DATE_ATOM, (int)$storedRequest['timestamp']),
];

echo json_encode(['ok' => true, 'payload' => $responsePayload]);
