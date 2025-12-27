<?php
/**
 * Export Data API - SAFE VERSION
 * Checks if tables exist before exporting
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
$format = $_GET['format'] ?? 'json';

if ($format === 'csv') {
    exportCSV($conn, $user_id);
} else {
    exportJSON($conn, $user_id);
}

function tableExists($conn, $tableName) {
    $result = $conn->query("SHOW TABLES LIKE '$tableName'");
    return $result->num_rows > 0;
}

function exportJSON($conn, $user_id) {
    $data = [
        'user' => [],
        'categories' => [],
        'habits' => [],
        'habit_logs' => [],
        'tasks' => [],
        'export_date' => date('Y-m-d H:i:s')
    ];
    
    // User Info
    $stmt = $conn->prepare("SELECT id, username, email, full_name, created_at FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $data['user'] = $stmt->get_result()->fetch_assoc();
    
    // Categories
    if (tableExists($conn, 'categories')) {
        $stmt = $conn->prepare("SELECT * FROM categories WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) $data['categories'][] = $row;
    }
    
    // Habits
    if (tableExists($conn, 'habits')) {
        $stmt = $conn->prepare("SELECT * FROM habits WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) $data['habits'][] = $row;
    }
    
    // Habit Logs
    if (tableExists($conn, 'habit_logs')) {
        $stmt = $conn->prepare("SELECT * FROM habit_logs WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) $data['habit_logs'][] = $row;
    }
    
    // Tasks
    if (tableExists($conn, 'tasks')) {
        $stmt = $conn->prepare("SELECT * FROM tasks WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) $data['tasks'][] = $row;
    }
    
    // Time Entries (if exists)
    if (tableExists($conn, 'time_entries')) {
        $data['time_entries'] = [];
        $stmt = $conn->prepare("SELECT * FROM time_entries WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        while ($row = $result->fetch_assoc()) $data['time_entries'][] = $row;
    }
    
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="tracker_backup_' . date('Y-m-d') . '.json"');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit();
}

function exportCSV($conn, $user_id) {
    // For CSV, just export what exists
    $output = "Export Date: " . date('Y-m-d H:i:s') . "\n\n";
    
    // Export habits if table exists
    if (tableExists($conn, 'habits')) {
        $output .= "=== HABITS ===\n";
        $stmt = $conn->prepare("SELECT title, description, frequency, created_at FROM habits WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $output .= "Title,Description,Frequency,Created\n";
        while ($row = $result->fetch_assoc()) {
            $output .= '"' . $row['title'] . '","' . ($row['description'] ?? '') . '","' . $row['frequency'] . '","' . $row['created_at'] . '"' . "\n";
        }
        $output .= "\n";
    }
    
    // Export tasks if table exists
    if (tableExists($conn, 'tasks')) {
        $output .= "=== TASKS ===\n";
        $stmt = $conn->prepare("SELECT title, description, status, priority, due_date, created_at FROM tasks WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $output .= "Title,Description,Status,Priority,Due Date,Created\n";
        while ($row = $result->fetch_assoc()) {
            $output .= '"' . $row['title'] . '","' . ($row['description'] ?? '') . '","' . $row['status'] . '","' . $row['priority'] . '","' . ($row['due_date'] ?? '') . '","' . $row['created_at'] . '"' . "\n";
        }
    }
    
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="tracker_export_' . date('Y-m-d') . '.csv"');
    echo $output;
    exit();
}

$conn->close();
