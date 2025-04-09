<?php
class RateLimiter {
    private $redis;
    private $max_attempts = 5;
    private $time_window = 300; // 5 minutes

    public function __construct() {
        $this->redis = new Redis();
        $this->redis->connect('127.0.0.1', 6379);
    }

    public function checkRateLimit($ip) {
        $key = "rate_limit:$ip";
        $current = $this->redis->get($key);

        if ($current === false) {
            $this->redis->setex($key, $this->time_window, 1);
            return true;
        }

        if ($current >= $this->max_attempts) {
            return false;
        }

        $this->redis->incr($key);
        return true;
    }

    public function getRemainingAttempts($ip) {
        $key = "rate_limit:$ip";
        $current = $this->redis->get($key);
        return $current === false ? $this->max_attempts : max(0, $this->max_attempts - $current);
    }
} 