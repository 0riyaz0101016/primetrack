<?php
/**
 * Time Tracking API - FINAL WORKING VERSION
 * All errors fixed
 */

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't show errors to user
ini_set('log_errors', 1);

require_once 'config.php';

// Ensure session is started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$conn = getDBConnection();
$user_id = getCurrentUserId();
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Check if time_entries table exists
$result = @$conn->query("SHOW TABLES LIKE 'time_entries'");
if (!$result || $result->num_rows === 0) {
    sendResponse(false, 'Time tracking feature not set up. Please create time_entries table.', null, 503);
}

if ($method === 'GET') {
    getTimeEntries($conn, $user_id);
} elseif ($method === 'POST') {
    $postData = getJsonInput();
    $bodyAction = isset($postData['action']) ? $postData['action'] : '';
    
    if ($action === 'delete' || $bodyAction === 'delete') {
        deleteTimeEntry($conn, $user_id, $postData);
    } elseif ($action === 'update' || $bodyAction === 'update' || !empty($postData['id'])) {
        updateTimeEntry($conn, $user_id, $postData);
    } else {
        createTimeEntry($conn, $user_id, $postData);
    }
} else {
    sendResponse(false, 'Method not allowed', null, 405);
}

function getTimeEntries($conn, $user_id) {
    $start_date = isset($_GET['start_date']) ? $_GET['start_date'] : date('Y-m-01');
    $end_date = isset($_GET['end_date']) ? $_GET['end_date'] : date('Y-m-t');
    
    $sql = "SELECT * FROM time_entries 
            WHERE user_id = ? AND entry_date BETWEEN ? AND ? 
            ORDER BY entry_date DESC, created_at DESC";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        sendResponse(false, 'Database error: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("iss", $user_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $entries = [];
    $total_minutes = 0;
    $by_category = [];
    
    while ($row = $result->fetch_assoc()) {
        $entries[] = $row;
        $total_minutes += (int)$row['duration_minutes'];
        
        $category = isset($row['category']) ? $row['category'] : 'other';
        if (!isset($by_category[$category])) {
            $by_category[$category] = 0;
        }
        $by_category[$category] += (int)$row['duration_minutes'];
    }
    
    sendResponse(true, 'Time entries retrieved', [
        'entries' => $entries,
        'total_minutes' => $total_minutes,
        'by_category' => $by_category
    ]);
}

function createTimeEntry($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    
    // Validate required fields
    if (empty($data['activity_name']) || empty($data['duration_minutes']) || empty($data['entry_date'])) {
        sendResponse(false, 'Missing required fields', null, 400);
    }
    
    $activity_name = sanitizeInput($data['activity_name']);
    $category = isset($data['category']) ? sanitizeInput($data['category']) : 'other';
    $duration_minutes = (int)$data['duration_minutes'];
    $entry_date = sanitizeInput($data['entry_date']);
    $notes = isset($data['notes']) ? sanitizeInput($data['notes']) : '';
    
    $stmt = $conn->prepare("INSERT INTO time_entries (user_id, activity_name, category, duration_minutes, entry_date, notes) VALUES (?, ?, ?, ?, ?, ?)");
    if (!$stmt) {
        sendResponse(false, 'Database error: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("ississ", $user_id, $activity_name, $category, $duration_minutes, $entry_date, $notes);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Time entry added successfully', ['id' => $conn->insert_id]);
    } else {
        sendResponse(false, 'Failed to add time entry: ' . $stmt->error, null, 500);
    }
}

function updateTimeEntry($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    
    if (empty($data['id'])) {
        sendResponse(false, 'ID required', null, 400);
    }
    
    $id = (int)$data['id'];
    $activity_name = sanitizeInput($data['activity_name']);
    $category = isset($data['category']) ? sanitizeInput($data['category']) : 'other';
    $duration_minutes = (int)$data['duration_minutes'];
    $entry_date = sanitizeInput($data['entry_date']);
    $notes = isset($data['notes']) ? sanitizeInput($data['notes']) : '';
    
    $stmt = $conn->prepare("UPDATE time_entries SET activity_name = ?, category = ?, duration_minutes = ?, entry_date = ?, notes = ? WHERE id = ? AND user_id = ?");
    if (!$stmt) {
        sendResponse(false, 'Database error: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("ssissii", $activity_name, $category, $duration_minutes, $entry_date, $notes, $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Time entry updated successfully');
    } else {
        sendResponse(false, 'Failed to update time entry: ' . $stmt->error, null, 500);
    }
}

function deleteTimeEntry($conn, $user_id, $data = null) {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    
    if (!$id && $data) {
        $id = isset($data['id']) ? (int)$data['id'] : 0;
    }
    
    if (!$id) {
        sendResponse(false, 'Time entry ID required', null, 400);
    }
    
    $stmt = $conn->prepare("DELETE FROM time_entries WHERE id = ? AND user_id = ?");
    if (!$stmt) {
        sendResponse(false, 'Database error: ' . $conn->error, null, 500);
    }
    
    $stmt->bind_param("ii", $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Time entry deleted successfully');
    } else {
        sendResponse(false, 'Failed to delete time entry: ' . $stmt->error, null, 500);
    }
}

$conn->close();
