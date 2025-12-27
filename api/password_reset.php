<?php
/**
 * Simple Password Reset (No Email Required)
 * For localhost/InfinityFree where email doesn't work
 */

require_once 'config.php';

$action = $_GET['action'] ?? '';
$conn = getDBConnection();

if ($action === 'request') {
    handleResetRequest($conn);
} elseif ($action === 'verify') {
    verifyResetCode($conn);
} elseif ($action === 'reset') {
    resetPassword($conn);
} else {
    sendResponse(false, 'Invalid action', null, 400);
}

/**
 * Step 1: Request reset - Generate code
 */
function handleResetRequest($conn) {
    $data = getJsonInput();
    validateRequired($data, ['email']);
    
    $email = sanitizeInput($data['email']);
    
    // Check if user exists
    $stmt = $conn->prepare("SELECT id, username FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'Email not found', null, 404);
    }
    
    $user = $result->fetch_assoc();
    
    // Generate 6-digit code
    $code = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires = date('Y-m-d H:i:s', strtotime('+15 minutes'));
    
    // Store code
    $stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    
    $stmt = $conn->prepare("INSERT INTO password_resets (email, token, created_at) VALUES (?, ?, ?)");
    $stmt->bind_param("sss", $email, $code, $expires);
    $stmt->execute();
    
    // For localhost/testing - show code in response
    // In production, send via email
    sendResponse(true, 'Reset code generated', [
        'code' => $code, // Remove this in production!
        'expires_in' => '15 minutes',
        'message' => "Your reset code is: $code (valid for 15 minutes)"
    ]);
}

/**
 * Step 2: Verify code
 */
function verifyResetCode($conn) {
    $data = getJsonInput();
    validateRequired($data, ['email', 'code']);
    
    $email = sanitizeInput($data['email']);
    $code = sanitizeInput($data['code']);
    
    $stmt = $conn->prepare("SELECT token, created_at FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'No reset request found', null, 404);
    }
    
    $reset = $result->fetch_assoc();
    
    // Check if expired (15 minutes)
    if (strtotime($reset['created_at']) < strtotime('-15 minutes')) {
        sendResponse(false, 'Reset code expired. Request a new one.', null, 400);
    }
    
    // Verify code
    if ($reset['token'] !== $code) {
        sendResponse(false, 'Invalid code', null, 400);
    }
    
    sendResponse(true, 'Code verified', ['email' => $email]);
}

/**
 * Step 3: Reset password
 */
function resetPassword($conn) {
    $data = getJsonInput();
    validateRequired($data, ['email', 'code', 'new_password']);
    
    $email = sanitizeInput($data['email']);
    $code = sanitizeInput($data['code']);
    $newPassword = $data['new_password'];
    
    // Verify code again
    $stmt = $conn->prepare("SELECT token, created_at FROM password_resets WHERE email = ? ORDER BY created_at DESC LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0 || $result->fetch_assoc()['token'] !== $code) {
        sendResponse(false, 'Invalid or expired code', null, 400);
    }
    
    // Update password
    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE email = ?");
    $stmt->bind_param("ss", $passwordHash, $email);
    
    if ($stmt->execute()) {
        // Delete used reset code
        $stmt = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        
        sendResponse(true, 'Password reset successfully');
    } else {
        sendResponse(false, 'Failed to reset password', null, 500);
    }
}

$conn->close();
