<?php
require_once __DIR__ . '/../../../auth/common.php';

// Handle CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Authentication Check
$userPayload = verifyAuthCookie();
if (!$userPayload || ($userPayload['role'] ?? '') !== 'admin') {
    sendJson(401, ['ok' => false, 'error' => 'Unauthorized']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        sendJson(400, ['ok' => false, 'error' => 'Invalid JSON']);
    }

    $email = $input['email'] ?? '';
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
         sendJson(400, ['ok' => false, 'error' => 'Invalid email']);
    }

    $firstName = $input['firstName'] ?? 'User';
    $role = $input['position'] ?? 'Member';
    $lang = $input['language'] ?? 'en';

    // Load Translations
    $supportedLangs = ['en', 'tr', 'de', 'ru', 'ar'];
    if (!in_array($lang, $supportedLangs)) {
        $lang = 'en';
    }

    $transPath = __DIR__ . '/../../../../../i18n/translations/' . $lang . '.json';
    $t = null;

    if (file_exists($transPath)) {
        $jsonContent = file_get_contents($transPath);
        $data = json_decode($jsonContent, true);
        if (isset($data['email'])) {
            $t = $data['email'];
        }
    }

    // Fallback to English if not found
    if (!$t) {
        $enPath = __DIR__ . '/../../../../../i18n/translations/en.json';
        if (file_exists($enPath)) {
            $jsonContent = file_get_contents($enPath);
            $data = json_decode($jsonContent, true);
            $t = $data['email'] ?? null;
        }
    }

    // Hard fallback if everything fails
    if (!$t) {
        $t = [
            'inviteSubject' => "You've been invited to Dripfy",
            'inviteTitle' => "Welcome to the Team",
            'inviteIntro' => "Hello {name},<br><br>You have been invited to join <strong>Dripfy</strong> as <strong>{role}</strong>.",
            'inviteButton' => "Accept Invitation",
            'inviteFooter' => "If you were not expecting this invitation, please ignore this email."
        ];
    }

    // Replace placeholders
    $intro = str_replace(
        ['{name}', '{role}'], 
        [htmlspecialchars($firstName), htmlspecialchars($role)], 
        $t['inviteIntro']
    );

    // Create Mailer
    $mailer = createMailer();
    $mailer->addAddress($email, $firstName);
    $mailer->Subject = $t['inviteSubject']; // Subject from translation
    $mailer->isHTML(true);

    $inviteLink = "https://hasiripi.com/login?invite=true&email=" . urlencode($email);
    
    $theme = $input['theme'] ?? 'light';
    $buttonHtml = <<<HTML
    <div style="text-align:center;margin:32px 0;">
        <a href="{$inviteLink}" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg, #4ba586 0%, #3d8b6f 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:16px;box-shadow:0 10px 20px -10px rgba(75,165,134,0.5);">
            {$t['inviteButton']}
        </a>
    </div>
HTML;

    $htmlContent = buildEmailTemplate(
        $t['inviteTitle'],
        $intro,
        $buttonHtml,
        $t['inviteFooter'],
        $theme
    );

    $mailer->Body = $htmlContent;
    $mailer->AltBody = strip_tags(str_replace('<br>', "\n", $intro)) . "\n\n" . $inviteLink;

    $mailer->send();

    sendJson(200, ['ok' => true, 'message' => 'Invitation sent']);

} catch (Exception $e) {
    // Fallback logic
    try {
        if (!isset($htmlContent)) { throw $e; }
        
        $headers  = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
        $headers .= "From: Dripfy <noreply@hasiripi.com>" . "\r\n";
        
        $subject = isset($t['inviteSubject']) ? $t['inviteSubject'] : "Dripfy Invitation";

        if (@mail($email, $subject, $htmlContent, $headers)) {
             sendJson(200, ['ok' => true, 'message' => 'Invitation sent (fallback)']);
        } else {
             throw $e;
        }
    } catch (Exception $ex) {
        sendJson(500, ['ok' => false, 'error' => $e->getMessage()]);
    }
}
