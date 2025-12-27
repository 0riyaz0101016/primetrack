-- Optimize Statistics Performance
-- Run this SQL to add indexes for faster queries

-- Add index on habit_logs for faster statistics queries
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_status ON habit_logs(status);

-- Add index on tasks for faster task statistics
CREATE INDEX IF NOT EXISTS idx_tasks_user_created ON tasks(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Add index on habits for faster lookups
CREATE INDEX IF NOT EXISTS idx_habits_user_active ON habits(user_id, is_active);

-- Verify indexes were created
SHOW INDEX FROM habit_logs;
SHOW INDEX FROM tasks;
SHOW INDEX FROM habits;
