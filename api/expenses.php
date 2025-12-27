<?php
/**
 * Expenses API
 * Handles CRUD operations for expenses
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
// Handle requests
$method = $_SERVER['REQUEST_METHOD'];
$postData = null;

if ($method === 'GET') {
    getExpenses($conn, $user_id);
} elseif ($method === 'POST') {
    // Read JSON once to be safe and robust
    $postData = getJsonInput();
    
    // Check URL action OR body action
    $action = $_GET['action'] ?? ($postData['action'] ?? '');
    
    // Check if this is actually a DELETE request disguised as POST
    if ($action === 'delete') {
        deleteExpense($conn, $user_id, $postData);
    } elseif ($action === 'update' || !empty($postData['id'])) { 
        // Logic: If action is update OR we have an ID, it is an UPDATE
        updateExpense($conn, $user_id, $postData);
    } else {
        createExpense($conn, $user_id, $postData);
    }
} elseif ($method === 'DELETE') {
    deleteExpense($conn, $user_id);
} else {
    sendResponse(false, 'Method not allowed', null, 405);
}

/**
 * Get expenses
 */
function getExpenses($conn, $user_id) {
    // Default to current month if no dates provided
    $start_date = $_GET['start_date'] ?? date('Y-m-01');
    $end_date = $_GET['end_date'] ?? date('Y-m-t');
    
    $sql = "SELECT e.*, c.name as category_name, c.color as category_color 
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.user_id = ? AND e.expense_date BETWEEN ? AND ?
            ORDER BY e.expense_date DESC, e.created_at DESC";
            
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $user_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $expenses = [];
    $total = 0;
    
    while ($row = $result->fetch_assoc()) {
        $expenses[] = $row;
        $total += (float)$row['amount'];
    }
    
    sendResponse(true, 'Expenses retrieved', [
        'expenses' => $expenses,
        'total' => $total,
        'period' => [
            'start' => $start_date,
            'end' => $end_date
        ]
    ]);
}

/**
 * Create expense
 */
function createExpense($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    validateRequired($data, ['title', 'amount', 'expense_date']);
    
    $title = sanitizeInput($data['title']);
    $amount = (float)$data['amount'];
    $expense_date = sanitizeInput($data['expense_date']);
    $category_id = isset($data['category_id']) && !empty($data['category_id']) ? (int)$data['category_id'] : null;
    $notes = isset($data['notes']) ? sanitizeInput($data['notes']) : '';
    
    $stmt = $conn->prepare("INSERT INTO expenses (user_id, category_id, title, amount, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("iisdss", $user_id, $category_id, $title, $amount, $expense_date, $notes);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Expense added successfully', ['id' => $conn->insert_id]);
    } else {
        sendResponse(false, 'Failed to add expense', null, 500);
    }
}

/**
 * Update expense
 */
function updateExpense($conn, $user_id, $data = null) {
    if ($data === null) $data = getJsonInput();
    validateRequired($data, ['id', 'title', 'amount', 'expense_date']);
    
    $id = (int)$data['id'];
    $title = sanitizeInput($data['title']);
    $amount = (float)$data['amount'];
    $expense_date = sanitizeInput($data['expense_date']);
    $category_id = isset($data['category_id']) && !empty($data['category_id']) ? (int)$data['category_id'] : null;
    $notes = isset($data['notes']) ? sanitizeInput($data['notes']) : '';
    
    // Verify ownership
    $stmt = $conn->prepare("UPDATE expenses SET title=?, amount=?, expense_date=?, category_id=?, notes=? WHERE id=? AND user_id=?");
    $stmt->bind_param("sdsisii", $title, $amount, $expense_date, $category_id, $notes, $id, $user_id);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows === 0 && $stmt->errno === 0) {
            // No rows updated (maybe same data or not found)
             // We can check if it exists to be specific, but for now success is fine
        }
        sendResponse(true, 'Expense updated successfully');
    } else {
        sendResponse(false, 'Failed to update expense', null, 500);
    }
}

/**
 * Delete expense
 */
function deleteExpense($conn, $user_id, $data = null) {
    $id = (int)($_GET['id'] ?? 0);
    // Support ID from body for POST delete
    if (!$id && $data) {
        $id = isset($data['id']) ? (int)$data['id'] : 0;
    }
    
    if (!$id && !$data) {
        $input = getJsonInput();
        $id = isset($input['id']) ? (int)$input['id'] : 0;
    }
    
    if (!$id) {
        sendResponse(false, 'Expense ID required', null, 400);
    }
    
    $stmt = $conn->prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $id, $user_id);
    
    if ($stmt->execute()) {
        sendResponse(true, 'Expense deleted successfully');
    } else {
        sendResponse(false, 'Failed to delete expense', null, 500);
    }
}

$conn->close();
