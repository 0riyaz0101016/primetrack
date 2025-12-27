<?php
/**
 * Setup script for Time Tracking feature
 * Run this once to create the time_entries table
 */

require_once 'api/config.php';

$conn = getDBConnection();

// Create time_entries table
$sql = "CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'other',
    duration_minutes INT NOT NULL,
    entry_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, entry_date),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

if ($conn->query($sql) === TRUE) {
    echo "✅ SUCCESS: time_entries table created successfully!<br>";
    echo "You can now use the Time Tracking feature.<br>";
    echo "<br><strong>Next step:</strong> Delete this file (setup_time_tracking.php) for security.";
} else {
    echo "❌ ERROR: " . $conn->error;
}

$conn->close();
?>
