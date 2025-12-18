// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {

// Toggle Password Visibility
function setupPasswordToggle(toggleId, inputId) {
    const toggleBtn = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    
    console.log(`Setup toggle for ${toggleId}:`, toggleBtn, input); // Debug
    
    if (!toggleBtn || !input) return;
    
    toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
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

setupPasswordToggle('togglePassword', 'password');
setupPasswordToggle('toggleConfirmPassword', 'confirmPassword');

// Form Elements
const registerForm = document.getElementById('registerForm');
const firstNameInput = document.getElementById('firstName');
const lastNameInput = document.getElementById('lastName');
const emailInput = document.getElementById('email');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const termsCheckbox = document.getElementById('terms');

// Error Elements
const firstNameError = document.getElementById('firstNameError');
const lastNameError = document.getElementById('lastNameError');
const emailError = document.getElementById('emailError');
const usernameError = document.getElementById('usernameError');
const passwordError = document.getElementById('passwordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');
const termsError = document.getElementById('termsError');

// Password Strength Elements
const strengthFill = document.getElementById('strengthFill');
const strengthText = document.getElementById('strengthText');

// Validation Functions
function validateName(name) {
    return name.trim().length >= 2;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validateUsername(username) {
    const re = /^[a-zA-Z0-9_]{4,20}$/;
    return re.test(username);
}

function validatePassword(password) {
    return password.length >= 8;
}

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    return strength;
}

function updatePasswordStrength(password) {
    const strength = checkPasswordStrength(password);
    
    strengthFill.className = 'strength-fill';
    strengthText.className = 'strength-text';
    
    if (password.length === 0) {
        strengthFill.style.width = '0%';
        strengthText.textContent = 'Độ mạnh mật khẩu';
        strengthText.style.color = '#666';
        return;
    }
    
    // Tính phần trăm width dựa trên strength (0-5)
    const widthPercent = (strength / 5) * 100;
    strengthFill.style.width = widthPercent + '%';
    
    if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.classList.add('weak');
        strengthText.textContent = 'Yếu';
    } else if (strength <= 3) {
        strengthFill.classList.add('medium');
        strengthText.classList.add('medium');
        strengthText.textContent = 'Trung bình';
    } else {
        strengthFill.classList.add('strong');
        strengthText.classList.add('strong');
        strengthText.textContent = 'Mạnh';
    }
}

// Show/Hide Error
function showError(input, errorElement, message) {
    if (input.type === 'checkbox') {
        // For checkbox, add error class to parent
        input.parentElement.classList.add('error');
    } else {
        input.classList.add('error');
    }
    errorElement.textContent = message;
    errorElement.classList.add('show');
}

function hideError(input, errorElement) {
    if (input.type === 'checkbox') {
        // For checkbox, remove error class from parent
        input.parentElement.classList.remove('error');
    } else {
        input.classList.remove('error');
    }
    errorElement.textContent = '';
    errorElement.classList.remove('show');
}

// Real-time Validation
firstNameInput.addEventListener('blur', function() {
    if (!validateName(this.value)) {
        showError(firstNameInput, firstNameError, 'Họ phải có ít nhất 2 ký tự');
    } else {
        hideError(firstNameInput, firstNameError);
    }
});

lastNameInput.addEventListener('blur', function() {
    if (!validateName(this.value)) {
        showError(lastNameInput, lastNameError, 'Tên phải có ít nhất 2 ký tự');
    } else {
        hideError(lastNameInput, lastNameError);
    }
});

emailInput.addEventListener('blur', function() {
    if (!validateEmail(this.value)) {
        showError(emailInput, emailError, 'Email không hợp lệ');
    } else {
        hideError(emailInput, emailError);
    }
});

emailInput.addEventListener('input', function() {
    if (emailError.classList.contains('show') && validateEmail(this.value)) {
        hideError(emailInput, emailError);
    }
});

usernameInput.addEventListener('blur', function() {
    if (!validateUsername(this.value)) {
        showError(usernameInput, usernameError, 'Tên đăng nhập không hợp lệ (4-20 ký tự, chỉ chữ cái, số và _)');
    } else {
        hideError(usernameInput, usernameError);
    }
});

usernameInput.addEventListener('input', function() {
    if (usernameError.classList.contains('show') && validateUsername(this.value)) {
        hideError(usernameInput, usernameError);
    }
});

passwordInput.addEventListener('input', function() {
    updatePasswordStrength(this.value);
    
    if (passwordError.classList.contains('show') && validatePassword(this.value)) {
        hideError(passwordInput, passwordError);
    }
    
    // Check confirm password match
    if (confirmPasswordInput.value && confirmPasswordInput.value !== this.value) {
        showError(confirmPasswordInput, confirmPasswordError, 'Mật khẩu không khớp');
    } else if (confirmPasswordInput.value) {
        hideError(confirmPasswordInput, confirmPasswordError);
    }
});

passwordInput.addEventListener('blur', function() {
    if (!validatePassword(this.value)) {
        showError(passwordInput, passwordError, 'Mật khẩu phải có ít nhất 8 ký tự');
    } else {
        hideError(passwordInput, passwordError);
    }
});

confirmPasswordInput.addEventListener('input', function() {
    if (this.value !== passwordInput.value) {
        showError(confirmPasswordInput, confirmPasswordError, 'Mật khẩu không khớp');
    } else {
        hideError(confirmPasswordInput, confirmPasswordError);
    }
});

confirmPasswordInput.addEventListener('blur', function() {
    if (this.value !== passwordInput.value) {
        showError(confirmPasswordInput, confirmPasswordError, 'Mật khẩu không khớp');
    } else {
        hideError(confirmPasswordInput, confirmPasswordError);
    }
});

// Form Submission
registerForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Reset all errors
    hideError(firstNameInput, firstNameError);
    hideError(lastNameInput, lastNameError);
    hideError(emailInput, emailError);
    hideError(usernameInput, usernameError);
    hideError(passwordInput, passwordError);
    hideError(confirmPasswordInput, confirmPasswordError);
    hideError(termsCheckbox, termsError);
    
    let isValid = true;
    
    // Validate all fields
    if (!validateName(firstNameInput.value)) {
        showError(firstNameInput, firstNameError, 'Họ phải có ít nhất 2 ký tự');
        isValid = false;
    }
    
    if (!validateName(lastNameInput.value)) {
        showError(lastNameInput, lastNameError, 'Tên phải có ít nhất 2 ký tự');
        isValid = false;
    }
    
    if (!validateEmail(emailInput.value)) {
        showError(emailInput, emailError, 'Email không hợp lệ');
        isValid = false;
    }
    
    if (!validateUsername(usernameInput.value)) {
        showError(usernameInput, usernameError, 'Tên đăng nhập không hợp lệ');
        isValid = false;
    }
    
    if (!validatePassword(passwordInput.value)) {
        showError(passwordInput, passwordError, 'Mật khẩu phải có ít nhất 8 ký tự');
        isValid = false;
    }
    
    if (confirmPasswordInput.value !== passwordInput.value) {
        showError(confirmPasswordInput, confirmPasswordError, 'Mật khẩu không khớp');
        isValid = false;
    }
    
    if (!termsCheckbox.checked) {
        showError(termsCheckbox, termsError, 'Bạn phải đồng ý với điều khoản dịch vụ');
        isValid = false;
    }
    
    if (!isValid) {
        return;
    }
    
    // Show loading state
    const registerBtn = this.querySelector('.btn-register');
    registerBtn.classList.add('loading');
    registerBtn.disabled = true;
    
    // Call API to register
    try {
        const fullName = firstNameInput.value + ' ' + lastNameInput.value;
        
        const response = await fetch('http://localhost:3000/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                full_name: fullName,
                email: emailInput.value,
                username: usernameInput.value,
                password: passwordInput.value
            })
        });

        const data = await response.json();
        
        if (data.success) {
            // Success
            // If server returned user info, persist for sidebar/profile
            try {
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('userRole', data.user.role || 'customer');
                } else {
                    localStorage.setItem('userRole', 'customer');
                }
            } catch (e) {}
            showSuccessMessage();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        } else {
            // Error from server
            registerBtn.classList.remove('loading');
            registerBtn.disabled = false;
            
            // Show appropriate error message
            if (data.message.includes('Email')) {
                showError(emailInput, emailError, data.message);
            } else if (data.message.includes('Username')) {
                showError(usernameInput, usernameError, data.message);
            } else {
                showNotification(data.message, 'error');
            }
        }
        
    } catch (error) {
        registerBtn.classList.remove('loading');
        registerBtn.disabled = false;
        showNotification('Có lỗi xảy ra. Vui lòng thử lại sau.', 'error');
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
        padding: 20px 28px;
        border-radius: 12px;
        box-shadow: 0 8px 20px rgba(0, 200, 83, 0.3);
        font-weight: 600;
        z-index: 10000;
        animation: slideInRight 0.5s ease;
        max-width: 350px;
    `;
    successDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
                <div style="font-size: 16px; margin-bottom: 4px;">Đăng ký thành công!</div>
                <div style="font-size: 13px; opacity: 0.9; font-weight: 400;">Đang chuyển đến trang đăng nhập...</div>
            </div>
        </div>
    `;
    document.body.appendChild(successDiv);
}

// Social register handlers
document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const provider = this.classList.contains('google') ? 'Google' : 'Facebook';
        this.style.opacity = '0.6';
        this.style.pointerEvents = 'none';

        setTimeout(() => {
            // Simulate successful social signup/login for demo
            const demoUser = { full_name: provider + ' User', email: provider.toLowerCase() + '@example.com', role: 'customer', avatar_url: '' };
            try { localStorage.setItem('user', JSON.stringify(demoUser)); localStorage.setItem('userRole', demoUser.role); } catch (e) {}
            showNotification(`Đăng ký với ${provider} thành công (demo).`, 'success');
            this.style.opacity = '1';
            this.style.pointerEvents = 'auto';
            setTimeout(() => window.location.href = 'Index.html', 800);
        }, 800);
    });
});

// Terms link handler
document.querySelectorAll('.link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const text = this.textContent;
        showNotification(`${text} đang được cập nhật...`, 'info');
    });
});

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
`;
document.head.appendChild(style);

// Auto-focus first input
window.addEventListener('load', () => {
    firstNameInput.focus();
});

// Prevent multiple submissions
let isSubmitting = false;
registerForm.addEventListener('submit', function(e) {
    if (isSubmitting) {
        e.preventDefault();
        return false;
    }
    isSubmitting = true;
});
}); // End of DOMContentLoaded