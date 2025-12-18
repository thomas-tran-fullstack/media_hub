// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

// Toggle Password Visibility
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function(e) {
        e.preventDefault();
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const eyeIcon = this.querySelector('.eye-icon');
        if (type === 'text') {
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    });
}

// Form Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) || email.length >= 3;
}

// Password validation
function validatePassword(password) {
    return password.length >= 6;
}

// Show error
function showError(input, errorElement, message) {
    input.classList.add('error');
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

// Hide error
function hideError(input, errorElement) {
    input.classList.remove('error');
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

// Real-time validation
emailInput.addEventListener('blur', function() {
    if (!validateEmail(this.value)) {
        showError(emailInput, emailError, 'Vui lòng nhập email hoặc tên đăng nhập hợp lệ');
    } else {
        hideError(emailInput, emailError);
    }
});

emailInput.addEventListener('input', function() {
    if (emailError.classList.contains('show')) {
        if (validateEmail(this.value)) {
            hideError(emailInput, emailError);
        }
    }
});

passwordInput.addEventListener('blur', function() {
    if (!validatePassword(this.value)) {
        showError(passwordInput, passwordError, 'Mật khẩu phải có ít nhất 6 ký tự');
    } else {
        hideError(passwordInput, passwordError);
    }
});

passwordInput.addEventListener('input', function() {
    if (passwordError.classList.contains('show')) {
        if (validatePassword(this.value)) {
            hideError(passwordInput, passwordError);
        }
    }
});

// Form submission
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Reset errors
    hideError(emailInput, emailError);
    hideError(passwordInput, passwordError);
    
    let isValid = true;
    
    // Validate email
    if (!validateEmail(emailInput.value)) {
        showError(emailInput, emailError, 'Vui lòng nhập email hoặc tên đăng nhập hợp lệ');
        isValid = false;
    }
    
    // Validate password
    if (!validatePassword(passwordInput.value)) {
        showError(passwordInput, passwordError, 'Mật khẩu phải có ít nhất 6 ký tự');
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Show loading state
    const loginBtn = this.querySelector('.btn-login');
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    
    // Call API to login
    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                email: emailInput.value,
                password: passwordInput.value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Success - save user info and redirect
            localStorage.setItem('user', JSON.stringify(data.user));
            // Mark role for profile page defaults and sidebar sync
            try { localStorage.setItem('userRole', data.user.role || 'customer'); } catch (e) {}
            showSuccessMessage();
            
            setTimeout(() => {
                window.location.href = 'Index.html';
            }, 1500);
        } else {
            // Error from server
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
            showError(passwordInput, passwordError, 'Sai tên tài khoản/email hoặc mật khẩu, vui lòng thử lại');
        }
        
    } catch (error) {
        // Network or other errors
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        showError(passwordInput, passwordError, 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    }
});

// Success message
function showSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00C853, #00A344);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0, 200, 83, 0.3);
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.5s ease;
    `;
    successDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Đăng nhập thành công!</span>
        </div>
    `;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => successDiv.remove(), 500);
    }, 1000);
}

// Social login handlers
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const provider = this.classList.contains('google') ? 'Google' : 'Facebook';
        
        // Add loading animation
        this.style.opacity = '0.6';
        this.style.pointerEvents = 'none';

        // Simulate social login (demo)
        setTimeout(() => {
            const demoUser = { full_name: provider + ' User', email: provider.toLowerCase() + '@example.com', role: 'customer', avatar_url: '' };
            try { localStorage.setItem('user', JSON.stringify(demoUser)); localStorage.setItem('userRole', demoUser.role); } catch (e) {}
            showSuccessMessage();
            this.style.opacity = '1';
            this.style.pointerEvents = 'auto';
            setTimeout(() => window.location.href = 'Index.html', 700);
        }, 800);
    });
});

// Forgot password handler
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const backToLoginLink = document.getElementById('backToLogin');
const loginFormContainer = document.getElementById('loginFormContainer');
const forgotPasswordContainer = document.getElementById('forgotPasswordContainer');
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const resetEmailInput = document.getElementById('resetEmail');
const resetEmailError = document.getElementById('resetEmailError');

// Show Forgot Password Form
forgotPasswordLink.addEventListener('click', function(e) {
    e.preventDefault();
    
    // Add animation classes
    loginFormContainer.classList.add('slide-out-left');
    
    setTimeout(() => {
        loginFormContainer.classList.add('hidden');
        loginFormContainer.classList.remove('slide-out-left');
        
        forgotPasswordContainer.classList.remove('hidden');
        forgotPasswordContainer.classList.add('slide-in-right');
        
        // Focus on reset email
        resetEmailInput.focus();
    }, 500);
});

// Back to Login Form
backToLoginLink.addEventListener('click', function(e) {
    e.preventDefault();
    
    forgotPasswordContainer.classList.remove('slide-in-right');
    forgotPasswordContainer.classList.add('slide-out-right');
    
    setTimeout(() => {
        forgotPasswordContainer.classList.add('hidden');
        forgotPasswordContainer.classList.remove('slide-out-right');
        
        loginFormContainer.classList.remove('hidden');
        loginFormContainer.classList.add('slide-in-left');
        
        setTimeout(() => {
            loginFormContainer.classList.remove('slide-in-left');
        }, 500);
    }, 500);
});

// Validate reset email on real-time
resetEmailInput.addEventListener('blur', function() {
    if (!validateEmail(this.value)) {
        showError(resetEmailInput, resetEmailError, 'Vui lòng nhập email hợp lệ');
    } else {
        hideError(resetEmailInput, resetEmailError);
    }
});

resetEmailInput.addEventListener('input', function() {
    if (resetEmailError.classList.contains('show')) {
        if (validateEmail(this.value)) {
            hideError(resetEmailInput, resetEmailError);
        }
    }
});

// Handle Reset Password Submit
forgotPasswordForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validation
    if (!validateEmail(resetEmailInput.value)) {
        showError(resetEmailInput, resetEmailError, 'Vui lòng nhập email hợp lệ');
        return;
    }
    
    const resetBtn = this.querySelector('.btn-login');
    resetBtn.classList.add('loading');
    resetBtn.disabled = true;
    
    try {
        await simulateResetPassword(resetEmailInput.value);
        
        showNotification('Đã gửi liên kết khôi phục mật khẩu đến email của bạn!', 'success');
        
        // Reset form and go back to login after delay
        setTimeout(() => {
            backToLoginLink.click();
            resetEmailInput.value = '';
            resetBtn.classList.remove('loading');
            resetBtn.disabled = false;
        }, 2000);
        
    } catch (error) {
        showNotification(error.message, 'error');
        resetBtn.classList.remove('loading');
        resetBtn.disabled = false;
    }
});

function simulateResetPassword(email) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (email) {
                resolve({ success: true });
            } else {
                reject({ message: 'Có lỗi xảy ra. Vui lòng thử lại.' });
            }
        }, 1500);
    });
}

// Notification helper
function showNotification(message, type = 'info') {
    const colors = {
        success: 'linear-gradient(135deg, #00C853, #00A344)',
        error: 'linear-gradient(135deg, #FF4444, #CC0000)',
        info: 'linear-gradient(135deg, #0066FF, #0052CC)'
    };
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    @keyframes slideInLeft {
        from {
            transform: translateX(-400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutLeft {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(-400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Auto-focus first input
emailInput.focus();

// Prevent multiple form submissions
let isSubmitting = false;
loginForm.addEventListener('submit', function(e) {
    if (isSubmitting) {
        e.preventDefault();
        return false;
    }
    isSubmitting = true;
    
    setTimeout(() => {
        isSubmitting = false;
    }, 5000);
});

// Remember me functionality
const rememberCheckbox = document.getElementById('remember');
const savedEmail = localStorage.getItem('rememberedEmail');

if (savedEmail) {
    emailInput.value = savedEmail;
    rememberCheckbox.checked = true;
}

rememberCheckbox.addEventListener('change', function() {
    if (this.checked && emailInput.value) {
        localStorage.setItem('rememberedEmail', emailInput.value);
    } else {
        localStorage.removeItem('rememberedEmail');
    }
});

// Save email when checkbox is checked
emailInput.addEventListener('blur', function() {
    if (rememberCheckbox.checked && this.value) {
        localStorage.setItem('rememberedEmail', this.value);
    }
});

}); // Close DOMContentLoaded event listener
