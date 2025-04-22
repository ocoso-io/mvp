// Authentication state
let isAuthenticated = false;
let currentUser = null;
let authToken = null;

// DOM Elements
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.createElement('button');
logoutButton.id = 'logoutButton';
logoutButton.className = 'hero-button';
logoutButton.textContent = 'Logout';

// Create modals
function createAuthModal(type) {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    
    const content = document.createElement('div');
    content.className = 'auth-modal-content';
    
    const closeButton = document.createElement('span');
    closeButton.className = 'close-modal';
    closeButton.innerHTML = '&times;';
    
    const title = document.createElement('h2');
    title.textContent = type === 'login' ? 'Login' : 'Register';
    
    const form = document.createElement('form');
    form.id = `${type}Form`;
    
    const emailGroup = document.createElement('div');
    emailGroup.className = 'form-group';
    const emailLabel = document.createElement('label');
    emailLabel.textContent = 'Email';
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.required = true;
    emailGroup.appendChild(emailLabel);
    emailGroup.appendChild(emailInput);
    
    const passwordGroup = document.createElement('div');
    passwordGroup.className = 'form-group';
    const passwordLabel = document.createElement('label');
    passwordLabel.textContent = 'Password';
    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.name = 'password';
    passwordInput.required = true;
    passwordGroup.appendChild(passwordLabel);
    passwordGroup.appendChild(passwordInput);
    
    let confirmPasswordGroup;
    if (type === 'register') {
        confirmPasswordGroup = document.createElement('div');
        confirmPasswordGroup.className = 'form-group';
        const confirmPasswordLabel = document.createElement('label');
        confirmPasswordLabel.textContent = 'Confirm Password';
        const confirmPasswordInput = document.createElement('input');
        confirmPasswordInput.type = 'password';
        confirmPasswordInput.name = 'confirmPassword';
        confirmPasswordInput.required = true;
        confirmPasswordGroup.appendChild(confirmPasswordLabel);
        confirmPasswordGroup.appendChild(confirmPasswordInput);
    }
    
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = type === 'login' ? 'Login' : 'Register';
    
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    
    form.appendChild(emailGroup);
    form.appendChild(passwordGroup);
    if (type === 'register') {
        form.appendChild(confirmPasswordGroup);
    }
    form.appendChild(submitButton);
    form.appendChild(errorMessage);
    
    content.appendChild(closeButton);
    content.appendChild(title);
    content.appendChild(form);
    modal.appendChild(content);
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Close modal when clicking close button
    closeButton.addEventListener('click', () => {
        modal.remove();
    });
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = {
            action: type,
            email: formData.get('email'),
            password: formData.get('password')
        };
        
        if (type === 'register') {
            if (formData.get('password') !== formData.get('confirmPassword')) {
                errorMessage.textContent = 'Passwords do not match';
                return;
            }
        }
        
        try {
            const response = await fetch('api/auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Authentication failed');
            }
            
            if (type === 'login') {
                isAuthenticated = true;
                currentUser = result.user;
                authToken = result.token;
                localStorage.setItem('authToken', authToken);
                updateUI();
            }
            
            modal.remove();
            showNotification(result.message, 'success');
        } catch (error) {
            errorMessage.textContent = error.message;
            if (error.message.includes('Too many attempts')) {
                setTimeout(() => {
                    modal.remove();
                }, 3000);
            }
        }
    });
    
    return modal;
}

// Event Listeners
loginButton.addEventListener('click', () => {
    createAuthModal('login');
});

registerButton.addEventListener('click', () => {
    createAuthModal('register');
});

logoutButton.addEventListener('click', async () => {
    try {
        const response = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ action: 'logout' })
        });
        
        if (response.ok) {
            isAuthenticated = false;
            currentUser = null;
            authToken = null;
            localStorage.removeItem('authToken');
            updateUI();
            showNotification('Logged out successfully', 'success');
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Update UI based on authentication state
function updateUI() {
    const buttonGroup = document.querySelector('.button-group');
    if (isAuthenticated) {
        loginButton.style.display = 'none';
        registerButton.style.display = 'none';
        buttonGroup.appendChild(logoutButton);
    } else {
        loginButton.style.display = 'block';
        registerButton.style.display = 'block';
        if (logoutButton.parentNode === buttonGroup) {
            buttonGroup.removeChild(logoutButton);
        }
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Check for existing session on page load
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const response = await fetch('api/auth.php', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                isAuthenticated = true;
                currentUser = result.user;
                authToken = token;
                updateUI();
            } else {
                localStorage.removeItem('authToken');
            }
        } catch (error) {
            console.error('Session validation error:', error);
            localStorage.removeItem('authToken');
        }
    }
}); 