<?php
require_once __DIR__ . '/../auth/common.php';

const MESSAGES_FILE = __DIR__ . '/../../runtime/messages.json';

function _loadMessages() {
    if (!file_exists(MESSAGES_FILE)) return [];
    return json_decode(file_get_contents(MESSAGES_FILE), true) ?? [];
}
function _saveMessages($messages) {
    file_put_contents(MESSAGES_FILE, json_encode(array_values($messages), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// POST to mark as read
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = verifyAuthCookie();
    if (!$user) {
        sendJson(401, ['ok' => false, 'error' => 'Unauthorized']);
    }

    $id = $_GET['id'] ?? '';
    if (!$id) {
        sendJson(400, ['ok' => false, 'error' => 'Missing ID']);
    }

    $all = _loadMessages();
    $updated = false;
    foreach ($all as &$msg) {
        if (($msg['id'] ?? '') === $id) {
            $msg['isRead'] = true;
            $updated = true;
            break; 
        }
    }
    unset($msg);

    if ($updated) {
        _saveMessages($all);
        sendJson(200, ['ok' => true]);
    } else {
        // Message not found or already read?
        sendJson(404, ['ok' => false, 'error' => 'Message not found']);
    }
} else {
    sendJson(405, ['ok' => false, 'error' => 'Method not allowed']);
}
