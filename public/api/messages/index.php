<?php
require_once __DIR__ . '/../auth/common.php';

// Constants
const MESSAGES_FILE = __DIR__ . '/../../runtime/messages.json';

// --- Helper Functions ---

function ensureMessagesFile() {
    if (!file_exists(MESSAGES_FILE)) {
        file_put_contents(MESSAGES_FILE, json_encode([], JSON_PRETTY_PRINT));
    }
}

function loadMessages() {
    ensureMessagesFile();
    $content = file_get_contents(MESSAGES_FILE);
    return json_decode($content, true) ?? [];
}

function saveMessages($messages) {
    ensureMessagesFile();
    file_put_contents(MESSAGES_FILE, json_encode(array_values($messages), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// --- Main Handler ---

// CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentication
$user = verifyAuthCookie();
if (!$user) {
    sendJson(401, ['ok' => false, 'error' => 'Unauthorized']);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $allMessages = loadMessages();
    $userId = $user['id'];
    $role = $user['role'] ?? 'user';

    // Filter messages
    $filtered = array_filter($allMessages, function($m) use ($userId, $role) {
        $toId = $m['toId'] ?? '';
        $fromId = $m['fromId'] ?? '';

        // If I am the sender or receiver, I see it.
        if ($fromId === $userId || $toId === $userId) return true;

        // If I am admin, I see messages sent TO 'admin' or FROM 'admin'
        if ($role === 'admin') {
            if ($toId === 'admin' || $fromId === 'admin') return true;
        }

        return false;
    });

    // Sort by timestamp desc
    usort($filtered, function($a, $b) {
        return ($b['timestamp'] ?? 0) <=> ($a['timestamp'] ?? 0);
    });

    sendJson(200, ['ok' => true, 'messages' => array_values($filtered)]);
}

elseif ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        sendJson(400, ['ok' => false, 'error' => 'Invalid JSON']);
    }

    $content = trim($input['content'] ?? '');
    $subject = trim($input['subject'] ?? '');
    $toId = trim($input['toId'] ?? '');
    
    if (!$content || !$toId) {
        sendJson(400, ['ok' => false, 'error' => 'Missing content or recipient']);
    }

    // Save User Preferences (Language/Theme) if provided
    $lang = $input['language'] ?? 'en';
    $theme = $input['theme'] ?? 'light';
    
    // Attempt to update user storage 'runtime/auth_users.json'
    // We reuse logic from auth/common.php -> but we need a function to update generic fields, not just password.
    // Let's implement a quick update helper right here or extend common.php?
    // Extending common.php is cleaner but modifying files is risky.
    // I will read/write auth_users.json here using loadRuntimeUsers/saveRuntimeUsers from common.php
    
    $runtimeUsers = loadRuntimeUsers();
    // find user key by email
    $emailKey = strtolower($user['email']);
    if (isset($runtimeUsers[$emailKey])) {
        // Update
        $runtimeUsers[$emailKey]['language'] = $lang;
        $runtimeUsers[$emailKey]['theme'] = $theme;
        saveRuntimeUsers($runtimeUsers);
    }
    
    // Create Message
    $msgId = 'msg_' . time() . '_' . bin2hex(random_bytes(4));
    $timestamp = round(microtime(true) * 1000); // ms
    
    $newMessage = [
        'id' => $msgId,
        'fromId' => $user['id'],
        'fromName' => $user['name'] ?? 'User',
        'toId' => $toId,
        'subject' => $subject,
        'content' => $content,
        'timestamp' => $timestamp,
        'isRead' => false,
        'isResolved' => false
    ];

    if (isset($input['parentId'])) {
        $newMessage['parentId'] = $input['parentId'];
    }

    $allMessages = loadMessages();
    $allMessages[] = $newMessage;
    saveMessages($allMessages);

    // Send Email Notification if to Admin
    if ($toId === 'admin') {
        try {
            // Build Email
            // We need a specific template for "Admin Message"
            // Borrowing logic from emailService.js equivalent
            
            // Re-use Translations logic or hardcode for simplicity/robustness? 
            // The emails are "Admin Message", admin usually speaks English or Turkish.
            // Let's use English default for Admin notifications or respect user lang?
            // "We use the USER's language and theme preference for the template structure but user content is what they wrote."
            
            // Load text resources similar to what we did in other files
            // Short version: hardcode structure, use variables.
            
            $textStyle = ($theme === 'dark') ? "color:#cbd5e1" : "color:rgba(47,74,59,0.85)";
            
            $messageHtml = '
                <p style="margin:0 0 16px;font-size:15px;line-height:26px;'.$textStyle.';">'.nl2br(htmlspecialchars($content)).'</p>
                <div style="margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.1);font-size:12px;opacity:0.7;">
                    Sent by: <strong>'.htmlspecialchars($user['name']).'</strong> ('.htmlspecialchars($user['email']).')
                </div>
            ';

            $title = "New User Message";
            $intro = "You have received a new message from " . htmlspecialchars($user['name']);
            $subjectEmail = "[Dripfy] New Message: " . $user['name'];

            $html = buildEmailTemplate($title, $intro, $messageHtml, null, $theme);
            
            // Recipient: 'dripfy@hasiripi.com'
            // But wait, the SENDER is also dripfy@hasiripi.com?
            // "dripfy@hasiripi.com kullanıcı ile email atmaya çalışınca"
            // If sender == recipient, some SMTPs reject or junk it.
            // But admin is dripfy@hasiripi.com.
            
            $adminEmail = 'dripfy@hasiripi.com';
            
            $mailer = createMailer();
            $mailer->addAddress($adminEmail);
            $mailer->addReplyTo($user['email'], $user['name']);
            $mailer->Subject = $subjectEmail;
            $mailer->Body = $html;
            $mailer->AltBody = strip_tags(str_replace('<br>', "\n", $intro)) . "\n\n" . $content;
            $mailer->isHTML(true);
            $mailer->send();

        } catch (Exception $e) {
            error_log("[messages] Failed to send admin email: " . $e->getMessage());
            // Don't fail the request, just log
        }
    }

    sendJson(200, ['ok' => true, 'message' => $newMessage]);
}
else {
    sendJson(405, ['ok' => false, 'error' => 'Method not allowed']);
}
