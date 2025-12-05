<?php
declare(strict_types=1);

/**
 * Bekleyen kayıt taleplerini yönetmek için küçük bir yardımcı endpoint.
 * - GET  → tüm talepleri ISO tarih formatıyla döndürür.
 * - POST → { id } alır ve ilgili talebi saklama dosyasından kaldırır.
 */

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/common.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $requests = array_map(static function ($request) {
        if (isset($request['timestamp'])) {
            $request['timestamp'] = date(DATE_ATOM, (int)$request['timestamp']);
        }
        return $request;
    }, loadSignupRequests());

    echo json_encode(['ok' => true, 'requests' => $requests]);
    exit;
}

if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput ?? '', true);
    if (!is_array($input)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Geçersiz veri gönderildi']);
        exit;
    }

    $id = isset($input['id']) ? (string)$input['id'] : '';
    if ($id === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Kayıt talebi bulunamadı']);
        exit;
    }

    if (!removeSignupRequest($id)) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Kayıt talebi bulunamadı']);
        exit;
    }

    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
