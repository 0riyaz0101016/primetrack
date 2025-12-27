/**
 * Main Application Logic
 * Handles routing, state management, and core functionality
 */

// API Base URL
const API_BASE = 'api';

// Application State
const AppState = {
    currentView: 'today',
    currentUser: null,
    selectedDate: new Date(),
    habits: [],
    tasks: [],
    categories: [],
    isLoading: false
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

/**
 * Check authentication status
 */
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth.php?action=verify`);
        const data = await response.json();

        if (data.success) {
            AppState.currentUser = data.data;
            initApp();
        } else {
            showAuthPage();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthPage();
    }
}

/**
 * Initialize main application
 */
function initApp() {
    loadTheme();
    renderApp();
    loadView(AppState.currentView);
}

/**
 * Render main app structure
 */
function renderApp() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <header class="app-header">
            <div class="header-content">
                <h1 class="header-title">Tracker</h1>
                <button class="btn-icon btn-ghost" onclick="toggleTheme()">
                    <span class="material-symbols-rounded" id="themeIcon">dark_mode</span>
                </button>
                <button class="btn-icon btn-ghost" onclick="showUserMenu()">
                    <span class="material-symbols-rounded">account_circle</span>
                </button>
            </div>
        </header>
        
        <main class="main-content" id="mainContent">
            <!-- View content will be loaded here -->
        </main>
        
        <button class="fab" onclick="showAddModal()">
            <span class="material-symbols-rounded">add</span>
        </button>
        
        <nav class="bottom-nav">
            <div class="nav-items">
                <a class="nav-item active" data-view="today" onclick="navigateTo('today')">
                    <span class="material-symbols-rounded">today</span>
                    <span>Today</span>
                </a>
                <a class="nav-item" data-view="habits" onclick="navigateTo('habits')">
                    <span class="material-symbols-rounded">task_alt</span>
                    <span>Habits</span>
                </a>
                <a class="nav-item" data-view="statistics" onclick="navigateTo('statistics')">
                    <span class="material-symbols-rounded">bar_chart</span>
                    <span>Statistics</span>
                </a>
                <a class="nav-item" data-view="calendar" onclick="navigateTo('calendar')">
                    <span class="material-symbols-rounded">calendar_month</span>
                    <span>Calendar</span>
                </a>
                <a class="nav-item" data-view="tasks" onclick="navigateTo('tasks')">
                    <span class="material-symbols-rounded">checklist</span>
                    <span>Tasks</span>
                </a>
                <a class="nav-item" data-view="expenses" onclick="navigateTo('expenses')">
                    <span class="material-symbols-rounded">payments</span>
                    <span>Expenses</span>
                </a>
                <a class="nav-item" data-view="time-tracker" onclick="navigateTo('time-tracker')">
                    <span class="material-symbols-rounded">schedule</span>
                    <span>Time</span>
                </a>
            </div>
        </nav>
    `;
}

/**
 * Navigate to a view
 */
function navigateTo(view) {
    AppState.currentView = view;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === view) {
            item.classList.add('active');
        }
    });

    loadView(view);
}

/**
 * Load view content
 */
async function loadView(view) {
    const mainContent = document.getElementById('mainContent');

    // Show loading
    mainContent.innerHTML = '<div class="flex justify-center items-center" style="min-height: 400px;"><div class="spinner"></div></div>';

    try {
        switch (view) {
            case 'today':
                await renderTodayView();
                break;
            case 'habits':
                await renderHabitsView();
                break;
            case 'statistics':
                await renderStatisticsView();
                break;
            case 'calendar':
                await renderCalendarView();
                break;
            case 'tasks':
                await renderTasksView();
                break;
            case 'expenses':
                await renderExpensesView();
                break;
            case 'time-tracker':
                await renderTimeTrackingView();
                break;
            default:
                mainContent.innerHTML = '<div class="empty-state"><p>View not found</p></div>';
        }
    } catch (error) {
        console.error('Error loading view:', error);
        mainContent.innerHTML = '<div class="empty-state"><p>Error loading content</p></div>';
    }
}

/**
 * Show add modal based on current view
 */
function showAddModal() {
    switch (AppState.currentView) {
        case 'today':
        case 'habits':
            showHabitModal();
            break;
        case 'tasks':
            showTaskModal();
            break;
        case 'expenses':
            showExpenseModal();
            break;
        case 'time-tracker':
            showTimeEntryModal();
            break;
        default:
            showToast('Add functionality not available in this view', 'info');
    }
}

/**
 * Show user menu
 */
function showUserMenu() {
    const modal = createModal('User Menu', `
        <div style="text-align: center; padding: 20px;">
            <div style="margin-bottom: 20px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 16px; background: var(--accent-gradient); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px;">
                    <span class="material-symbols-rounded">account_circle</span>
                </div>
                <h3>${AppState.currentUser?.full_name || 'User'}</h3>
                <p style="color: var(--text-secondary);">${AppState.currentUser?.email || ''}</p>
            </div>
            <button class="btn btn-primary" style="width: 100%; margin-bottom: 12px;" onclick="exportData()">
                <span class="material-symbols-rounded">download</span>
                Export Data
            </button>
            <button class="btn btn-secondary" style="width: 100%; margin-bottom: 12px;" onclick="logout()">
                <span class="material-symbols-rounded">logout</span>
                Logout
            </button>
            <button class="btn" style="width: 100%; background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2;" onclick="deleteAccount()">
                <span class="material-symbols-rounded">delete</span>
                Delete Account
            </button>
        </div>
    `);
    document.body.appendChild(modal);
}

/**
 * Delete Account
 */
async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This cannot be undone and all data will be lost.')) return;

    // Double confirmation
    const input = prompt('Type "DELETE" to confirm account deletion:');
    if (input !== 'DELETE') return;

    try {
        const response = await fetch(`${API_BASE}/auth.php?action=delete_account`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showToast('Account deleted', 'info');
            AppState.currentUser = null;
            showAuthPage();
        } else {
            showToast(data.message || 'Failed to delete', 'error');
        }
    } catch (error) {
        showToast('Network error', 'error');
    }
}

/**
 * Logout user
 */
async function logout() {
    try {
        await fetch(`${API_BASE}/auth.php?action=logout`, { method: 'POST' });
        AppState.currentUser = null;
        showAuthPage();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout failed:', error);
        showToast('Logout failed', 'error');
    }
}

/**
 * Export data with format selection
 */
function exportData() {
    const modal = createModal('Export Data', `
        <p style="margin-bottom: 16px;">Choose export format:</p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <button class="btn btn-primary" onclick="downloadExport('csv')" style="width: 100%;">
                <span class="material-symbols-rounded" style="vertical-align: middle;">table_chart</span>
                Export as CSV (Excel)
            </button>
            <button class="btn btn-secondary" onclick="downloadExport('json')" style="width: 100%;">
                <span class="material-symbols-rounded" style="vertical-align: middle;">code</span>
                Export as JSON (Backup)
            </button>
        </div>
        <p style="margin-top: 16px; font-size: 12px; color: var(--text-secondary);">
            CSV format can be opened in Excel/Google Sheets.<br>
            JSON format is for complete backup.
        </p>
    `, `
        <button class="btn btn-ghost" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
    `);
    document.body.appendChild(modal);
}

function downloadExport(format) {
    window.location.href = `${API_BASE}/export.php?format=${format}`;
    closeModal(document.querySelector('.modal-overlay'));
    showToast('Preparing export...', 'info');
}

/**
 * Create modal
 */
function createModal(title, content, footer = '') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) closeModal(overlay);
    };

    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3 class="modal-title">${title}</h3>
                <button class="modal-close" onclick="closeModal(this.closest('.modal-overlay'))">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
    `;

    return overlay;
}

/**
 * Close modal
 */
function closeModal(overlay) {
    overlay.remove();
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
        info: 'info'
    };

    toast.innerHTML = `
        <span class="material-symbols-rounded">${icons[type]}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Format date
 */
function formatDate(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toISOString().split('T')[0];
}

/**
 * Format time
 */
function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Get day name
 */
function getDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

/**
 * Get month name
 */
function getMonthName(date) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
}

/**
 * API Request Helper
 */
const APICache = new Map();

/**
 * API Request Helper with Caching
 */
async function apiRequest(url, options = {}) {
    const cacheKey = `${url}|${JSON.stringify(options)}`;

    // Return cached data if available and fresh (for GET requests)
    if (!options.method || options.method === 'GET') {
        if (APICache.has(cacheKey)) {
            const cached = APICache.get(cacheKey);
            // Cache valid for 30 seconds
            if (Date.now() - cached.timestamp < 30000) {
                return cached.data;
            }
        }
    }

    try {
        const response = await fetch(`${API_BASE}/${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!data.success && response.status === 401) {
            showAuthPage();
            return null;
        }

        // Cache successful GET responses
        if ((!options.method || options.method === 'GET') && data.success) {
            APICache.set(cacheKey, {
                timestamp: Date.now(),
                data: data
            });
        }

        // Any non-GET request clears cache to ensure freshness
        if (options.method && options.method !== 'GET') {
            APICache.clear();
        }

        return data;
    } catch (error) {
        console.error('API request failed:', error);

        // Return stale cache if network fails (Offline mode support)
        if ((!options.method || options.method === 'GET') && APICache.has(cacheKey)) {
            console.warn('Returning stale cache due to network error');
            return APICache.get(cacheKey).data;
        }

        showToast('Network error. Please try again.', 'error');
        return null;
    }
}

/**
 * Toggle Theme
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update icon
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = newTheme === 'dark' ? 'dark_mode' : 'light_mode';
    }
}

/**
 * Load Theme
 */
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Update icon if rendered
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.textContent = savedTheme === 'dark' ? 'dark_mode' : 'light_mode';
    }
}
