/**
 * Statistics View
 * Shows analytics and insights
 */

let statsChart = null;

/**
 * Render Statistics View
 */
async function renderStatisticsView() {
    const mainContent = document.getElementById('mainContent');
    const period = AppState.statsPeriod || 'month';

    const statsData = await apiRequest(`statistics.php?period=${period}`);

    if (!statsData || !statsData.data) return;

    const stats = statsData.data;

    mainContent.innerHTML = `
        <div class="stats-filters">
            <button class="filter-btn ${period === 'week' ? 'active' : ''}" onclick="changeStatsPeriod('week')">Week</button>
            <button class="filter-btn ${period === 'month' ? 'active' : ''}" onclick="changeStatsPeriod('month')">Month</button>
            <button class="filter-btn ${period === 'year' ? 'active' : ''}" onclick="changeStatsPeriod('year')">Year</button>
            <button class="filter-btn ${period === 'all' ? 'active' : ''}" onclick="changeStatsPeriod('all')">All time</button>
        </div>
        
        <h3 style="margin-bottom: 16px; font-size: 18px;">Summary</h3>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value primary">${stats.summary.success_rate}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value success">${stats.summary.completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value warning">${stats.summary.skipped}</div>
                <div class="stat-label">Skipped</div>
            </div>
            <div class="stat-card">
                <div class="stat-value error">${stats.summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
        </div>
        
        <h3 style="margin: 32px 0 16px; font-size: 18px;">Habit Progress Summary</h3>
        <div class="habit-progress-list">
            ${renderHabitProgress(stats.habit_progress)}
        </div>
        
        <h3 style="margin: 32px 0 16px; font-size: 18px;">Habit Status Distribution</h3>
        <div class="chart-container">
            <canvas id="statusChart"></canvas>
        </div>
    `;

    // Render chart
    renderStatusChart(stats.status_distribution);
}

/**
 * Render habit progress
 */
function renderHabitProgress(habitProgress) {
    if (!habitProgress || habitProgress.length === 0) {
        return '<div class="empty-state"><p>No habit data available</p></div>';
    }

    return habitProgress.map(habit => `
        <div class="habit-progress-item">
            <div class="habit-progress-header">
                <span class="habit-progress-title">${habit.title}</span>
                <span class="habit-progress-percentage">${habit.completion_rate}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${habit.completion_rate}%"></div>
            </div>
        </div>
    `).join('');
}

/**
 * Render status distribution chart
 */
function renderStatusChart(distribution) {
    const ctx = document.getElementById('statusChart');

    if (statsChart) {
        statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Failed', 'Skipped'],
            datasets: [{
                data: [
                    distribution.completed.count,
                    distribution.failed.count,
                    distribution.skipped.count
                ],
                backgroundColor: [
                    '#4CAF50',
                    '#FF5252',
                    '#FFC107'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#B4B4C8',
                        padding: 20,
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const percentage = distribution[label.toLowerCase()].percentage;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Change statistics period
 */
function changeStatsPeriod(period) {
    AppState.statsPeriod = period;
    renderStatisticsView();
}
