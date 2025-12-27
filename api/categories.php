<?php
/**
 * Categories API
 * Handles CRUD operations for categories
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        getCategories($conn, $user_id);
        break;
    case 'POST':
        createCategory($conn, $user_id);
        break;
    case 'PUT':
        updateCategory($conn, $user_id);
        break;
    case 'DELETE':
        deleteCategory($conn, $user_id);
        break;
    default:
        sendResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get all categories for user
 */
function getCategories($conn, $user_id) {
    $type = $_GET['type'] ?? 'all';
    
    $sql = "SELECT * FROM categories WHERE user_id = ?";
    $params = [$user_id];
    $types = "i";
    
    if ($type !== 'all') {
        $sql .= " AND type = ?";
        $params[] = $type;
        $types .= "s";
    }
    
    $sql .= " ORDER BY name ASC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
    
    // If no categories found, return empty array (user needs to register first)
    sendResponse(true, 'Categories retrieved successfully', $categories);
}

/**
 * Create new category
 */
function createCategory($conn, $user_id) {
    $data = getJsonInput();
    validateRequired($data, ['name']);
    
    $name = sanitizeInput($data['name']);
    $color = sanitizeInput($data['color'] ?? '#FF4081');
    $icon = sanitizeInput($data['icon'] ?? 'default');
    $type = sanitizeInput($data['type'] ?? 'habit');
    
    $stmt = $conn->prepare("INSERT INTO categories (user_id, name, color, icon, type) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("issss", $user_id, $name, $color, $icon, $type);
    
    if ($stmt->execute()) {
        $category_id = $conn->insert_id;
        sendResponse(true, 'Category created successfully', ['id' => $category_id]);
    } else {
        sendResponse(false, 'Failed to create category', null, 500);
    }
}

/**
 * Update category
 */
function updateCategory($conn, $user_id) {
    $data = getJsonInput();
    validateRequired($data, ['id', 'name']);
    
    $id = (int)$data['id'];
    $name = sanitizeInput($data['name']);
    $color = sanitizeInput($data['color'] ?? '#FF4081');
    $icon = sanitizeInput($data['icon'] ?? 'default');
    
    $stmt = $conn->prepare("UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?");
    $stmt->bind_param("sssii", $name, $color, $icon, $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Category updated successfully');
    } else {
        sendResponse(false, 'Failed to update category', null, 500);
    }
}

/**
 * Delete category
 */
function deleteCategory($conn, $user_id) {
    $id = (int)($_GET['id'] ?? 0);
    
    if (!$id) {
        sendResponse(false, 'Category ID required', null, 400);
    }
    
    $stmt = $conn->prepare("DELETE FROM categories WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Category deleted successfully');
    } else {
        sendResponse(false, 'Failed to delete category', null, 500);
    }
}

$conn->close();
