<?php
/**
 * Authentication API
 * Handles user registration, login, logout, and session verification
 */

require_once 'config.php';

$conn = getDBConnection();
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        handleRegister($conn);
        break;
    case 'login':
        handleLogin($conn);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'verify':
        handleVerify();
        break;
    case 'delete_account':
        handleDeleteAccount($conn);
        break;
    case 'forgot_password':
        handleForgotPassword($conn);
        break;
    case 'reset_password':
        handleResetPassword($conn);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

// ... existing handleRegister ...

/**
 * Handle delete account
 */
function handleDeleteAccount($conn) {
    // Verify session first
    if (!isset($_SESSION['user_id'])) {
        sendResponse(false, 'Unauthorized', null, 401);
    }
    
    $user_id = $_SESSION['user_id'];
    
    // DELETE cascades to all other tables (habits, tasks, etc) due to Foreign Keys
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    
    if ($stmt->execute()) {
        session_destroy();
        sendResponse(true, 'Account deleted successfully');
    } else {
        sendResponse(false, 'Failed to delete account', null, 500);
    }
}

/**
 * Handle forgot password (Simulated Email)
 */
function handleForgotPassword($conn) {
    $data = getJsonInput();
    validateRequired($data, ['email']);
    
    $email = sanitizeInput($data['email']);
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    if ($stmt->get_result()->num_rows === 0) {
        // For security, say sent even if not found (or say not found for easier debug)
        // I'll say not found for this personal tool
        sendResponse(false, 'Email not found', null, 404);
    }
    
    $token = bin2hex(random_bytes(32));
    
    // Store token
    $stmt = $conn->prepare("INSERT INTO password_resets (email, token) VALUES (?, ?)");
    $stmt->bind_param("ss", $email, $token);
    $stmt->execute();
    
    // Simulate Email
    $resetLink = "http://" . $_SERVER['HTTP_HOST'] . "/my%20tracker/reset-password.html?token=" . $token;
    
    // Log to file for testing (Keep this for Localhost!)
    file_put_contents('../reset_log.txt', "Reset for $email: $resetLink\n", FILE_APPEND);
    
    // --- SEND REAL EMAIL ---
    $subject = "Reset Your Password - Tracker App";
    $message = "Hi,\n\nClick the link below to reset your password:\n\n$resetLink\n\nIf you didn't ask for this, ignore this email.";
    $headers = "From: admin@tracker.app\r\n"; // <--- This is where it sends FROM
    $headers .= "Reply-To: no-reply@tracker.app\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Try to send (Suppress errors with @ so it doesn't break JSON if XAMPP isn't configured)
    @mail($email, $subject, $message, $headers);
    
    sendResponse(true, 'Password reset link sent (Check reset_log.txt if on Localhost)', ['debug_link' => $resetLink]);
}

/**
 * Handle reset password
 */
function handleResetPassword($conn) {
    $data = getJsonInput();
    validateRequired($data, ['token', 'password']);
    
    $token = sanitizeInput($data['token']);
    $password = $data['password'];
    
    // Validate token
    $stmt = $conn->prepare("SELECT email FROM password_resets WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'Invalid or expired token', null, 400);
    }
    
    $email = $result->fetch_assoc()['email'];
    
    // Update password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
    $stmt->bind_param("ss", $password_hash, $email);
    
    if ($stmt->execute()) {
        // Delete used token
        $conn->query("DELETE FROM password_resets WHERE email = '$email'");
        sendResponse(true, 'Password updated successfully');
    } else {
        sendResponse(false, 'Failed to update password', null, 500);
    }
}

// End of existing file logic (replacing close and logic)
// ... existing functions ...


/**
 * Handle user registration
 */
function handleRegister($conn) {
    $data = getJsonInput();
    validateRequired($data, ['username', 'email', 'password', 'full_name']);
    
    $username = sanitizeInput($data['username']);
    $email = sanitizeInput($data['email']);
    $password = $data['password'];
    $full_name = sanitizeInput($data['full_name']);
    
    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email format', null, 400);
    }
    
    // Validate password strength
    if (strlen($password) < 6) {
        sendResponse(false, 'Password must be at least 6 characters', null, 400);
    }
    
    // Check if username or email already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        sendResponse(false, 'Username or email already exists', null, 409);
    }
    
    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Insert user
    $stmt = $conn->prepare("INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("ssss", $username, $email, $password_hash, $full_name);
    
    if ($stmt->execute()) {
        $user_id = $conn->insert_id;
        
        // Create default categories for new user
        createDefaultCategories($conn, $user_id);
        
        // Set session
        $_SESSION['user_id'] = $user_id;
        $_SESSION['username'] = $username;
        
        sendResponse(true, 'Registration successful', [
            'user_id' => $user_id,
            'username' => $username,
            'email' => $email,
            'full_name' => $full_name
        ]);
    } else {
        // Return specific error for debugging
        sendResponse(false, 'Registration failed: ' . $stmt->error, null, 500);
    }
}

/**
 * Handle user login
 */
function handleLogin($conn) {
    $data = getJsonInput();
    validateRequired($data, ['username', 'password']);
    
    $username = sanitizeInput($data['username']);
    $password = $data['password'];
    
    // Get user
    $stmt = $conn->prepare("SELECT id, username, email, password_hash, full_name, avatar_url FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'Invalid username or password', null, 401);
    }
    
    $user = $result->fetch_assoc();
    
    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        sendResponse(false, 'Invalid username or password', null, 401);
    }
    
    // Set session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    
    sendResponse(true, 'Login successful', [
        'user_id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'full_name' => $user['full_name'],
        'avatar_url' => $user['avatar_url']
    ]);
}

/**
 * Handle logout
 */
function handleLogout() {
    session_destroy();
    sendResponse(true, 'Logout successful');
}

/**
 * Verify session
 */
function handleVerify() {
    if (!isset($_SESSION['user_id'])) {
        sendResponse(false, 'Not authenticated', null, 401);
    }
    
    $conn = getDBConnection();
    $user_id = $_SESSION['user_id'];
    
    $stmt = $conn->prepare("SELECT id, username, email, full_name, avatar_url FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        session_destroy();
        sendResponse(false, 'User not found', null, 401);
    }
    
    $user = $result->fetch_assoc();
    sendResponse(true, 'Authenticated', $user);
}

/**
 * Create default categories for new user
 */
function createDefaultCategories($conn, $user_id) {
    $categories = [
        ['Health', '#4CAF50', 'health', 'habit'],
        ['Study', '#2196F3', 'book', 'habit'],
        ['Work', '#FF9800', 'work', 'habit'],
        ['Home', '#9C27B0', 'home', 'habit'],
        ['Other', '#607D8B', 'other', 'habit'],
        ['Food', '#FF5722', 'food', 'expense'],
        ['Transport', '#00BCD4', 'transport', 'expense'],
        ['Shopping', '#E91E63', 'shopping', 'expense'],
        ['Entertainment', '#9C27B0', 'entertainment', 'expense']
    ];
    
    // Check if categories table exists before attempting insert
    $table_check = @$conn->query("SHOW TABLES LIKE 'categories'");
    if (!$table_check || $table_check->num_rows === 0) {
        // Table doesn't exist, skip default categories but don't crash registration
        return;
    }

    $stmt = $conn->prepare("INSERT INTO categories (user_id, name, color, icon, type) VALUES (?, ?, ?, ?, ?)");
    if (!$stmt) {
        // Prepare failed (e.g. wrong column names), skip but don't crash
        return;
    }

    foreach ($categories as $cat) {
        $stmt->bind_param("issss", $user_id, $cat[0], $cat[1], $cat[2], $cat[3]);
        $stmt->execute();
    }
}

$conn->close();
