<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/JWT.php';
require_once __DIR__ . '/../utils/RateLimiter.php';

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

// Handle POST requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid request data']);
        exit();
    }

    $action = $data['action'] ?? '';
    $email = $data['email'] ?? '';
    $token = $data['token'] ?? '';
    
    if ($action === 'request') {
        // Request verification email
        if (!$email) {
            http_response_code(400);
            echo json_encode(['error' => 'Email is required']);
            exit();
        }
        
        // Check if user exists
        $stmt = $db->prepare("SELECT id, email_verified FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit();
        }
        
        if ($user['email_verified']) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already verified']);
            exit();
        }
        
        // Generate verification token
        $verificationToken = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
        
        // Store verification token
        $stmt = $db->prepare("
            INSERT INTO email_verifications (user_id, token, expires_at) 
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$user['id'], $verificationToken, $expiresAt]);
        
        // TODO: Send verification email
        // This is a placeholder - implement actual email sending
        $verificationLink = "https://yourdomain.com/verify-email?token=" . $verificationToken;
        
        echo json_encode([
            'message' => 'Verification email sent',
            'verificationLink' => $verificationLink // Remove in production
        ]);
    } elseif ($action === 'verify') {
        // Verify email with token
        if (!$token) {
            http_response_code(400);
            echo json_encode(['error' => 'Verification token is required']);
            exit();
        }
        
        // Check token validity
        $stmt = $db->prepare("
            SELECT user_id, expires_at 
            FROM email_verifications 
            WHERE token = ? AND used = 0
        ");
        $stmt->execute([$token]);
        $verification = $stmt->fetch();
        
        if (!$verification) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit();
        }
        
        if (strtotime($verification['expires_at']) < time()) {
            http_response_code(400);
            echo json_encode(['error' => 'Token expired']);
            exit();
        }
        
        // Mark email as verified
        $stmt = $db->prepare("UPDATE users SET email_verified = 1 WHERE id = ?");
        $stmt->execute([$verification['user_id']]);
        
        // Mark token as used
        $stmt = $db->prepare("UPDATE email_verifications SET used = 1 WHERE token = ?");
        $stmt->execute([$token]);
        
        echo json_encode(['message' => 'Email verified successfully']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} 