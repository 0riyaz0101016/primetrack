-- Premium Tracker Application Database Schema
-- Created: 2025-12-11

-- Create database
CREATE DATABASE IF NOT EXISTS tracker_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tracker_app;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#FF4081',
    icon VARCHAR(50) DEFAULT 'default',
    type ENUM('habit', 'task', 'expense', 'time') DEFAULT 'habit',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'check',
    color VARCHAR(7) DEFAULT '#FF4081',
    frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    target_days JSON COMMENT 'Array of days [0-6] for weekly habits',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Habit logs table
CREATE TABLE IF NOT EXISTS habit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    habit_id INT NOT NULL,
    user_id INT NOT NULL,
    log_date DATE NOT NULL,
    status ENUM('completed', 'skipped', 'failed') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_habit_date (habit_id, log_date),
    INDEX idx_user_date (user_id, log_date),
    INDEX idx_habit_date (habit_id, log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'task',
    color VARCHAR(7) DEFAULT '#FF4081',
    task_type ENUM('one-time', 'periodic') DEFAULT 'one-time',
    due_date DATE,
    due_time TIME,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    recurrence_pattern VARCHAR(50) COMMENT 'daily, weekly, monthly, etc.',
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_date (user_id, due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Moods table
CREATE TABLE IF NOT EXISTS moods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mood_date DATE NOT NULL,
    mood_level INT NOT NULL COMMENT '1-5 scale',
    mood_emoji VARCHAR(10) DEFAULT '😊',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, mood_date),
    INDEX idx_user_date (user_id, mood_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    title VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    expense_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Time entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    activity VARCHAR(100) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration_minutes INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_user_date (user_id, start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Resets table
CREATE TABLE IF NOT EXISTS password_resets (
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default categories for new users (will be done via PHP on user registration)
-- This is just a reference for default categories

-- Sample data for testing (optional)
INSERT INTO users (username, email, password_hash, full_name) VALUES
('demo', 'demo@tracker.app', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo User');
-- Password: password

SET @demo_user_id = LAST_INSERT_ID();

-- Default categories for demo user
INSERT INTO categories (user_id, name, color, icon, type) VALUES
(@demo_user_id, 'Health', '#4CAF50', 'health', 'habit'),
(@demo_user_id, 'Study', '#2196F3', 'book', 'habit'),
(@demo_user_id, 'Work', '#FF9800', 'work', 'habit'),
(@demo_user_id, 'Home', '#9C27B0', 'home', 'habit'),
(@demo_user_id, 'Other', '#607D8B', 'other', 'habit');

-- Sample habits for demo user
INSERT INTO habits (user_id, category_id, title, icon, color, frequency) VALUES
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Health' LIMIT 1), 'Drink Water', 'water', '#4CAF50', 'daily'),
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Health' LIMIT 1), 'Avoid Junk Food', 'food', '#FF5722', 'daily'),
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Study' LIMIT 1), 'Read Pages', 'book', '#2196F3', 'daily'),
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Health' LIMIT 1), 'Workout Session', 'fitness', '#FF4081', 'daily');

-- Sample tasks for demo user
INSERT INTO tasks (user_id, category_id, title, task_type, due_date, due_time, priority) VALUES
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Health' LIMIT 1), 'Doctor Appointment', 'one-time', CURDATE(), '19:00:00', 'high'),
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Home' LIMIT 1), 'Call parents Weekly', 'periodic', CURDATE(), '19:00:00', 'medium'),
(@demo_user_id, (SELECT id FROM categories WHERE user_id = @demo_user_id AND name = 'Home' LIMIT 1), 'Pay Bills Monthly', 'periodic', CURDATE(), '20:00:00', 'high');

-- Time Entries table (for time tracking feature)
CREATE TABLE IF NOT EXISTS time_entries (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

