<?php
/**
 * Tasks API
 * Handles CRUD operations for tasks
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
$method = $_SERVER['REQUEST_METHOD'];
$postData = null;

if ($method === 'GET') {
    getTasks($conn, $user_id);
} elseif ($method === 'POST') {
    // Read JSON once for POST requests
    $postData = getJsonInput();
    
    // Check URL action OR body action OR presence of ID
    $action = $_GET['action'] ?? ($postData['action'] ?? '');
    
    if ($action === 'delete') {
        deleteTask($conn, $user_id, $postData);
    } elseif ($action === 'update' || !empty($postData['id'])) {
        // If action is update OR we have an ID, treat as update
        updateTask($conn, $user_id, $postData);
    } else {
        createTask($conn, $user_id, $postData);
    }
} elseif ($method === 'PUT') {
    updateTask($conn, $user_id);
} elseif ($method === 'DELETE') {
    deleteTask($conn, $user_id);
} else {
    sendResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get all tasks for user
 */
function getTasks($conn, $user_id) {
    $date = $_GET['date'] ?? date('Y-m-d');
    $status = $_GET['status'] ?? 'all';
    
    $sql = "SELECT t.*, c.name as category_name, c.color as category_color
            FROM tasks t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = ?";
    
    $params = [$user_id];
    $types = "i";
    
    if ($status !== 'all') {
        $sql .= " AND t.status = ?";
        $params[] = $status;
        $types .= "s";
    }
    
    // Filter by date for today view
    if (isset($_GET['today']) && $_GET['today'] === '1') {
        $sql .= " AND (t.due_date = ? OR t.task_type = 'periodic')";
        $params[] = $date;
        $types .= "s";
    }
    
    $sql .= " ORDER BY t.priority DESC, t.due_date ASC, t.due_time ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    
    sendResponse(true, 'Tasks retrieved successfully', $tasks);
}

/**
 * Create new task
 */
function createTask($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    validateRequired($data, ['title']);
    
    $title = sanitizeInput($data['title']);
    $description = sanitizeInput($data['description'] ?? '');
    $category_id = $data['category_id'] ?? null;
    $icon = sanitizeInput($data['icon'] ?? 'task');
    $color = sanitizeInput($data['color'] ?? '#FF4081');
    $task_type = sanitizeInput($data['task_type'] ?? 'one-time');
    $due_date = $data['due_date'] ?? null;
    $due_time = $data['due_time'] ?? null;
    $priority = sanitizeInput($data['priority'] ?? 'medium');
    $recurrence_pattern = sanitizeInput($data['recurrence_pattern'] ?? '');
    
    $stmt = $conn->prepare("INSERT INTO tasks (user_id, category_id, title, description, icon, color, task_type, due_date, due_time, priority, recurrence_pattern) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iisssssssss", $user_id, $category_id, $title, $description, $icon, $color, $task_type, $due_date, $due_time, $priority, $recurrence_pattern);
    
    if ($stmt->execute()) {
        $task_id = $conn->insert_id;
        sendResponse(true, 'Task created successfully', ['id' => $task_id]);
    } else {
        sendResponse(false, 'Failed to create task', null, 500);
    }
}

/**
 * Update task
 */
function updateTask($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    validateRequired($data, ['id']);
    
    $id = (int)$data['id'];
    
    // Fetch existing task to support partial updates
    $stmt = $conn->prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $existing = $result->fetch_assoc();
    
    if (!$existing) {
        sendResponse(false, 'Task not found', null, 404);
    }
    
    // Use provided data or fall back to existing data
    $title = isset($data['title']) ? sanitizeInput($data['title']) : $existing['title'];
    $description = isset($data['description']) ? sanitizeInput($data['description']) : $existing['description'];
    $category_id = isset($data['category_id']) ? $data['category_id'] : $existing['category_id'];
    $icon = isset($data['icon']) ? sanitizeInput($data['icon']) : $existing['icon'];
    $color = isset($data['color']) ? sanitizeInput($data['color']) : $existing['color'];
    $task_type = isset($data['task_type']) ? sanitizeInput($data['task_type']) : $existing['task_type'];
    $due_date = isset($data['due_date']) ? $data['due_date'] : $existing['due_date'];
    $due_time = isset($data['due_time']) ? $data['due_time'] : $existing['due_time'];
    $priority = isset($data['priority']) ? sanitizeInput($data['priority']) : $existing['priority'];
    $status = isset($data['status']) ? sanitizeInput($data['status']) : $existing['status'];
    
    // Set completed_at if status is completed
    $completed_at = ($status === 'completed' && $existing['status'] !== 'completed') ? date('Y-m-d H:i:s') : $existing['completed_at'];
    if ($status === 'pending') $completed_at = null;
    
    $stmt = $conn->prepare("UPDATE tasks SET title = ?, description = ?, category_id = ?, icon = ?, color = ?, task_type = ?, due_date = ?, due_time = ?, priority = ?, status = ?, completed_at = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ssissssssssii", $title, $description, $category_id, $icon, $color, $task_type, $due_date, $due_time, $priority, $status, $completed_at, $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Task updated successfully');
    } else {
        sendResponse(false, 'Failed to update task', null, 500);
    }
}

/**
 * Delete task
 */
function deleteTask($conn, $user_id, $data = null) {
    $id = (int)($_GET['id'] ?? 0);
    
    // Support ID from body for POST delete
    if (!$id && $data) {
        $id = isset($data['id']) ? (int)$data['id'] : 0;
    }
    
    if (!$id) {
        sendResponse(false, 'Task ID required', null, 400);
    }
    
    $stmt = $conn->prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Task deleted successfully');
    } else {
        sendResponse(false, 'Failed to delete task', null, 500);
    }
}

$conn->close();
