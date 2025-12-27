/**
 * Today View
 * Shows habits and tasks for the selected day
 */

/**
 * Render Today View
 */
async function renderTodayView() {
    const mainContent = document.getElementById('mainContent');

    // Load habits, tasks, AND mood
    const [habitsData, tasksData, moodData] = await Promise.all([
        apiRequest(`habits.php?date=${formatDate(AppState.selectedDate)}`),
        apiRequest(`tasks.php?today=1&date=${formatDate(AppState.selectedDate)}`),
        apiRequest(`moods.php?date=${formatDate(AppState.selectedDate)}`)
    ]);

    if (!habitsData || !tasksData) return;

    AppState.habits = habitsData.data || [];
    AppState.tasks = tasksData.data || [];
    const currentMood = moodData?.data || null;

    // Calculate progress
    const totalItems = AppState.habits.length + AppState.tasks.filter(t => t.status !== 'completed').length;
    const completedHabits = AppState.habits.filter(h => h.today_status === 'completed').length;
    const completedTasks = AppState.tasks.filter(t => t.status === 'completed').length;
    const completedItems = completedHabits + completedTasks;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    mainContent.innerHTML = `
        <div class="week-selector">
            ${renderWeekSelector()}
        </div>
        
        <div class="mood-section" style="margin-bottom: 24px; background: var(--surface-light); padding: 16px; border-radius: 16px;">
            <h3 style="font-size: 16px; margin-bottom: 12px; color: var(--text-secondary);">How do you feel today?</h3>
            ${renderMoodSelector(currentMood)}
        </div>

        <div class="category-tabs">
            ${renderCategoryTabs()}
        </div>
        
        <div class="progress-section">
            <div class="progress-header">
                <span class="progress-label">Progress</span>
                <span class="progress-value">${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        
        <div class="item-list" id="itemList">
            ${renderItems()}
        </div>
    `;
}

/**
 * Render Mood Selector
 */
function renderMoodSelector(currentMood) {
    const moods = [
        { level: 1, emoji: '😢', label: 'Sad' },
        { level: 2, emoji: '😐', label: 'Meh' },
        { level: 3, emoji: '🙂', label: 'Okay' },
        { level: 4, emoji: '😊', label: 'Good' },
        { level: 5, emoji: '🤩', label: 'Great' }
    ];

    const currentLevel = currentMood ? currentMood.mood_level : 0;

    return `
        <div style="display: flex; justify-content: space-between;">
            ${moods.map(m => `
                <button onclick="setMood(${m.level}, '${m.emoji}')" 
                        style="background: ${currentLevel === m.level ? 'var(--accent-primary)20' : 'transparent'}; 
                               border: 2px solid ${currentLevel === m.level ? 'var(--accent-primary)' : 'transparent'};
                               border-radius: 12px; padding: 10px; cursor: pointer; transition: all 0.2s;
                               font-size: 24px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <span>${m.emoji}</span>
                </button>
            `).join('')}
        </div>
    `;
}

// ... existing code ...

/**
 * Set Mood
 */
async function setMood(level, emoji) {
    const data = await apiRequest('moods.php', {
        method: 'POST',
        body: JSON.stringify({
            mood_level: level,
            mood_emoji: emoji,
            mood_date: formatDate(AppState.selectedDate)
        })
    });

    if (data && data.success) {
        showToast(`Mood set to ${emoji}`, 'success');
        renderTodayView(); // Refresh to update UI state
    }
}

// Explicitly expose functions to window
window.setMood = setMood;
window.renderTodayView = renderTodayView;
window.logHabit = logHabit;
window.toggleTask = toggleTask;
window.selectDate = selectDate;
window.filterByCategory = filterByCategory;


/**
 * Render week selector
 */
function renderWeekSelector() {
    const today = new Date();
    const currentDate = new Date(AppState.selectedDate);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    let html = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);

        const isSelected = date.toDateString() === currentDate.toDateString();
        const isToday = date.toDateString() === today.toDateString();

        html += `
            <div class="day-item ${isSelected ? 'active' : ''}" onclick="selectDate('${formatDate(date)}')">
                <span class="day-name">${getDayName(date)}</span>
                <span class="day-number">${date.getDate()}</span>
                ${isToday ? '<div style="width: 4px; height: 4px; background: var(--accent-primary); border-radius: 50%; margin-top: 4px;"></div>' : ''}
            </div>
        `;
    }

    return html;
}

/**
 * Render category tabs
 */
function renderCategoryTabs() {
    const categories = ['All', 'Health', 'Study', 'Work', 'Home', 'Other'];
    const activeCategory = AppState.activeCategory || 'All';

    return categories.map(cat => `
        <div class="category-tab ${cat === activeCategory ? 'active' : ''}" onclick="filterByCategory('${cat}')">
            ${cat}
        </div>
    `).join('');
}

/**
 * Render items (habits + tasks)
 */
function renderItems() {
    const activeCategory = AppState.activeCategory || 'All';

    let items = [];

    // Add habits
    AppState.habits.forEach(habit => {
        if (activeCategory === 'All' || habit.category_name === activeCategory) {
            items.push({
                type: 'habit',
                ...habit
            });
        }
    });

    // Add tasks
    AppState.tasks.forEach(task => {
        if (activeCategory === 'All' || task.category_name === activeCategory) {
            items.push({
                type: 'task',
                ...task
            });
        }
    });

    if (items.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <h3 class="empty-title">No items yet</h3>
                <p class="empty-description">Tap the + button to add habits or tasks</p>
            </div>
        `;
    }

    return items.map(item => renderItemCard(item)).join('');
}

/**
 * Render item card
 */
function renderItemCard(item) {
    const isCompleted = item.type === 'habit'
        ? item.today_status === 'completed'
        : item.status === 'completed';

    const icon = item.icon || (item.type === 'habit' ? 'check_circle' : 'task_alt');
    const color = item.color || item.category_color || '#FF4081';

    return `
        <div class="item-card ${isCompleted ? 'completed' : ''}">
            <div class="item-icon" style="background: ${color}20; color: ${color};">
                <span class="material-symbols-rounded">${icon}</span>
            </div>
            
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${item.title}</span>
                </div>
                <div class="item-meta">
                    <span class="item-type">${item.type === 'habit' ? 'Habit' : item.task_type || 'Task'}</span>
                    ${item.due_time ? `<span>⏰ ${formatTime(item.due_time)}</span>` : ''}
                    ${item.category_name ? `<span>${item.category_name}</span>` : ''}
                </div>
            </div>
            
            <div class="item-actions">
                ${item.type === 'habit' ? renderHabitActions(item) : renderTaskActions(item)}
            </div>
        </div>
    `;
}

/**
 * Render habit actions
 */
function renderHabitActions(habit) {
    const status = habit.today_status;

    return `
        <button class="action-btn action-btn-complete ${status === 'completed' ? 'active' : ''}" 
                onclick="logHabit(${habit.id}, 'completed')" 
                title="Complete">
            <span class="material-symbols-rounded">check</span>
        </button>
        <button class="action-btn action-btn-skip ${status === 'skipped' ? 'active' : ''}" 
                onclick="logHabit(${habit.id}, 'skipped')" 
                title="Skip">
            <span class="material-symbols-rounded">schedule</span>
        </button>
        <button class="action-btn action-btn-fail ${status === 'failed' ? 'active' : ''}" 
                onclick="logHabit(${habit.id}, 'failed')" 
                title="Failed">
            <span class="material-symbols-rounded">close</span>
        </button>
    `;
}

/**
 * Render task actions
 */
function renderTaskActions(task) {
    const isCompleted = task.status === 'completed';

    return `
        <button class="action-btn action-btn-complete ${isCompleted ? 'active' : ''}" 
                onclick="toggleTask(${task.id}, ${!isCompleted})" 
                title="${isCompleted ? 'Mark incomplete' : 'Complete'}">
            <span class="material-symbols-rounded">${isCompleted ? 'check_circle' : 'radio_button_unchecked'}</span>
        </button>
    `;
}

/**
 * Select date
 */
function selectDate(dateStr) {
    AppState.selectedDate = new Date(dateStr);
    renderTodayView();
}

/**
 * Filter by category
 */
function filterByCategory(category) {
    AppState.activeCategory = category;
    document.getElementById('itemList').innerHTML = renderItems();

    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.trim() === category);
    });
}

/**
 * Log habit
 */
async function logHabit(habitId, status) {
    const data = await apiRequest('habits.php?action=log', {
        method: 'POST',
        body: JSON.stringify({
            habit_id: habitId,
            status: status,
            log_date: formatDate(AppState.selectedDate)
        })
    });

    if (data && data.success) {
        showToast(`Habit ${status}!`, 'success');
        renderTodayView();
    }
}

/**
 * Toggle task completion
 */
async function toggleTask(taskId, complete) {
    const data = await apiRequest('tasks.php', {
        method: 'PUT',
        body: JSON.stringify({
            id: taskId,
            status: complete ? 'completed' : 'pending'
        })
    });

    if (data && data.success) {
        showToast(complete ? 'Task completed!' : 'Task reopened', 'success');
        renderTodayView();
    }
}
