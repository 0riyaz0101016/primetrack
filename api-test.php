<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test - Tracker App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #0A0A0F;
            color: #fff;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }
        .test-result {
            background: rgba(30, 30, 46, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .success { border-left: 4px solid #4CAF50; }
        .error { border-left: 4px solid #FF5252; }
        pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
        }
        h1 { color: #FF4081; }
        h2 { font-size: 18px; margin-bottom: 8px; }
    </style>
</head>
<body>
    <h1>🔍 API Diagnostics</h1>
    
    <?php
    session_start();
    
    echo "<div class='test-result'>";
    echo "<h2>1. Session Check</h2>";
    if (isset($_SESSION['user_id'])) {
        echo "<p class='success'>✅ Logged in as User ID: " . $_SESSION['user_id'] . "</p>";
        $user_id = $_SESSION['user_id'];
    } else {
        echo "<p class='error'>❌ Not logged in</p>";
        echo "<p>Please login first at: <a href='index.html' style='color: #FF4081;'>index.html</a></p>";
        exit;
    }
    echo "</div>";
    
    // Database connection
    require_once 'api/config.php';
    $conn = getDBConnection();
    
    // Test 2: Check user exists
    echo "<div class='test-result'>";
    echo "<h2>2. User Data</h2>";
    $stmt = $conn->prepare("SELECT id, username, email FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo "<p class='success'>✅ User found</p>";
        echo "<pre>" . json_encode($row, JSON_PRETTY_PRINT) . "</pre>";
    } else {
        echo "<p class='error'>❌ User not found in database</p>";
    }
    echo "</div>";
    
    // Test 3: Check categories
    echo "<div class='test-result'>";
    echo "<h2>3. Categories</h2>";
    $stmt = $conn->prepare("SELECT id, name, color, type FROM categories WHERE user_id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $categories = [];
    while ($row = $result->fetch_assoc()) {
        $categories[] = $row;
    }
    
    if (count($categories) > 0) {
        echo "<p class='success'>✅ Found " . count($categories) . " categories</p>";
        echo "<pre>" . json_encode($categories, JSON_PRETTY_PRINT) . "</pre>";
    } else {
        echo "<p class='error'>❌ No categories found</p>";
        echo "<p>Creating default categories...</p>";
        
        // Create default categories
        $defaultCategories = [
            ['Health', '#4CAF50', 'favorite', 'habit'],
            ['Study', '#2196F3', 'school', 'habit'],
            ['Work', '#FF9800', 'work', 'habit'],
            ['Home', '#9C27B0', 'home', 'habit'],
            ['Other', '#607D8B', 'label', 'habit']
        ];
        
        $stmt = $conn->prepare("INSERT INTO categories (user_id, name, color, icon, type) VALUES (?, ?, ?, ?, ?)");
        foreach ($defaultCategories as $cat) {
            $stmt->bind_param("issss", $user_id, $cat[0], $cat[1], $cat[2], $cat[3]);
            $stmt->execute();
        }
        
        echo "<p class='success'>✅ Created 5 default categories</p>";
    }
    echo "</div>";
    
    // Test 4: Check tasks
    echo "<div class='test-result'>";
    echo "<h2>4. Tasks</h2>";
    $stmt = $conn->prepare("SELECT id, title, status, priority FROM tasks WHERE user_id = ? LIMIT 5");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    
    if (count($tasks) > 0) {
        echo "<p class='success'>✅ Found " . count($tasks) . " tasks</p>";
        echo "<pre>" . json_encode($tasks, JSON_PRETTY_PRINT) . "</pre>";
    } else {
        echo "<p>No tasks found (this is okay)</p>";
    }
    echo "</div>";
    
    // Test 5: Test API endpoints
    echo "<div class='test-result'>";
    echo "<h2>5. API Endpoints Test</h2>";
    
    // Test categories API
    echo "<h3>Categories API:</h3>";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "http://localhost/my%20tracker/api/categories.php");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_COOKIE, session_name() . '=' . session_id());
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "<p>HTTP Code: $httpCode</p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    
    echo "</div>";
    
    $conn->close();
    ?>
    
    <div style="margin-top: 32px; padding: 16px; background: rgba(255, 64, 129, 0.1); border-radius: 8px;">
        <h2>✅ Next Steps:</h2>
        <ol>
            <li>If categories were created, refresh your app</li>
            <li>Try creating a habit or task again</li>
            <li>If still getting errors, check browser console for specific error messages</li>
        </ol>
        <p><a href="index.html" style="color: #FF4081; font-weight: bold;">← Back to App</a></p>
    </div>
</body>
</html>
