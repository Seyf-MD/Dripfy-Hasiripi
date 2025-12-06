<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'POST';
if ($method !== 'POST') {
    sendJson(405, ['ok' => false, 'error' => 'Method not allowed']);
}

$cookieName = getAuthCookieName();
setcookie($cookieName, '', [
    'expires' => time() - 3600,
    'path' => '/',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax',
]);

sendJson(200, ['ok' => true]);
