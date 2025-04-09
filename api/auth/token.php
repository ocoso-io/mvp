<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: http://localhost:8000');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/social-login.php';

// Get the provider from the URL path
$path = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
$provider = $path[count($path) - 2]; // Get the provider name from the URL

// Get the request body
$data = json_decode(file_get_contents('php://input'), true);
$code = $data['code'] ?? null;

if (!$code) {
    http_response_code(400);
    echo json_encode(['error' => 'Authorization code is required']);
    exit();
}

try {
    $tokenResponse = exchangeCodeForToken($provider, $code);
    $userInfo = getUserInfo($provider, $tokenResponse['access_token']);
    
    echo json_encode([
        'access_token' => $tokenResponse['access_token'],
        'user' => $userInfo
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function exchangeCodeForToken($provider, $code) {
    global $config;
    $providerConfig = $config[$provider];
    
    $params = [
        'client_id' => $providerConfig['client_id'],
        'client_secret' => $providerConfig['client_secret'],
        'code' => $code,
        'redirect_uri' => $providerConfig['redirect_uri'],
        'grant_type' => 'authorization_code'
    ];

    $ch = curl_init($providerConfig['token_endpoint']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL Error: $error");
    }

    $data = json_decode($response, true);
    if (isset($data['error'])) {
        throw new Exception($data['error_description'] ?? $data['error']);
    }

    return $data;
}

function getUserInfo($provider, $accessToken) {
    global $config;
    $providerConfig = $config[$provider];
    
    $ch = curl_init($providerConfig['userinfo_endpoint']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer $accessToken",
        'Accept: application/json'
    ]);

    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL Error: $error");
    }

    $data = json_decode($response, true);
    if (isset($data['error'])) {
        throw new Exception($data['error_description'] ?? $data['error']);
    }

    return $data;
} 