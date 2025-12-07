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

    // Load Translations
    $lang = isset($input['language']) ? $input['language'] : 'en';
    $supportedLangs = ['en', 'tr', 'de', 'ru', 'ar'];
    if (!in_array($lang, $supportedLangs)) {
        $lang = 'en';
    }

    $theme = isset($input['theme']) ? $input['theme'] : 'light';

    $t = null;
    $transPath = __DIR__ . '/../../../../i18n/translations/' . $lang . '.json';
    
    if (file_exists($transPath)) {
        $data = json_decode(file_get_contents($transPath), true);
        if (isset($data['email'])) {
            $t = $data['email'];
        }
    }

    if (!$t) {
        $enPath = __DIR__ . '/../../../../i18n/translations/en.json';
        if (file_exists($enPath)) {
            $data = json_decode(file_get_contents($enPath), true);
            $t = $data['email'] ?? null;
        }
    }

    // Hard fallback
    if (!$t) {
        $t = [
            'signupCodeSubject' => "Your Verification Code",
            'signupCodeTitle' => "Verification Code",
            'signupCodeIntro' => "Your verification code for Dripfy Management Panel is ready. Use the code below to proceed:<br><br>{code}<br><br>This code is valid for {ttl} minutes.",
            'signupCodeButton' => "Open Panel",
            'signupCodeFooter' => "If you did not request this code, please ignore this email.",
            'signupReceivedSubject' => "We Received Your Request",
            'signupReceivedTitle' => "Request Received",
            'signupReceivedIntro' => "We received your registration request for Dripfy Management Panel. Our team will review your details and get back to you shortly.<br><br><strong>Your Details</strong><br>{details}",
            'signupReceivedFooter' => "You can reply to this email for any questions."
        ];
    }

    $code = generateVerificationCode();
    $ttlMinutes = (int)ceil(SIGNUP_CODE_TTL / 60);
    $displayName = $payload['firstName'] !== '' ? $payload['firstName'] : $payload['name'];

    // Theme-aware styles for code
    $isDark = ($theme === 'dark');
    $codeStyle = $isDark 
        ? 'background:rgba(255,255,255,0.1);border-radius:8px;color:#4ba586;border:1px solid rgba(255,255,255,0.1);'
        : 'background:rgba(75,165,134,0.1);border-radius:8px;color:#1e332a;border:1px solid #c8d9b9;';
    
    $intro = str_replace(
        ['{code}', '{ttl}'],
        ['<span style="display:inline-block;padding:8px 16px;font-family:monospace;letter-spacing:4px;font-size:20px;' . $codeStyle . '">' . $code . '</span>', $ttlMinutes],
        $t['signupCodeIntro']
    );

    $userHtml = buildEmailTemplate(
        $t['signupCodeTitle'],
        $intro,
        '<div style="text-align:center;margin:32px 0;"><a href="https://hasiripi.com" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg, #4ba586 0%, #3d8b6f 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:16px;box-shadow:0 10px 20px -10px rgba(75,165,134,0.5);">' . $t['signupCodeButton'] . '</a></div>',
        $t['signupCodeFooter'],
        $theme
    );

    $userText = strip_tags(str_replace('<br>', "\n", $intro));

    if (!sendSignupEmail($payload['email'], $t['signupCodeSubject'], $userText, $userHtml)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Kod gönderilemedi/Could not send code.']);
        exit;
    }

    $store = loadSignupStore();
    $store[strtolower($payload['email'])] = [
        'hash' => password_hash($code, PASSWORD_DEFAULT),
        'expires' => time() + SIGNUP_CODE_TTL,
        'payload' => $payload,
        'language' => $lang,
        'theme' => $theme
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
    echo json_encode(['ok' => false, 'error' => 'Invalid email']);
    exit;
}

if ($code === '' || !ctype_digit($code)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing code']);
    exit;
}

$store = loadSignupStore();
$storeKey = strtolower($email);

if (!isset($store[$storeKey])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Code not found or expired']);
    exit;
}

$entry = $store[$storeKey];
if (!password_verify($code, $entry['hash'] ?? '')) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid code']);
    exit;
}

$payload = $entry['payload'] ?? [];
$lang = $entry['language'] ?? ($input['language'] ?? 'en');
$theme = $entry['theme'] ?? ($input['theme'] ?? 'light');
$payload['name'] = $payload['name'] ?? trim(($payload['firstName'] ?? '') . ' ' . ($payload['lastName'] ?? ''));

// Load Translations Again for Finalize
$supportedLangs = ['en', 'tr', 'de', 'ru', 'ar'];
if (!in_array($lang, $supportedLangs)) {
    $lang = 'en';
}

$t = null;
$transPath = __DIR__ . '/../../../../i18n/translations/' . $lang . '.json';

if (file_exists($transPath)) {
    $data = json_decode(file_get_contents($transPath), true);
    if (isset($data['email'])) {
        $t = $data['email'];
    }
}

if (!$t) {
    // Fallback logic handled implicitly by ensuring file exists or reusing hard fallback if needed, 
    // but for brevity we'll assume en.json exists as per previous block or define minimal fallback.
    $t = [
        'signupReceivedSubject' => "We Received Your Request",
        'signupReceivedTitle' => "Request Received",
        'signupReceivedIntro' => "We received your registration request for Dripfy Management Panel. Our team will review your details and get back to you shortly.<br><br><strong>Your Details</strong><br>{details}",
        'signupReceivedFooter' => "You can reply to this email for any questions."
    ];
}

$infoLines = buildInfoLines($payload);
$infoBlock = implode("\n", $infoLines);
$detailPairs = [
    'Name' => $payload['name'] ?? '',
    'Email' => $payload['email'] ?? $email,
    'Phone' => formatPhone($payload),
    'Position' => $payload['position'] ?? '',
    'Company' => $payload['company'] ?? '',
    'Country' => $payload['country'] ?? '',
];
$detailPairs = array_filter($detailPairs, static fn($value) => $value !== null && $value !== '');
$detailTable = buildKeyValueList($detailPairs);

$submittedAt = date('d.m.Y H:i');
$adminBody = "New signup request:\n\n{$infoBlock}\n\nDate: {$submittedAt}";
$adminHtml = buildEmailTemplate(
    'New Signup Request',
    'A new signup request has been received.',
    $detailTable . '<p style="margin:8px 0 0;font-size:13px;line-height:20px;color:#2f4a3b;">Date: ' . htmlspecialchars($submittedAt, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>',
    'Check panel for details.',
    'light' // Admin email always light? Or maybe admin's preference? Let's default to light (classic) for admin.
);

$userIntro = str_replace('{details}', $detailTable, $t['signupReceivedIntro']);

$userHtml = buildEmailTemplate(
    $t['signupReceivedTitle'],
    $userIntro,
    '',
    $t['signupReceivedFooter'],
    $theme
);

$userBody = strip_tags(str_replace('<br>', "\n", $userIntro));

$adminSent = sendSignupEmail('info@dripfy.de', '[Dripfy] New Request - ' . ($payload['name'] ?? ''), $adminBody, $adminHtml);
$userSent = sendSignupEmail($payload['email'] ?? $email, $t['signupReceivedSubject'], $userBody, $userHtml);


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
