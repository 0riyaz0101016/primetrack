<?php
/**
 * Moods API
 * Handles logging and retrieving moods
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getMoods($conn, $user_id);
        break;
    case 'POST':
        saveMood($conn, $user_id);
        break;
    default:
        sendResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get moods
 */
function getMoods($conn, $user_id) {
    // If specific date requested (e.g., today)
    if (isset($_GET['date'])) {
        $date = $_GET['date'];
        $stmt = $conn->prepare("SELECT * FROM moods WHERE user_id = ? AND mood_date = ?");
        $stmt->bind_param("is", $user_id, $date);
        $stmt->execute();
        $result = $stmt->get_result();
        $mood = $result->fetch_assoc();
        
        sendResponse(true, 'Mood retrieved', $mood);
    }
    // Date range for calendar/stats
    elseif (isset($_GET['start_date']) && isset($_GET['end_date'])) {
        $start_date = $_GET['start_date'];
        $end_date = $_GET['end_date'];
        
        $stmt = $conn->prepare("SELECT * FROM moods WHERE user_id = ? AND mood_date BETWEEN ? AND ? ORDER BY mood_date ASC");
        $stmt->bind_param("iss", $user_id, $start_date, $end_date);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $moods = [];
        while ($row = $result->fetch_assoc()) {
            $moods[] = $row;
        }
        
        sendResponse(true, 'Moods retrieved', $moods);
    } 
    else {
        sendResponse(false, 'Missing date parameters', null, 400);
    }
}

/**
 * Save (Log) Mood
 */
function saveMood($conn, $user_id) {
    $data = getJsonInput();
    validateRequired($data, ['mood_level', 'mood_emoji']);
    
    $mood_level = (int)$data['mood_level'];
    $mood_emoji = sanitizeInput($data['mood_emoji']);
    $notes = isset($data['notes']) ? sanitizeInput($data['notes']) : '';
    $mood_date = isset($data['mood_date']) ? sanitizeInput($data['mood_date']) : date('Y-m-d');
    
    // Validate level range
    if ($mood_level < 1 || $mood_level > 5) {
        sendResponse(false, 'Mood level must be between 1 and 5', null, 400);
    }
    
    // Insert or Update on duplicate date
    $stmt = $conn->prepare("INSERT INTO moods (user_id, mood_date, mood_level, mood_emoji, notes) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mood_level = ?, mood_emoji = ?, notes = ?");
    $stmt->bind_param("isisssis", $user_id, $mood_date, $mood_level, $mood_emoji, $notes, $mood_level, $mood_emoji, $notes);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Mood saved successfully');
    } else {
        sendResponse(false, 'Failed to save mood', null, 500);
    }
}

$conn->close();
