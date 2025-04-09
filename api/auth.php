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

// Check rate limit
if (!$rateLimiter->checkRateLimit($ip)) {
    http_response_code(429);
    echo json_encode([
        'error' => 'Too many attempts',
        'remaining_attempts' => 0,
        'retry_after' => $rateLimiter->getRemainingTime($ip)
    ]);
    exit();
}

// Initialize database connection
try {
    $database = new Database();
    $db = $database->getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

// Helper function to validate email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

// Helper function to validate password
function isValidPassword($password) {
    return strlen($password) >= 8 && 
           preg_match('/[A-Z]/', $password) && 
           preg_match('/[a-z]/', $password) && 
           preg_match('/[0-9]/', $password);
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
        case 'register':
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            
            if (!isValidEmail($email)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid email format']);
                exit();
            }
            
            if (!isValidPassword($password)) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers'
                ]);
                exit();
            }
            
            // Check if user already exists
            $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            
            if ($stmt->rowCount() > 0) {
                http_response_code(409);
                echo json_encode(['error' => 'User already exists']);
                exit();
            }
            
            // Hash password
            $hashed_password = password_hash($password, PASSWORD_BCRYPT);
            
            // Insert new user
            try {
                $stmt = $db->prepare("INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())");
                $stmt->execute([$email, $hashed_password]);
                
                $user_id = $db->lastInsertId();
                $token = JWTUtil::generateToken($user_id, $email);
                
                echo json_encode([
                    'message' => 'Registration successful',
                    'token' => $token,
                    'user' => [
                        'id' => $user_id,
                        'email' => $email
                    ]
                ]);
            } catch (PDOException $e) {
                error_log("Registration error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Registration failed']);
            }
            break;
            
        case 'login':
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
            
            try {
                $stmt = $db->prepare("SELECT id, password FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $user = $stmt->fetch();
                
                if (!$user || !password_verify($password, $user['password'])) {
                    http_response_code(401);
                    echo json_encode([
                        'error' => 'Invalid credentials',
                        'remaining_attempts' => $rateLimiter->getRemainingAttempts($ip)
                    ]);
                    exit();
                }
                
                $token = JWTUtil::generateToken($user['id'], $email);
                
                echo json_encode([
                    'message' => 'Login successful',
                    'token' => $token,
                    'user' => [
                        'id' => $user['id'],
                        'email' => $email
                    ]
                ]);
            } catch (PDOException $e) {
                error_log("Login error: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Login failed']);
            }
            break;
            
        case 'logout':
            // In a stateless JWT system, logout is handled client-side
            // We could implement token blacklisting if needed
            echo json_encode(['message' => 'Logout successful']);
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