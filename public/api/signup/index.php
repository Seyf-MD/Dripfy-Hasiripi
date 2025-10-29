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
    $userHtml = '<p>Merhaba <strong>' . htmlspecialchars($payload['firstName'] !== '' ? $payload['firstName'] : $payload['name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</strong>,</p>' .
        '<p>Dripfy hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>' .
        '<p style="font-size:24px;font-weight:bold;letter-spacing:4px"><code>' . htmlspecialchars($code, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</code></p>' .
        '<p>Bu kod 10 dakika boyunca geçerlidir.</p>';

    $userText = "Merhaba {$payload['firstName']} {$payload['lastName']}\n\nDripfy hesabınızı doğrulamak için bu kodu kullanın: {$code}\nKod 10 dakika boyunca geçerlidir.";

    if (!sendSignupEmail($payload['email'], 'Dripfy doğrulama kodunuz', $userText, $userHtml)) {
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

$adminBody = "Yeni bir kayıt talebi aldınız:\n\n{$infoBlock}\n\nGönderilme tarihi: " . date('d.m.Y H:i');
$adminHtml = '<p>Yeni bir kayıt talebi aldınız:</p><ul>';
foreach ($infoLines as $line) {
    [$label, $value] = array_map('trim', explode(':', $line, 2));
    $adminHtml .= '<li><strong>' . htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ':</strong> ' . htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>';
}
$adminHtml .= '</ul><p>Gönderilme tarihi: ' . date('d.m.Y H:i') . '</p>';

$userGreeting = $payload['firstName'] !== '' ? $payload['firstName'] : ($payload['name'] ?? '');
$userBody = "Merhaba {$userGreeting},\n\nDripfy’ye gösterdiğiniz ilgi için teşekkür ederiz. Ekibimiz en kısa sürede sizinle iletişime geçecek.\n\nBilgileriniz:\n{$infoBlock}\n\nSevgiler,\nDripfy Ekibi";
$userHtml = '<p>Merhaba <strong>' . htmlspecialchars($userGreeting, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</strong>,</p>' .
    '<p>Dripfy’ye gösterdiğiniz ilgi için teşekkür ederiz. Ekibimiz en kısa sürede sizinle iletişime geçecek.</p>' .
    '<p><strong>Bilgileriniz:</strong></p><ul>';
foreach ($infoLines as $line) {
    [$label, $value] = array_map('trim', explode(':', $line, 2));
    $userHtml .= '<li><strong>' . htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . ':</strong> ' . htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</li>';
}
$userHtml .= '</ul><p>Sevgiler,<br/>Dripfy Ekibi</p>';

$adminSent = sendSignupEmail('dripfy@hasiripi.com', '[Dripfy] Yeni kayıt talebi - ' . ($payload['name'] ?? ''), $adminBody, $adminHtml);
$userSent = sendSignupEmail($payload['email'] ?? $email, 'Dripfy Kaydınız Alındı', $userBody, $userHtml);

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
