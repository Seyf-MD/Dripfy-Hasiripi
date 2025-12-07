<?php
declare(strict_types=1);

require_once __DIR__ . '/../common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$payload = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($payload)) {
    sendJson(400, ['ok' => false, 'error' => 'Invalid request payload']);
}

$email = isset($payload['email']) ? trim((string)$payload['email']) : '';
if ($email === '') {
    sendJson(400, ['ok' => false, 'error' => 'Email is required']);
}

$user = findAuthUserByEmail($email);
if ($user === null) {
    // Always respond success to avoid leaking valid accounts.
    sendJson(200, ['ok' => true]);
}

$code = createPasswordResetRecord($email);
if ($code === null) {
    sendJson(500, ['ok' => false, 'error' => 'Failed to prepare reset code']);
}

$name = $user['name'] ?? $email;
$theme = isset($payload['theme']) ? (string)$payload['theme'] : 'light';
$response = sendPasswordResetEmail($email, $name, $code, 'en', $theme); // We'd need to fetch user language here too if possible, but passing 'en' for now as per original code.
// Actually, `sendPasswordResetEmail` in common.php (my version) accepts $lang.
// The file I viewed (step 1267) logic was `$response = sendPasswordResetEmail($email, $name, $code);`
// My common.php update (step 1272) signature is `sendPasswordResetEmail(string $email, string $name, string $code, string $lang = 'en', string $theme = 'light')`
// So I should pass the theme.
// Note: We don't have user's language preference in `users.json` easily accessibly here (only `findAuthUserByEmail` returns the user).
// If `findAuthUserByEmail` returns language, I could use it.
// Assuming default 'en' for now, but passing theme from payload.

if (!$response['ok']) {
    consumePasswordResetCode($email);
    $errorKey = 'Password reset email could not be sent.';
    if (!empty($response['error'])) {
        $errorKey .= ' Reason: ' . $response['error'];
    }
    sendJson(500, ['ok' => false, 'error' => $errorKey]);
}

sendJson(200, ['ok' => true]);
