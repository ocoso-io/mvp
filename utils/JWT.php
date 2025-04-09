<?php
require_once __DIR__ . '/../vendor/autoload.php';
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JWTUtil {
    private static $secret_key = "your-secret-key-here"; // Change this in production
    private static $algorithm = 'HS256';
    private static $token_expiry = 3600; // 1 hour

    public static function generateToken($user_id, $email) {
        $issued_at = time();
        $expiration_time = $issued_at + self::$token_expiry;

        $payload = array(
            "iat" => $issued_at,
            "exp" => $expiration_time,
            "user_id" => $user_id,
            "email" => $email
        );

        return JWT::encode($payload, self::$secret_key, self::$algorithm);
    }

    public static function validateToken($token) {
        try {
            $decoded = JWT::decode($token, new Key(self::$secret_key, self::$algorithm));
            return $decoded;
        } catch (Exception $e) {
            error_log("Token validation failed: " . $e->getMessage());
            return false;
        }
    }

    public static function getTokenFromHeader() {
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            return str_replace('Bearer ', '', $headers['Authorization']);
        }
        return null;
    }
} 