<?php
/**
 * Habits API
 * Handles CRUD operations for habits and habit logging
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$postData = null;

if ($method === 'GET') {
    if ($action === 'logs') {
        getHabitLogs($conn, $user_id);
    } else {
        getHabits($conn, $user_id);
    }
} elseif ($method === 'POST') {
    // Read JSON once for POST requests
    if ($action !== 'log') {
        $postData = getJsonInput();
        $bodyAction = $postData['action'] ?? '';
        
        // Determine action from URL or body
        if ($action === 'delete' || $bodyAction === 'delete') {
            deleteHabit($conn, $user_id, $postData);
        } elseif ($action === 'update' || $bodyAction === 'update' || !empty($postData['id'])) {
            updateHabit($conn, $user_id, $postData);
        } elseif ($action === 'log') {
            logHabit($conn, $user_id);
        } else {
            createHabit($conn, $user_id, $postData);
        }
    } else {
        logHabit($conn, $user_id);
    }
} elseif ($method === 'PUT') {
    updateHabit($conn, $user_id);
} elseif ($method === 'DELETE') {
    deleteHabit($conn, $user_id);
} else {
    sendResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get all habits for user
 */
function getHabits($conn, $user_id) {
    $date = $_GET['date'] ?? date('Y-m-d');
    
    // Optimized query with JOIN instead of subquery
    $sql = "SELECT h.*, c.name as category_name, c.color as category_color,
            hl.status as today_status
            FROM habits h
            LEFT JOIN categories c ON h.category_id = c.id
            LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.log_date = ? AND hl.user_id = ?
            WHERE h.user_id = ? AND h.is_active = 1
            ORDER BY h.created_at DESC
            LIMIT 100";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sii", $date, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $habits = [];
    while ($row = $result->fetch_assoc()) {
        $habits[] = $row;
    }
    
    sendResponse(true, 'Habits retrieved successfully', $habits);
}

/**
 * Get habit logs for a date range
 */
function getHabitLogs($conn, $user_id) {
    $start_date = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $end_date = $_GET['end_date'] ?? date('Y-m-d');
    $habit_id = $_GET['habit_id'] ?? null;
    
    $sql = "SELECT hl.*, h.title as habit_title, h.icon, h.color
            FROM habit_logs hl
            JOIN habits h ON hl.habit_id = h.id
            WHERE hl.user_id = ? AND hl.log_date BETWEEN ? AND ?";
    
    $params = [$user_id, $start_date, $end_date];
    $types = "iss";
    
    if ($habit_id) {
        $sql .= " AND hl.habit_id = ?";
        $params[] = $habit_id;
        $types .= "i";
    }
    
    $sql .= " ORDER BY hl.log_date DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $logs = [];
    while ($row = $result->fetch_assoc()) {
        $logs[] = $row;
    }
    
    sendResponse(true, 'Habit logs retrieved successfully', $logs);
}

/**
 * Create new habit
 */
function createHabit($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    validateRequired($data, ['title']);
    
    $title = sanitizeInput($data['title']);
    $description = sanitizeInput($data['description'] ?? '');
    $category_id = $data['category_id'] ?? null;
    $icon = sanitizeInput($data['icon'] ?? 'check');
    $color = sanitizeInput($data['color'] ?? '#FF4081');
    $frequency = sanitizeInput($data['frequency'] ?? 'daily');
    $target_days = isset($data['target_days']) ? json_encode($data['target_days']) : null;
    
    $stmt = $conn->prepare("INSERT INTO habits (user_id, category_id, title, description, icon, color, frequency, target_days) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iissssss", $user_id, $category_id, $title, $description, $icon, $color, $frequency, $target_days);
    
    if ($stmt->execute()) {
        $habit_id = $conn->insert_id;
        sendResponse(true, 'Habit created successfully', ['id' => $habit_id]);
    } else {
        sendResponse(false, 'Failed to create habit', null, 500);
    }
}

/**
 * Update habit
 */
function updateHabit($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    validateRequired($data, ['id']);
    
    $id = (int)$data['id'];
    $title = sanitizeInput($data['title']);
    $description = sanitizeInput($data['description'] ?? '');
    $category_id = $data['category_id'] ?? null;
    $icon = sanitizeInput($data['icon'] ?? 'check');
    $color = sanitizeInput($data['color'] ?? '#FF4081');
    $frequency = sanitizeInput($data['frequency'] ?? 'daily');
    $is_active = $data['is_active'] ?? 1;
    
    $stmt = $conn->prepare("UPDATE habits SET title = ?, description = ?, category_id = ?, icon = ?, color = ?, frequency = ?, is_active = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ssisssiii", $title, $description, $category_id, $icon, $color, $frequency, $is_active, $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Habit updated successfully');
    } else {
        sendResponse(false, 'Failed to update habit', null, 500);
    }
}

/**
 * Delete habit
 */
function deleteHabit($conn, $user_id, $data = null) {
    $id = (int)($_GET['id'] ?? 0);
    
    // Support ID from body for POST delete
    if (!$id && $data) {
        $id = isset($data['id']) ? (int)$data['id'] : 0;
    }
    
    if (!$id) {
        sendResponse(false, 'Habit ID required', null, 400);
    }
    
    $stmt = $conn->prepare("DELETE FROM habits WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Habit deleted successfully');
    } else {
        sendResponse(false, 'Failed to delete habit', null, 500);
    }
}

/**
 * Log habit completion/skip/fail
 */
function logHabit($conn, $user_id) {
    $data = getJsonInput();
    validateRequired($data, ['habit_id', 'status']);
    
    $habit_id = (int)$data['habit_id'];
    $status = sanitizeInput($data['status']);
    $log_date = $data['log_date'] ?? date('Y-m-d');
    $notes = sanitizeInput($data['notes'] ?? '');
    
    // Validate status
    if (!in_array($status, ['completed', 'skipped', 'failed'])) {
        sendResponse(false, 'Invalid status', null, 400);
    }
    
    // Insert or update log
    $stmt = $conn->prepare("INSERT INTO habit_logs (habit_id, user_id, log_date, status, notes) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = ?, notes = ?");
    $stmt->bind_param("iisssss", $habit_id, $user_id, $log_date, $status, $notes, $status, $notes);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Habit logged successfully');
    } else {
        sendResponse(false, 'Failed to log habit', null, 500);
    }
}

$conn->close();
