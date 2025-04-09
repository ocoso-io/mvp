<?php
$config = [
    'google' => [
        'client_id' => getenv('GOOGLE_CLIENT_ID'),
        'client_secret' => getenv('GOOGLE_CLIENT_SECRET'),
        'redirect_uri' => 'http://localhost:8000/auth/google/callback',
        'auth_endpoint' => 'https://accounts.google.com/o/oauth2/v2/auth',
        'token_endpoint' => 'https://oauth2.googleapis.com/token',
        'userinfo_endpoint' => 'https://www.googleapis.com/oauth2/v3/userinfo',
        'scope' => 'email profile'
    ],
    'linkedin' => [
        'client_id' => getenv('LINKEDIN_CLIENT_ID'),
        'client_secret' => getenv('LINKEDIN_CLIENT_SECRET'),
        'redirect_uri' => 'http://localhost:8000/auth/linkedin/callback',
        'auth_endpoint' => 'https://www.linkedin.com/oauth/v2/authorization',
        'token_endpoint' => 'https://www.linkedin.com/oauth/v2/accessToken',
        'userinfo_endpoint' => 'https://api.linkedin.com/v2/me',
        'scope' => 'r_liteprofile r_emailaddress'
    ],
    'x' => [
        'client_id' => getenv('X_CLIENT_ID'),
        'client_secret' => getenv('X_CLIENT_SECRET'),
        'redirect_uri' => 'http://localhost:8000/auth/x/callback',
        'auth_endpoint' => 'https://twitter.com/i/oauth2/authorize',
        'token_endpoint' => 'https://api.twitter.com/2/oauth2/token',
        'userinfo_endpoint' => 'https://api.twitter.com/2/users/me',
        'scope' => 'tweet.read users.read'
    ]
]; 