<?php
require_once 'api/config.php';
$conn = getDBConnection();

$sql = "CREATE TABLE IF NOT EXISTS password_resets (
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token)
)";

if ($conn->query($sql) === TRUE) {
    echo "Table 'password_resets' created successfully";
} else {
    echo "Error creating table: " . $conn->error;
}
$conn->close();
?>
