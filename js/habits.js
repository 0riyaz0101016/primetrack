/**
 * Habits Management View - VERSION 2.0 WITH CATEGORIES
 * Create, edit, and manage habits
 */

console.log('✅ Habits.js v2.0 loaded with category support');

/**
 * Render Habits View
 */
async function renderHabitsView() {
    const mainContent = document.getElementById('mainContent');

    const habitsData = await apiRequest('habits.php');

    if (!habitsData) return;

    const habits = habitsData.data || [];

    mainContent.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h2 style="font-size: 24px; margin-bottom: 8px;">My Habits</h2>
            <p style="color: var(--text-secondary);">Manage your daily habits</p>
        </div>
        
        <div class="item-list">
            ${habits.length > 0 ? habits.map(habit => renderHabitCard(habit)).join('') : `
                <div class="empty-state">
                    <div class="empty-icon">🎯</div>
                    <h3 class="empty-title">No habits yet</h3>
                    <p class="empty-description">Create your first habit to start tracking</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Render habit card
 */
function renderHabitCard(habit) {
    const color = habit.color || '#FF4081';

    return `
        <div class="item-card">
            <div class="item-icon" style="background: ${color}20; color: ${color};">
                <span class="material-symbols-rounded">${habit.icon || 'check_circle'}</span>
            </div>
            
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${habit.title}</span>
                </div>
                <div class="item-meta">
                    <span class="item-type">${habit.frequency || 'daily'}</span>
                    ${habit.category_name ? `<span>${habit.category_name}</span>` : ''}
                </div>
            </div>
            
            <div class="item-actions">
                <button class="btn-icon btn-ghost" onclick="editHabit(${habit.id})" title="Edit">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="btn-icon btn-ghost" onclick="deleteHabit(${habit.id})" title="Delete">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Show habit modal - WITH CATEGORY DROPDOWN
 */
async function showHabitModal(habitId = null) {
    console.log('🔵 Opening habit modal with category support...');

    const habit = habitId ? AppState.habits.find(h => h.id === habitId) : null;
    const isEdit = !!habit;

    // Load categories from API
    console.log('📂 Loading categories...');
    const categoriesData = await apiRequest('categories.php');
    const categories = categoriesData?.data || [];

    console.log('✅ Categories loaded:', categories.length, 'categories');

    // Build category options HTML
    let categoryOptionsHTML = '<option value="">No Category</option>';
    categories.forEach(cat => {
        const selected = habit?.category_id == cat.id ? 'selected' : '';
        categoryOptionsHTML += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
    });

    const modal = createModal(
        isEdit ? 'Edit Habit' : 'New Habit',
        `
        <form id="habitForm" onsubmit="saveHabit(event, ${habitId})">
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" class="form-input" name="title" value="${habit?.title || ''}" required placeholder="e.g., Drink Water, Exercise">
            </div>
            
            <div class="form-group">
                <label class="form-label">Description (Optional)</label>
                <textarea class="form-textarea" name="description" placeholder="Add notes about this habit...">${habit?.description || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">📂 Category</label>
                <select class="form-select" name="category_id" style="border: 2px solid #FF4081;">
                    ${categoryOptionsHTML}
                </select>
                <small style="color: var(--text-secondary); font-size: 12px;">Select Health, Study, Work, Home, or Other</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Icon</label>
                <input type="text" class="form-input" name="icon" value="${habit?.icon || 'check_circle'}" placeholder="check_circle">
                <small style="color: var(--text-tertiary); font-size: 12px;">Material icon name (e.g., water_drop, fitness_center, book, restaurant)</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">Color</label>
                <input type="color" class="form-input" name="color" value="${habit?.color || '#FF4081'}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Frequency</label>
                <select class="form-select" name="frequency">
                    <option value="daily" ${habit?.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                    <option value="weekly" ${habit?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                    <option value="monthly" ${habit?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                </select>
            </div>
        </form>
        `,
        `
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('habitForm').requestSubmit()">
            ${isEdit ? 'Update' : 'Create'}
        </button>
        `
    );

    document.body.appendChild(modal);
    console.log('✅ Modal created with category dropdown');
}

/**
 * Save habit
 */
async function saveHabit(event, habitId) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        category_id: formData.get('category_id') || null,
        icon: formData.get('icon'),
        color: formData.get('color'),
        frequency: formData.get('frequency')
    };

    console.log('💾 Saving habit with data:', data);

    if (habitId) {
        data.id = habitId;
    }

    const url = habitId ? 'habits.php?action=update' : 'habits.php';
    const result = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (result && result.success) {
        showToast(habitId ? 'Habit updated!' : 'Habit created!', 'success');
        closeModal(event.target.closest('.modal-overlay'));
        renderHabitsView();
    }
}

/**
 * Edit habit
 */
async function editHabit(habitId) {
    // Load fresh habit data
    const habitsData = await apiRequest('habits.php');
    if (habitsData) {
        AppState.habits = habitsData.data || [];
        showHabitModal(habitId);
    }
}

/**
 * Delete habit
 */
async function deleteHabit(habitId) {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    const result = await apiRequest(`habits.php?action=delete&id=${habitId}`, {
        method: 'POST',
        body: JSON.stringify({ id: habitId })
    });

    if (result && result.success) {
        showToast('Habit deleted!', 'success');
        renderHabitsView();
    }
}
