<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJson(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$rawInput = file_get_contents('php://input') ?: '';
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    sendJson(400, ['ok' => false, 'error' => 'Invalid request payload']);
}

$email = isset($input['email']) ? trim((string)$input['email']) : '';
$password = isset($input['password']) ? (string)$input['password'] : '';

if ($email === '' || $password === '') {
    sendJson(400, ['ok' => false, 'error' => 'Email and password are required']);
}

$user = null;
foreach (getAuthUsers() as $candidate) {
    if (isset($candidate['email']) && strcasecmp($candidate['email'], $email) === 0) {
        $user = $candidate;
        break;
    }
}

if ($user === null) {
    sendJson(401, ['ok' => false, 'error' => 'Invalid email or password']);
}

$hash = isset($user['passwordHash']) ? (string)$user['passwordHash'] : '';
if ($hash === '' || !password_verify($password, $hash)) {
    sendJson(401, ['ok' => false, 'error' => 'Invalid email or password']);
}

$token = generateToken($user);
$cookieName = getAuthCookieName();
$cookieExpires = time() + getAuthExpirySeconds();

setcookie($cookieName, $token, [
    'expires' => $cookieExpires,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax',
]);

$publicUser = mapUserToPublic($user);

sendJson(200, [
    'ok' => true,
    'token' => $token,
    'user' => $publicUser,
]);
