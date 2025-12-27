<?php
/**
 * Statistics API
 * Calculates and returns statistics for habits, tasks, and other tracking data
 */

require_once 'config.php';

$conn = getDBConnection();
$user_id = getCurrentUserId();
$period = $_GET['period'] ?? 'month'; // week, month, year, all

// Calculate date range based on period
$end_date = date('Y-m-d');
switch ($period) {
    case 'week':
        $start_date = date('Y-m-d', strtotime('-7 days'));
        break;
    case 'month':
        $start_date = date('Y-m-d', strtotime('-30 days'));
        break;
    case 'year':
        $start_date = date('Y-m-d', strtotime('-365 days'));
        break;
    case 'all':
        $start_date = '2000-01-01';
        break;
    default:
        $start_date = date('Y-m-d', strtotime('-30 days'));
}

$statistics = [
    'period' => $period,
    'start_date' => $start_date,
    'end_date' => $end_date,
    'summary' => getSummary($conn, $user_id, $start_date, $end_date),
    'habit_progress' => getHabitProgress($conn, $user_id, $start_date, $end_date),
    'status_distribution' => getStatusDistribution($conn, $user_id, $start_date, $end_date),
    'task_stats' => getTaskStats($conn, $user_id, $start_date, $end_date)
];

sendResponse(true, 'Statistics retrieved successfully', $statistics);

/**
 * Get summary statistics
 */
function getSummary($conn, $user_id, $start_date, $end_date) {
    $sql = "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM habit_logs
            WHERE user_id = ? AND log_date BETWEEN ? AND ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $user_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    
    $total = (int)$data['total'];
    $completed = (int)$data['completed'];
    $skipped = (int)$data['skipped'];
    $failed = (int)$data['failed'];
    
    $success_rate = $total > 0 ? round(($completed / $total) * 100) : 0;
    
    return [
        'success_rate' => $success_rate,
        'completed' => $completed,
        'skipped' => $skipped,
        'failed' => $failed,
        'total' => $total
    ];
}

/**
 * Get habit-wise progress
 */
function getHabitProgress($conn, $user_id, $start_date, $end_date) {
    $sql = "SELECT 
            h.id,
            h.title,
            h.icon,
            h.color,
            COUNT(hl.id) as total_logs,
            SUM(CASE WHEN hl.status = 'completed' THEN 1 ELSE 0 END) as completed,
            CASE 
                WHEN COUNT(hl.id) > 0 THEN ROUND((SUM(CASE WHEN hl.status = 'completed' THEN 1 ELSE 0 END) / COUNT(hl.id)) * 100)
                ELSE 0
            END as completion_rate
            FROM habits h
            LEFT JOIN habit_logs hl ON h.id = hl.habit_id 
                AND hl.log_date BETWEEN ? AND ?
                AND hl.user_id = ?
            WHERE h.user_id = ? AND h.is_active = 1
            GROUP BY h.id, h.title, h.icon, h.color
            HAVING total_logs > 0
            ORDER BY completion_rate DESC
            LIMIT 20";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssii", $start_date, $end_date, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $progress = [];
    while ($row = $result->fetch_assoc()) {
        $progress[] = [
            'id' => (int)$row['id'],
            'title' => $row['title'],
            'icon' => $row['icon'],
            'color' => $row['color'],
            'total_logs' => (int)$row['total_logs'],
            'completed' => (int)$row['completed'],
            'completion_rate' => (int)$row['completion_rate']
        ];
    }
    
    return $progress;
}

/**
 * Get status distribution for pie chart
 */
function getStatusDistribution($conn, $user_id, $start_date, $end_date) {
    $summary = getSummary($conn, $user_id, $start_date, $end_date);
    
    $total = $summary['total'];
    
    return [
        'completed' => [
            'count' => $summary['completed'],
            'percentage' => $total > 0 ? round(($summary['completed'] / $total) * 100) : 0
        ],
        'skipped' => [
            'count' => $summary['skipped'],
            'percentage' => $total > 0 ? round(($summary['skipped'] / $total) * 100) : 0
        ],
        'failed' => [
            'count' => $summary['failed'],
            'percentage' => $total > 0 ? round(($summary['failed'] / $total) * 100) : 0
        ]
    ];
}

/**
 * Get task statistics
 */
function getTaskStats($conn, $user_id, $start_date, $end_date) {
    $sql = "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
            FROM tasks
            WHERE user_id = ? AND created_at BETWEEN ? AND ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iss", $user_id, $start_date, $end_date);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    
    return [
        'total' => (int)$data['total'],
        'completed' => (int)$data['completed'],
        'pending' => (int)$data['pending'],
        'cancelled' => (int)$data['cancelled']
    ];
}

$conn->close();
