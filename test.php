<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tracker App - Database Test</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0A0A0F 0%, #14141F 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            max-width: 600px;
            width: 100%;
            background: rgba(30, 30, 46, 0.8);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        
        h1 {
            font-size: 28px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #FF4081 0%, #FF6B9D 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        p {
            color: #B4B4C8;
            margin-bottom: 24px;
        }
        
        .test-section {
            background: rgba(20, 20, 31, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
        }
        
        .test-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #fff;
        }
        
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
        }
        
        .status.success {
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
        }
        
        .status.error {
            background: rgba(255, 82, 82, 0.2);
            color: #FF5252;
        }
        
        .status.warning {
            background: rgba(255, 193, 7, 0.2);
            color: #FFC107;
        }
        
        .detail {
            color: #7A7A8C;
            font-size: 14px;
            margin-top: 8px;
            line-height: 1.6;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #FF4081 0%, #FF6B9D 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            margin-top: 16px;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            color: #FF6B9D;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Database Connection Test</h1>
        <p>Testing your Tracker App setup...</p>
        
        <?php
        error_reporting(E_ALL);
        ini_set('display_errors', 1);
        
        // Test 1: PHP Version
        echo '<div class="test-section">';
        echo '<div class="test-title">1. PHP Version</div>';
        $phpVersion = phpversion();
        if (version_compare($phpVersion, '7.4.0', '>=')) {
            echo '<span class="status success">✓ PASS</span>';
            echo '<div class="detail">PHP ' . $phpVersion . ' (Compatible)</div>';
        } else {
            echo '<span class="status error">✗ FAIL</span>';
            echo '<div class="detail">PHP ' . $phpVersion . ' (Need 7.4+)</div>';
        }
        echo '</div>';
        
        // Test 2: Database Connection
        echo '<div class="test-section">';
        echo '<div class="test-title">2. Database Connection</div>';
        
        $host = 'localhost';
        $user = 'root';
        $pass = '';
        $dbname = 'tracker_app';
        
        try {
            $conn = new mysqli($host, $user, $pass, $dbname);
            
            if ($conn->connect_error) {
                throw new Exception($conn->connect_error);
            }
            
            echo '<span class="status success">✓ CONNECTED</span>';
            echo '<div class="detail">Successfully connected to database: <code>' . $dbname . '</code></div>';
            
            // Test 3: Check Tables
            echo '</div>';
            echo '<div class="test-section">';
            echo '<div class="test-title">3. Database Tables</div>';
            
            $tables = ['users', 'categories', 'habits', 'habit_logs', 'tasks', 'moods', 'expenses', 'time_entries'];
            $missingTables = [];
            $foundTables = [];
            
            foreach ($tables as $table) {
                $result = $conn->query("SHOW TABLES LIKE '$table'");
                if ($result->num_rows > 0) {
                    $foundTables[] = $table;
                } else {
                    $missingTables[] = $table;
                }
            }
            
            if (empty($missingTables)) {
                echo '<span class="status success">✓ ALL TABLES EXIST</span>';
                echo '<div class="detail">Found ' . count($foundTables) . ' tables: ' . implode(', ', $foundTables) . '</div>';
            } else {
                echo '<span class="status error">✗ MISSING TABLES</span>';
                echo '<div class="detail">Missing: <code>' . implode('</code>, <code>', $missingTables) . '</code></div>';
                echo '<div class="detail" style="margin-top: 12px;">⚠️ You need to import the database schema!</div>';
            }
            
            // Test 4: Check Categories
            if (in_array('categories', $foundTables)) {
                echo '</div>';
                echo '<div class="test-section">';
                echo '<div class="test-title">4. Categories Data</div>';
                
                $result = $conn->query("SELECT COUNT(*) as count FROM categories");
                $row = $result->fetch_assoc();
                $categoryCount = $row['count'];
                
                if ($categoryCount > 0) {
                    echo '<span class="status success">✓ CATEGORIES FOUND</span>';
                    echo '<div class="detail">Found ' . $categoryCount . ' categories in database</div>';
                    
                    // List categories
                    $result = $conn->query("SELECT name, color FROM categories LIMIT 10");
                    echo '<div class="detail" style="margin-top: 8px;">Categories: ';
                    $cats = [];
                    while ($cat = $result->fetch_assoc()) {
                        $cats[] = '<code>' . $cat['name'] . '</code>';
                    }
                    echo implode(', ', $cats);
                    echo '</div>';
                } else {
                    echo '<span class="status warning">⚠ NO CATEGORIES</span>';
                    echo '<div class="detail">Database is empty. Register a new user to create default categories.</div>';
                }
            }
            
            // Test 5: API Files
            echo '</div>';
            echo '<div class="test-section">';
            echo '<div class="test-title">5. API Files</div>';
            
            $apiFiles = ['config.php', 'auth.php', 'habits.php', 'tasks.php', 'categories.php', 'statistics.php'];
            $missingFiles = [];
            $foundFiles = [];
            
            foreach ($apiFiles as $file) {
                if (file_exists(__DIR__ . '/api/' . $file)) {
                    $foundFiles[] = $file;
                } else {
                    $missingFiles[] = $file;
                }
            }
            
            if (empty($missingFiles)) {
                echo '<span class="status success">✓ ALL API FILES EXIST</span>';
                echo '<div class="detail">Found ' . count($foundFiles) . ' API files</div>';
            } else {
                echo '<span class="status error">✗ MISSING FILES</span>';
                echo '<div class="detail">Missing: <code>' . implode('</code>, <code>', $missingFiles) . '</code></div>';
            }
            
            $conn->close();
            
        } catch (Exception $e) {
            echo '<span class="status error">✗ CONNECTION FAILED</span>';
            echo '<div class="detail">Error: ' . $e->getMessage() . '</div>';
            echo '<div class="detail" style="margin-top: 12px;">⚠️ Make sure XAMPP MySQL is running and database <code>tracker_app</code> exists!</div>';
        }
        ?>
        
        </div>
        
        <div style="margin-top: 24px; padding: 16px; background: rgba(255, 64, 129, 0.1); border-left: 4px solid #FF4081; border-radius: 8px;">
            <strong style="color: #FF4081;">Next Steps:</strong>
            <ol style="margin-top: 8px; margin-left: 20px; color: #B4B4C8; line-height: 1.8;">
                <li>If database connection failed: Start XAMPP MySQL</li>
                <li>If tables are missing: Import <code>database/schema.sql</code> in phpMyAdmin</li>
                <li>If categories are empty: Register a new user or login with demo account</li>
                <li>If everything is ✓: <a href="index.html" class="btn">Open Tracker App →</a></li>
            </ol>
        </div>
    </div>
</body>
</html>
