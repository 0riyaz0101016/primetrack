/**
 * Authentication Pages
 * Handles login and registration
 */

/**
 * Show authentication page
 */
function showAuthPage() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="auth-container">
            <div class="card auth-card">
                <div class="auth-header">
                    <h1 class="auth-logo">✨ Tracker</h1>
                    <p class="auth-subtitle">Track your habits, tasks, and life</p>
                </div>
                
                <div id="authContent">
                    ${renderLoginForm()}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render login form
 */
function renderLoginForm() {
    return `
        <form onsubmit="handleLogin(event)">
            <div class="form-group">
                <label class="form-label">Username or Email</label>
                <input type="text" class="form-input" name="username" required autocomplete="username">
            </div>
            
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-input" name="password" required autocomplete="current-password">
            </div>
            
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 16px;">
                <span class="material-symbols-rounded">login</span>
                Login
            </button>
        </form>
        
        <div style="text-align: center; margin-bottom: 16px;">
            <a href="#" class="auth-link" onclick="showForgotPasswordForm(); return false;">Forgot Password?</a>
        </div>
        
        <div class="auth-footer">
            Don't have an account? 
            <a href="#" class="auth-link" onclick="showRegisterForm(); return false;">Sign up</a>
        </div>
    `;
}

// ... existing code ...

/**
 * Render forgot password form
 */
function renderForgotPasswordForm() {
    return `
        <form onsubmit="handleForgotPassword(event)">
            <p style="margin-bottom: 20px; color: var(--text-secondary); text-align: center;">
                Enter your email address and we'll send you a link to reset your password.
            </p>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" name="email" required autocomplete="email">
            </div>
            
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 16px;">
                <span class="material-symbols-rounded">send</span>
                Send Reset Link
            </button>
        </form>
        
        <div class="auth-footer">
            <a href="#" class="auth-link" onclick="showLoginForm(); return false;">Back to Login</a>
        </div>
    `;
}

/**
 * Show forgot password form
 */
function showForgotPasswordForm() {
    document.getElementById('authContent').innerHTML = renderForgotPasswordForm();
}

/**
 * Handle forgot password - Step 1: Request code
 */
async function handleForgotPassword(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const email = formData.get('email');

    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    button.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
        const response = await fetch(`${API_BASE}/password_reset.php?action=request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const result = await response.json();

        if (result.success) {
            showToast(result.data.message, 'success');
            // Show code verification form
            showCodeVerificationForm(email, result.data.code);
        } else {
            showToast(result.message || 'Email not found', 'error');
        }
    } catch (error) {
        showToast('Network error. Please try again.', 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = 'Send Reset Code';
    }
}

/**
 * Show code verification form
 */
function showCodeVerificationForm(email, code) {
    document.getElementById('authContent').innerHTML = `
        <div class="auth-card">
            <h2 class="auth-title">Enter Reset Code</h2>
            <p class="auth-subtitle">A 6-digit code has been generated: <strong>${code}</strong></p>
            <form onsubmit="verifyResetCode(event, '${email}')">
                <div class="form-group">
                    <label class="form-label">Reset Code</label>
                    <input type="text" class="form-input" name="code" required maxlength="6" placeholder="000000" pattern="[0-9]{6}">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Verify Code</button>
            </form>
            <p class="auth-link">
                <a href="#" onclick="renderLoginForm(); return false;">Back to Login</a>
            </p>
        </div>
    `;
}

/**
 * Verify reset code - Step 2
 */
async function verifyResetCode(event, email) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const code = formData.get('code');

    try {
        const response = await fetch(`${API_BASE}/password_reset.php?action=verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Code verified!', 'success');
            showNewPasswordForm(email, code);
        } else {
            showToast(result.message || 'Invalid code', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

/**
 * Show new password form - Step 3
 */
function showNewPasswordForm(email, code) {
    document.getElementById('authContent').innerHTML = `
        <div class="auth-card">
            <h2 class="auth-title">Set New Password</h2>
            <form onsubmit="resetPassword(event, '${email}', '${code}')">
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-input" name="new_password" required minlength="6" placeholder="Enter new password">
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm Password</label>
                    <input type="password" class="form-input" name="confirm_password" required minlength="6" placeholder="Confirm new password">
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%;">Reset Password</button>
            </form>
        </div>
    `;
}

/**
 * Reset password - Final step
 */
async function resetPassword(event, email, code) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const newPassword = formData.get('new_password');
    const confirmPassword = formData.get('confirm_password');

    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/password_reset.php?action=reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, new_password: newPassword })
        });

        const result = await response.json();

        if (result.success) {
            showToast('Password reset successfully! Please login.', 'success');
            setTimeout(() => renderLoginForm(), 2000);
        } else {
            showToast(result.message || 'Failed to reset password', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

// ... existing handleRegister ...

/**
 * Render register form
 */
function renderRegisterForm() {
    return `
        <form onsubmit="handleRegister(event)">
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" name="full_name" required autocomplete="name">
            </div>
            
            <div class="form-group">
                <label class="form-label">Username</label>
                <input type="text" class="form-input" name="username" required autocomplete="username">
            </div>
            
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" name="email" required autocomplete="email">
            </div>
            
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-input" name="password" required autocomplete="new-password" minlength="6">
            </div>
            
            <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 16px;">
                <span class="material-symbols-rounded">person_add</span>
                Sign Up
            </button>
        </form>
        
        <div class="auth-footer">
            Already have an account? 
            <a href="#" class="auth-link" onclick="showLoginForm(); return false;">Login</a>
        </div>
    `;
}

/**
 * Show register form
 */
function showRegisterForm() {
    document.getElementById('authContent').innerHTML = renderRegisterForm();
}

/**
 * Show login form
 */
function showLoginForm() {
    document.getElementById('authContent').innerHTML = renderLoginForm();
}

/**
 * Handle login with Timeout & Safety Checks
 */
async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    const button = event.target.querySelector('button[type="submit"]');
    const originalBtnContent = button.innerHTML;

    // Disable button and show spinner
    button.disabled = true;
    button.innerHTML = '<div class="spinner spinner-sm"></div>';

    // Safety Timeout: If server doesn't respond in 15 seconds, stop loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_BASE}/auth.php?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear timeout if response received

        // Check if response is JSON (InfinityFree sometimes sends HTML error pages)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned invalid format (likely downtime or firewall). Please wait a moment and try again.");
        }

        const result = await response.json();

        if (result.success) {
            AppState.currentUser = result.data;
            showToast('Login successful!', 'success');
            initApp();
        } else {
            showToast(result.message || 'Login failed', 'error');
            resetButton();
        }
    } catch (error) {
        console.error('Login error:', error);

        let msg = 'Login failed. Please try again.';
        if (error.name === 'AbortError') {
            msg = 'Request timed out. Server is slow, please try again.';
        } else if (error.message.includes("Server returned")) {
            msg = error.message;
        }

        showToast(msg, 'error');
        resetButton();
    }

    function resetButton() {
        button.disabled = false;
        button.innerHTML = originalBtnContent;
    }
}

/**
 * Handle registration
 */
/**
 * Handle registration with Timeout & Safety Checks
 */
async function handleRegister(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        full_name: formData.get('full_name'),
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };

    const button = event.target.querySelector('button[type="submit"]');
    const originalBtnContent = button.innerHTML;

    // Disable button and show spinner
    button.disabled = true;
    button.innerHTML = '<div class="spinner spinner-sm"></div>';

    // Safety Timeout: If server doesn't respond in 15 seconds, stop loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${API_BASE}/auth.php?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: controller.signal
        });

        clearTimeout(timeoutId); // Clear timeout if response received

        // Check if response is JSON (InfinityFree sometimes sends HTML error pages)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            // Log the HTML response for debugging if possible, or just throw
            const text = await response.text();
            console.error('Server returned non-JSON:', text);
            throw new Error("Server Error (500). Please check your database connection or table structure.");
        }

        const result = await response.json();

        if (result.success) {
            AppState.currentUser = result.data;
            showToast('Registration successful!', 'success');
            initApp();
        } else {
            showToast(result.message || 'Registration failed', 'error');
            resetButton();
        }
    } catch (error) {
        console.error('Registration error:', error);

        let msg = 'Registration failed. Please try again.';
        if (error.name === 'AbortError') {
            msg = 'Request timed out. Server is slow, please try again.';
        } else if (error.message.includes("Server Error")) {
            msg = error.message;
        }

        showToast(msg, 'error');
        resetButton();
    }

    function resetButton() {
        button.disabled = false;
        button.innerHTML = originalBtnContent;
    }
}
