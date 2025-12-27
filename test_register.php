<?php
// Test Registration Script
// Upload this to htdocs/test_register.php and run it

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'api/config.php';

echo "<h1>Registration Test</h1>";

$conn = getDBConnection();

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Database connected.<br>";

// Test Data
$username = 'test_user_' . time();
$email = 'test_' . time() . '@example.com';
$password = 'password123';
$full_name = 'Test User';
$password_hash = password_hash($password, PASSWORD_BCRYPT);

echo "Attempting to insert user: $username<br>";

$sql = "INSERT INTO users (username, email, password_hash, full_name) VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("Prepare failed: " . $conn->error);
}

$stmt->bind_param("ssss", $username, $email, $password_hash, $full_name);

if ($stmt->execute()) {
    $user_id = $conn->insert_id;
    echo "User inserted successfully. ID: $user_id<br>";
    
    // Now test category creation
    echo "Attempting to create default categories...<br>";
    
    $categories = [
        ['Health', '#4CAF50', 'health', 'habit'],
        ['Study', '#2196F3', 'book', 'habit']
    ];
    
    $cat_stmt = $conn->prepare("INSERT INTO categories (user_id, name, color, icon, type) VALUES (?, ?, ?, ?, ?)");
    if (!$cat_stmt) {
         echo "Category Prepare failed: " . $conn->error . "<br>";
    } else {
        foreach ($categories as $cat) {
            $cat_stmt->bind_param("issss", $user_id, $cat[0], $cat[1], $cat[2], $cat[3]);
            if (!$cat_stmt->execute()) {
                echo "Failed to insert category {$cat[0]}: " . $cat_stmt->error . "<br>";
            } else {
                 echo "Category {$cat[0]} inserted.<br>";
            }
        }
    }
    
    echo "<h2>SUCCESS! Registration flow works.</h2>";
    
    // Cleanup
    $conn->query("DELETE FROM users WHERE id = $user_id");
    echo "Test user deleted.";
    
} else {
    echo "<h2>FAILURE! Insert failed.</h2>";
    echo "Error: " . $stmt->error;
}

$conn->close();
?>
