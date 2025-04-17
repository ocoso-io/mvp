// Social Login Handler
async function handleSocialLogin(provider) {
    try {
        // Get OAuth configuration
        const config = await fetch(`/api/config/social-login.php?provider=${provider}`)
            .then(response => response.json());

        // Redirect to OAuth provider
        const authUrl = new URL(config.authUrl);
        authUrl.searchParams.append('client_id', config.clientId);
        authUrl.searchParams.append('redirect_uri', config.redirectUri);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('scope', config.scope);
        authUrl.searchParams.append('state', generateState());

        window.location.href = authUrl.toString();
    } catch (error) {
        console.error('Social login error:', error);
        showError('Failed to initiate social login');
    }
}

// Generate random state for OAuth security
function generateState() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
}

// Handle OAuth callback
async function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const provider = urlParams.get('provider');

    if (code && state && provider) {
        try {
            const response = await fetch('/api/social-login.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    state,
                    provider
                })
            });

            const data = await response.json();

            if (data.success) {
                // Store token and user data
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Redirect to dashboard or home page
                window.location.href = '/dashboard.html';
            } else {
                showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('OAuth callback error:', error);
            showError('Failed to complete login');
        }
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Initialize social login
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the OAuth callback page
    if (window.location.pathname.includes('oauth-callback.html')) {
        handleOAuthCallback();
    }
}); 