/**
 * Calendar View
 * Shows monthly calendar with activity indicators
 */

/**
 * Render Calendar View
 */
async function renderCalendarView() {
    const mainContent = document.getElementById('mainContent');

    const currentDate = AppState.selectedDate || new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Load habit logs for the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const logsData = await apiRequest(`habits.php?action=logs&start_date=${formatDate(firstDay)}&end_date=${formatDate(lastDay)}`);
    const logs = logsData?.data || [];

    mainContent.innerHTML = `
        <div class="calendar-header">
            <button class="btn-icon btn-ghost" onclick="changeMonth(-1)">
                <span class="material-symbols-rounded">chevron_left</span>
            </button>
            <h2 class="calendar-title">${getMonthName(currentDate)} ${year}</h2>
            <button class="btn-icon btn-ghost" onclick="changeMonth(1)">
                <span class="material-symbols-rounded">chevron_right</span>
            </button>
        </div>
        
        <div class="calendar-grid">
            ${renderCalendarDayHeaders()}
            ${renderCalendarDays(year, month, logs)}
        </div>
        
        <div style="text-align: center; margin-top: 24px;">
            <button class="btn btn-secondary" onclick="goToToday()">
                <span class="material-symbols-rounded">today</span>
                Today
            </button>
        </div>
    `;
}

/**
 * Render calendar day headers
 */
function renderCalendarDayHeaders() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => `<div class="calendar-day-header">${day}</div>`).join('');
}

/**
 * Render calendar days
 */
function renderCalendarDays(year, month, logs) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);

    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();

    let html = '';
    const today = new Date();

    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDate(date);
        const isToday = date.toDateString() === today.toDateString();
        const hasActivity = logs.some(log => log.log_date === dateStr);

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasActivity ? 'has-activity' : ''}" 
                 onclick="selectCalendarDate('${dateStr}')">
                ${day}
            </div>
        `;
    }

    // Next month days
    const totalCells = firstDayOfWeek + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
        html += `<div class="calendar-day other-month">${day}</div>`;
    }

    return html;
}

/**
 * Change month
 */
function changeMonth(delta) {
    const currentDate = AppState.selectedDate || new Date();
    currentDate.setMonth(currentDate.getMonth() + delta);
    AppState.selectedDate = currentDate;
    renderCalendarView();
}

/**
 * Go to today
 */
function goToToday() {
    AppState.selectedDate = new Date();
    renderCalendarView();
}

/**
 * Select calendar date
 */
function selectCalendarDate(dateStr) {
    AppState.selectedDate = new Date(dateStr);
    navigateTo('today');
}
