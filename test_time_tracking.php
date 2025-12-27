<?php
/**
 * Test Time Tracking API
 * Run this to see the exact error
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'api/config.php';

echo "\u003ch2\u003eTime Tracking API Test\u003c/h2\u003e";

// Test 1: Check if table exists
echo "\u003ch3\u003e1. Checking if time_entries table exists...\u003c/h3\u003e";
$conn = getDBConnection();
$result = $conn->query("SHOW TABLES LIKE 'time_entries'");
if ($result->num_rows > 0) {
    echo "✅ Table exists\u003cbr\u003e";
} else {
    echo "❌ Table does NOT exist! Run the SQL to create it.\u003cbr\u003e";
    echo "\u003cpre\u003e";
    echo "CREATE TABLE time_entries (\n";
    echo "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
    echo "    user_id INT NOT NULL,\n";
    echo "    activity_name VARCHAR(100) NOT NULL,\n";
    echo "    category VARCHAR(50) DEFAULT 'other',\n";
    echo "    duration_minutes INT NOT NULL,\n";
    echo "    entry_date DATE NOT NULL,\n";
    echo "    notes TEXT,\n";
    echo "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
    echo "    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n";
    echo "    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,\n";
    echo "    INDEX idx_user_date (user_id, entry_date),\n";
    echo "    INDEX idx_category (category)\n";
    echo ");\n";
    echo "\u003c/pre\u003e";
    exit;
}

// Test 2: Check table structure
echo "\u003ch3\u003e2. Table structure:\u003c/h3\u003e";
$result = $conn->query("DESCRIBE time_entries");
echo "\u003ctable border='1' cellpadding='5'\u003e\u003ctr\u003e\u003cth\u003eField\u003c/th\u003e\u003cth\u003eType\u003c/th\u003e\u003cth\u003eNull\u003c/th\u003e\u003c/tr\u003e";
while ($row = $result->fetch_assoc()) {
    echo "\u003ctr\u003e\u003ctd\u003e{$row['Field']}\u003c/td\u003e\u003ctd\u003e{$row['Type']}\u003c/td\u003e\u003ctd\u003e{$row['Null']}\u003c/td\u003e\u003c/tr\u003e";
}
echo "\u003c/table\u003e\u003cbr\u003e";

// Test 3: Try to insert a test entry
echo "\u003ch3\u003e3. Testing INSERT...\u003c/h3\u003e";
$user_id = getCurrentUserId();
echo "Current user ID: $user_id\u003cbr\u003e";

$stmt = $conn->prepare("INSERT INTO time_entries (user_id, activity_name, category, duration_minutes, entry_date, notes) VALUES (?, ?, ?, ?, ?, ?)");
$activity = "Test Activity";
$category = "other";
$duration = 60;
$date = date('Y-m-d');
$notes = "Test note";
$stmt->bind_param("ississ", $user_id, $activity, $category, $duration, $date, $notes);

if ($stmt->execute()) {
    $id = $conn->insert_id;
    echo "✅ INSERT successful! ID: $id\u003cbr\u003e";
    
    // Clean up test entry
    $conn->query("DELETE FROM time_entries WHERE id = $id");
    echo "✅ Test entry cleaned up\u003cbr\u003e";
} else {
    echo "❌ INSERT failed: " . $stmt->error . "\u003cbr\u003e";
}

echo "\u003ch3\u003e✅ All tests passed! Time Tracking should work.\u003c/h3\u003e";
echo "\u003cp\u003eIf you still get errors, check browser console (F12) for JavaScript errors.\u003c/p\u003e";

$conn->close();
?>
