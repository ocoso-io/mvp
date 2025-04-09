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
    
    switch ($action) {
        case 'request':
            $email = $data['email'] ?? '';
            
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid email format']);
                exit();
            }
            
            // Check if user exists
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();
            
            if (!$user) {
                // Don't reveal if user exists or not
                echo json_encode(['message' => 'If an account exists with this email, a password reset link has been sent']);
                exit();
            }
            
            // Generate reset token
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', strtotime('+1 hour'));
            
            // Store reset token
            $stmt = $db->prepare("INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user['id'], $token, $expires]);
            
            // Send reset email (in production, implement actual email sending)
            $resetLink = "http://localhost:8000/reset-password.html?token=" . $token;
            // TODO: Implement email sending
            
            echo json_encode(['message' => 'If an account exists with this email, a password reset link has been sent']);
            break;
            
        case 'reset':
            $token = $data['token'] ?? '';
            $password = $data['password'] ?? '';
            
            if (strlen($password) < 8) {
                http_response_code(400);
                echo json_encode(['error' => 'Password must be at least 8 characters long']);
                exit();
            }
            
            // Verify token
            $stmt = $db->prepare("
                SELECT pr.user_id 
                FROM password_resets pr 
                WHERE pr.token = ? 
                AND pr.expires_at > NOW() 
                AND pr.used = 0
            ");
            $stmt->execute([$token]);
            $reset = $stmt->fetch();
            
            if (!$reset) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid or expired reset token']);
                exit();
            }
            
            // Update password
            $hashed_password = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([$hashed_password, $reset['user_id']]);
            
            // Mark token as used
            $stmt = $db->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
            $stmt->execute([$token]);
            
            echo json_encode(['message' => 'Password has been reset successfully']);
            break;
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
} 