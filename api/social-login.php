<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/RateLimiter.php';
require_once __DIR__ . '/../config/social-login.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Initialize rate limiter
$rateLimiter = new RateLimiter();
$ip = $_SERVER['REMOTE_ADDR'];

// Initialize database connection
try {
    $database = new Database();
    $db = $database->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

// Helper function to verify social token
function verifySocialToken($provider, $token) {
    $config = require __DIR__ . '/../config/social-login.php';
    $providerConfig = $config[$provider] ?? null;
    
    if (!$providerConfig) {
        throw new Exception('Invalid provider');
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $providerConfig['userinfo_uri']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $token
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception('Invalid token');
    }
    
    return json_decode($response, true);
}

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request data']);
        exit();
    }

    $provider = $data['provider'] ?? '';
    $token = $data['token'] ?? '';
    
    if (!$provider || !$token) {
        http_response_code(400);
        echo json_encode(['error' => 'Provider and token are required']);
        exit();
    }
    
    try {
        // Verify social token and get user data
        $userData = verifySocialToken($provider, $token);
        
        // Map provider-specific data to our format
        $mappedData = [
            'email' => $userData['email'] ?? '',
            'name' => $userData['name'] ?? '',
            'provider_id' => $userData['sub'] ?? $userData['id'] ?? ''
        ];
        
        if (!$mappedData['email'] || !$mappedData['provider_id']) {
            throw new Exception('Invalid user data from provider');
        }
        
        // Check if user exists
        $stmt = $db->prepare("
            SELECT id FROM users 
            WHERE email = ? OR (provider = ? AND provider_id = ?)
        ");
        $stmt->execute([
            $mappedData['email'],
            $provider,
            $mappedData['provider_id']
        ]);
        $user = $stmt->fetch();
        
        if (!$user) {
            // Create new user
            $stmt = $db->prepare("
                INSERT INTO users (
                    email, name, provider, provider_id, 
                    email_verified, created_at
                ) VALUES (?, ?, ?, ?, 1, NOW())
            ");
            $stmt->execute([
                $mappedData['email'],
                $mappedData['name'],
                $provider,
                $mappedData['provider_id']
            ]);
            $user_id = $db->lastInsertId();
        } else {
            $user_id = $user['id'];
        }
        
        // Generate JWT token
        $jwt = JWTUtil::generateToken($user_id, $mappedData['email']);
        
        echo json_encode([
            'message' => 'Login successful',
            'token' => $jwt,
            'user' => [
                'id' => $user_id,
                'email' => $mappedData['email'],
                'name' => $mappedData['name'],
                'provider' => $provider
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(401);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} 