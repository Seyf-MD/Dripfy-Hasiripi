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
$code = isset($payload['code']) ? trim((string)$payload['code']) : '';
$newPassword = isset($payload['password']) ? (string)$payload['password'] : '';

if ($email === '' || $code === '' || $newPassword === '') {
    sendJson(400, ['ok' => false, 'error' => 'Email, code, and password are required']);
}

if (strlen($newPassword) < 8) {
    sendJson(400, ['ok' => false, 'error' => 'Password must be at least 8 characters long']);
}

if (!validatePasswordResetCode($email, $code)) {
    sendJson(400, ['ok' => false, 'error' => 'Invalid or expired reset code']);
}

$hash = password_hash($newPassword, PASSWORD_BCRYPT);
if ($hash === false) {
    sendJson(500, ['ok' => false, 'error' => 'Failed to hash password']);
}

if (!updateAuthUserPassword($email, $hash)) {
    sendJson(404, ['ok' => false, 'error' => 'User not found']);
}

consumePasswordResetCode($email);

sendJson(200, ['ok' => true]);
