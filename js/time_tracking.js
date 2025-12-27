/**
 * Time Tracking View
 * Track time spent on activities
 */

/**
 * Render Time Tracking View
 */
async function renderTimeTrackingView() {
    const mainContent = document.getElementById('mainContent');
    const currentDate = AppState.selectedDate || new Date();

    // Calculate start and end of selected month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0));

    // Fetch time entries
    const response = await apiRequest(`time_tracking.php?start_date=${startDate}&end_date=${endDate}`);
    const data = response?.data || { entries: [], total_minutes: 0, by_category: {} };

    // Convert minutes to hours and minutes
    const totalHours = Math.floor(data.total_minutes / 60);
    const totalMins = data.total_minutes % 60;

    mainContent.innerHTML = `
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h2 style="font-size: 24px; margin-bottom: 4px;">Time Tracker</h2>
                <p style="color: var(--text-secondary);">${getMonthName(currentDate)} ${year}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-icon btn-ghost" onclick="changeTimeMonth(-1)">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>
                <button class="btn-icon btn-ghost" onclick="changeTimeMonth(1)">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>
        </div>

        <div class="summary-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Total Time Tracked</div>
            <div style="font-size: 32px; font-weight: 700;">${totalHours}h ${totalMins}m</div>
            <div style="font-size: 14px; opacity: 0.8; margin-top: 8px;">${data.entries.length} entries</div>
        </div>

        ${renderCategoryBreakdown(data.by_category)}

        <div class="time-entries-list">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 18px;">Entries</h3>
            </div>
            ${renderTimeEntriesList(data.entries)}
        </div>
    `;
}

/**
 * Render category breakdown
 */
function renderCategoryBreakdown(byCategory) {
    if (Object.keys(byCategory).length === 0) {
        return '';
    }

    const categoryColors = {
        phone: '#FF5722',
        workout: '#4CAF50',
        reading: '#2196F3',
        work: '#FF9800',
        entertainment: '#9C27B0',
        other: '#607D8B'
    };

    const categoryIcons = {
        phone: 'smartphone',
        workout: 'fitness_center',
        reading: 'menu_book',
        work: 'work',
        entertainment: 'movie',
        other: 'category'
    };

    const cards = Object.entries(byCategory).map(([category, minutes]) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const color = categoryColors[category] || '#607D8B';
        const icon = categoryIcons[category] || 'category';

        return `
            <div class="stat-card" style="background: ${color}15; border-left: 4px solid ${color};">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: ${color}20; color: ${color}; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-rounded">${icon}</span>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; color: var(--text-secondary); text-transform: capitalize;">${category}</div>
                        <div style="font-size: 20px; font-weight: 600; color: ${color};">${hours}h ${mins}m</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
            ${cards}
        </div>
    `;
}

/**
 * Render time entries list
 */
function renderTimeEntriesList(entries) {
    if (entries.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">⏱️</div>
                <h3 class="empty-title">No time entries</h3>
                <p class="empty-description">Tap the + button to log your time</p>
            </div>
        `;
    }

    return entries.map(entry => {
        const hours = Math.floor(entry.duration_minutes / 60);
        const mins = entry.duration_minutes % 60;
        const categoryColors = {
            phone: '#FF5722',
            workout: '#4CAF50',
            reading: '#2196F3',
            work: '#FF9800',
            entertainment: '#9C27B0',
            other: '#607D8B'
        };
        const color = categoryColors[entry.category] || '#607D8B';

        return `
            <div class="item-card">
                <div class="item-icon" style="background: ${color}20; color: ${color};">
                    <span class="material-symbols-rounded">schedule</span>
                </div>
                
                <div class="item-content">
                    <div class="item-header">
                        <span class="item-title">${entry.activity_name}</span>
                    </div>
                    <div class="item-meta">
                        <span class="item-type" style="background: ${color}20; color: ${color}; text-transform: capitalize;">
                            ${entry.category}
                        </span>
                        <span>${formatDate(entry.entry_date)}</span>
                        ${entry.notes ? `<span>📝 ${entry.notes}</span>` : ''}
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                    <div style="font-weight: 600; font-size: 16px; color: ${color};">${hours}h ${mins}m</div>
                    <div style="display: flex; gap: 4px;">
                        <button class="btn-icon btn-ghost" onclick="editTimeEntry(${entry.id})" style="width: 32px; height: 32px;">
                            <span class="material-symbols-rounded" style="font-size: 18px; color: var(--primary);">edit</span>
                        </button>
                        <button class="btn-icon btn-ghost" onclick="deleteTimeEntry(${entry.id})" style="width: 32px; height: 32px;">
                            <span class="material-symbols-rounded" style="font-size: 18px; color: var(--error);">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Show time entry modal
 */
async function showTimeEntryModal(entry = null) {
    const isEdit = !!entry;

    const modal = createModal(
        isEdit ? 'Edit Time Entry' : 'Add Time Entry',
        `
        <form id="timeEntryForm" onsubmit="saveTimeEntry(event, ${entry ? entry.id : null})">
            <div class="form-group">
                <label class="form-label">Activity Name</label>
                <input type="text" class="form-input" name="activity_name" value="${entry?.activity_name || ''}" required placeholder="e.g., Workout, Reading">
            </div>
            
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" name="category">
                    <option value="phone" ${entry?.category === 'phone' ? 'selected' : ''}>📱 Phone</option>
                    <option value="workout" ${entry?.category === 'workout' ? 'selected' : ''}>💪 Workout</option>
                    <option value="reading" ${entry?.category === 'reading' ? 'selected' : ''}>📚 Reading</option>
                    <option value="work" ${entry?.category === 'work' ? 'selected' : ''}>💼 Work</option>
                    <option value="entertainment" ${entry?.category === 'entertainment' ? 'selected' : ''}>🎮 Entertainment</option>
                    <option value="other" ${entry?.category === 'other' ? 'selected' : ''}>📂 Other</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Duration</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <input type="number" class="form-input" name="hours" min="0" max="23" value="${entry ? Math.floor(entry.duration_minutes / 60) : 0}" placeholder="Hours">
                    </div>
                    <div>
                        <input type="number" class="form-input" name="minutes" min="0" max="59" value="${entry ? entry.duration_minutes % 60 : 0}" placeholder="Minutes">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" name="entry_date" value="${entry?.entry_date || formatDate(new Date())}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Notes (Optional)</label>
                <textarea class="form-textarea" name="notes" placeholder="Add details...">${entry?.notes || ''}</textarea>
            </div>
        </form>
        `,
        `
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('timeEntryForm').requestSubmit()">
            ${isEdit ? 'Update' : 'Add'}
        </button>
        `
    );

    document.body.appendChild(modal);
}

/**
 * Save time entry
 */
async function saveTimeEntry(event, entryId) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const hours = parseInt(formData.get('hours')) || 0;
    const minutes = parseInt(formData.get('minutes')) || 0;
    const duration_minutes = (hours * 60) + minutes;

    if (duration_minutes === 0) {
        showToast('Please enter a duration', 'error');
        return;
    }

    const data = {
        activity_name: formData.get('activity_name'),
        category: formData.get('category'),
        duration_minutes: duration_minutes,
        entry_date: formData.get('entry_date'),
        notes: formData.get('notes') || ''
    };

    if (entryId) {
        data.id = entryId;
    }

    const url = entryId ? 'time_tracking.php?action=update' : 'time_tracking.php';
    const response = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response && response.success) {
        showToast(entryId ? 'Entry updated!' : 'Entry added!', 'success');
        closeModal(event.target.closest('.modal-overlay'));
        renderTimeTrackingView();
    } else {
        showToast(response?.message || 'Failed to save entry', 'error');
    }
}

/**
 * Edit time entry
 */
async function editTimeEntry(entryId) {
    const response = await apiRequest('time_tracking.php');
    if (response && response.data) {
        const entry = response.data.entries.find(e => e.id == entryId);
        if (entry) {
            showTimeEntryModal(entry);
        }
    }
}

/**
 * Delete time entry
 */
async function deleteTimeEntry(entryId) {
    if (!confirm('Delete this time entry?')) return;

    const response = await apiRequest(`time_tracking.php?action=delete&id=${entryId}`, {
        method: 'POST',
        body: JSON.stringify({ id: entryId })
    });

    if (response && response.success) {
        showToast('Entry deleted', 'success');
        renderTimeTrackingView();
    }
}

/**
 * Change time tracking month
 */
function changeTimeMonth(delta) {
    const currentDate = AppState.selectedDate || new Date();
    currentDate.setMonth(currentDate.getMonth() + delta);
    AppState.selectedDate = currentDate;
    renderTimeTrackingView();
}

// Expose functions to window
window.renderTimeTrackingView = renderTimeTrackingView;
window.showTimeEntryModal = showTimeEntryModal;
window.saveTimeEntry = saveTimeEntry;
window.editTimeEntry = editTimeEntry;
window.deleteTimeEntry = deleteTimeEntry;
window.changeTimeMonth = changeTimeMonth;
