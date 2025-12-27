/**
 * Tasks Management View - FIXED VERSION
 * Create, edit, and manage tasks
 */

console.log('✅ Tasks.js v2.0 loaded with error handling');

/**
 * Render Tasks View
 */
async function renderTasksView() {
    const mainContent = document.getElementById('mainContent');

    const tasksData = await apiRequest('tasks.php');

    if (!tasksData) return;

    const tasks = tasksData.data || [];
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    mainContent.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h2 style="font-size: 24px; margin-bottom: 8px;">My Tasks</h2>
            <p style="color: var(--text-secondary);">${pendingTasks.length} pending, ${completedTasks.length} completed</p>
        </div>
        
        <div class="category-tabs" style="margin-bottom: 24px;">
            <button class="category-tab ${AppState.taskFilter !== 'completed' ? 'active' : ''}" onclick="filterTasks('pending')">Pending</button>
            <button class="category-tab ${AppState.taskFilter === 'completed' ? 'active' : ''}" onclick="filterTasks('completed')">Completed</button>
        </div>
        
        <div class="item-list">
            ${renderTaskList(AppState.taskFilter === 'completed' ? completedTasks : pendingTasks)}
        </div>
    `;
}

/**
 * Render task list
 */
function renderTaskList(tasks) {
    if (tasks.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <h3 class="empty-title">No tasks</h3>
                <p class="empty-description">Create a task to get started</p>
            </div>
        `;
    }

    return tasks.map(task => renderTaskCard(task)).join('');
}

/**
 * Render task card
 */
function renderTaskCard(task) {
    const color = task.color || task.category_color || '#FF4081';
    const isCompleted = task.status === 'completed';
    const priorityColors = {
        high: '#FF5252',
        medium: '#FFC107',
        low: '#4CAF50'
    };

    return `
        <div class="item-card ${isCompleted ? 'completed' : ''}">
            <div class="item-icon" style="background: ${color}20; color: ${color};">
                <span class="material-symbols-rounded">${task.icon || 'task_alt'}</span>
            </div>
            
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${task.title}</span>
                </div>
                <div class="item-meta">
                    <span class="item-type" style="background: ${priorityColors[task.priority]}20; color: ${priorityColors[task.priority]};">
                        ${task.priority}
                    </span>
                    ${task.task_type ? `<span>${task.task_type}</span>` : ''}
                    ${task.due_date ? `<span>📅 ${task.due_date}</span>` : ''}
                    ${task.due_time ? `<span>⏰ ${formatTime(task.due_time)}</span>` : ''}
                </div>
            </div>
            
            <div class="item-actions">
                <button class="action-btn action-btn-complete ${isCompleted ? 'active' : ''}" 
                        onclick="toggleTask(${task.id}, ${!isCompleted})" 
                        title="${isCompleted ? 'Mark incomplete' : 'Complete'}">
                    <span class="material-symbols-rounded">${isCompleted ? 'check_circle' : 'radio_button_unchecked'}</span>
                </button>
                <button class="btn-icon btn-ghost" onclick="editTask(${task.id})" title="Edit">
                    <span class="material-symbols-rounded">edit</span>
                </button>
                <button class="btn-icon btn-ghost" onclick="deleteTask(${task.id})" title="Delete">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
        </div>
    `;
}

/**
 * Filter tasks
 */
function filterTasks(filter) {
    AppState.taskFilter = filter;
    renderTasksView();
}

/**
 * Show task modal - WITH ERROR HANDLING
 */
async function showTaskModal(taskId = null) {
    console.log('🔵 Opening task modal...');

    const task = taskId ? AppState.tasks.find(t => t.id === taskId) : null;
    const isEdit = !!task;

    // Load categories with error handling
    let categories = [];
    try {
        console.log('📂 Loading categories...');
        const categoriesData = await apiRequest('categories.php');
        categories = categoriesData?.data || [];
        console.log('✅ Categories loaded:', categories.length);
    } catch (error) {
        console.warn('⚠️ Failed to load categories, continuing without them:', error);
    }

    // Build category options HTML
    let categoryOptionsHTML = '<option value="">No Category</option>';
    if (categories.length > 0) {
        categories.forEach(cat => {
            const selected = task?.category_id == cat.id ? 'selected' : '';
            categoryOptionsHTML += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
        });
    }

    const modal = createModal(
        isEdit ? 'Edit Task' : 'New Task',
        `
        <form id="taskForm" onsubmit="saveTask(event, ${taskId})">
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" class="form-input" name="title" value="${task?.title || ''}" required placeholder="e.g., Doctor Appointment">
            </div>
            
            <div class="form-group">
                <label class="form-label">Description (Optional)</label>
                <textarea class="form-textarea" name="description" placeholder="Add details...">${task?.description || ''}</textarea>
            </div>
            
            ${categories.length > 0 ? `
            <div class="form-group">
                <label class="form-label">Category</label>
                <select class="form-select" name="category_id">
                    ${categoryOptionsHTML}
                </select>
            </div>
            ` : ''}
            
            <div class="form-group">
                <label class="form-label">Task Type</label>
                <select class="form-select" name="task_type">
                    <option value="one-time" ${task?.task_type === 'one-time' ? 'selected' : ''}>One-time</option>
                    <option value="periodic" ${task?.task_type === 'periodic' ? 'selected' : ''}>Periodic</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-select" name="priority">
                    <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task?.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>
            
            <div class="form-group">
                <label class="form-label">Due Date</label>
                <input type="date" class="form-input" name="due_date" value="${task?.due_date || ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Due Time</label>
                <input type="time" class="form-input" name="due_time" value="${task?.due_time || ''}">
            </div>
            
            <div class="form-group">
                <label class="form-label">Color</label>
                <input type="color" class="form-input" name="color" value="${task?.color || '#FF4081'}">
            </div>
        </form>
        `,
        `
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('taskForm').requestSubmit()">
            ${isEdit ? 'Update' : 'Create'}
        </button>
        `
    );

    document.body.appendChild(modal);
    console.log('✅ Modal created successfully');
}

/**
 * Save task
 */
async function saveTask(event, taskId) {
    event.preventDefault();
    console.log('💾 saveTask called, taskId:', taskId);

    const formData = new FormData(event.target);
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        category_id: formData.get('category_id') || null,
        task_type: formData.get('task_type'),
        priority: formData.get('priority'),
        due_date: formData.get('due_date') || null,
        due_time: formData.get('due_time') || null,
        color: formData.get('color')
    };

    if (taskId) {
        data.id = taskId;
    }

    console.log('📤 Sending task data:', data);
    console.log('🔧 Method:', taskId ? 'POST (update)' : 'POST (create)');

    try {
        const url = taskId ? 'tasks.php?action=update' : 'tasks.php';
        const result = await apiRequest(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        console.log('📥 API Response:', result);

        if (result && result.success) {
            showToast(taskId ? 'Task updated!' : 'Task created!', 'success');

            // Close modal
            const modalOverlay = event.target.closest('.modal-overlay');
            if (modalOverlay) {
                console.log('✅ Closing modal...');
                closeModal(modalOverlay);
            } else {
                console.warn('⚠️ Modal overlay not found');
            }

            // Refresh task list
            console.log('🔄 Refreshing task list...');
            await renderTasksView();
            console.log('✅ Task saved successfully!');
        } else {
            console.error('❌ API returned error:', result);
            showToast(result?.message || 'Failed to save task', 'error');
        }
    } catch (error) {
        console.error('❌ Error saving task:', error);
        showToast('Error saving task. Check console for details.', 'error');
    }
}

/**
 * Edit task
 */
async function editTask(taskId) {
    const tasksData = await apiRequest('tasks.php');
    if (tasksData) {
        AppState.tasks = tasksData.data || [];
        showTaskModal(taskId);
    }
}

/**
 * Delete task
 */
async function deleteTask(taskId) {
    console.log('🗑️ deleteTask called, taskId:', taskId);

    if (!confirm('Are you sure you want to delete this task?')) {
        console.log('❌ Delete cancelled by user');
        return;
    }

    console.log('📤 Sending delete request...');

    try {
        const result = await apiRequest(`tasks.php?action=delete&id=${taskId}`, {
            method: 'POST',
            body: JSON.stringify({ id: taskId })
        });

        console.log('📥 Delete response:', result);

        if (result && result.success) {
            showToast('Task deleted!', 'success');
            console.log('🔄 Refreshing task list...');
            await renderTasksView();
            console.log('✅ Task deleted successfully!');
        } else {
            console.error('❌ Delete failed:', result);
            showToast(result?.message || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('❌ Error deleting task:', error);
        showToast('Error deleting task. Check console for details.', 'error');
    }
}

/**
 * Toggle task completion
 */
async function toggleTask(taskId, complete) {
    console.log('✓ toggleTask called, taskId:', taskId, 'complete:', complete);

    try {
        const data = await apiRequest('tasks.php?action=update', {
            method: 'POST',
            body: JSON.stringify({
                id: taskId,
                status: complete ? 'completed' : 'pending'
            })
        });

        console.log('📥 Toggle response:', data);

        if (data && data.success) {
            showToast(complete ? 'Task completed! 🎉' : 'Task reopened', 'success');
            console.log('🔄 Refreshing task list...');
            await renderTasksView();
            console.log('✅ Task toggled successfully!');
        } else {
            console.error('❌ Toggle failed:', data);
            showToast(data?.message || 'Failed to update task', 'error');
        }
    } catch (error) {
        console.error('❌ Error toggling task:', error);
        showToast('Error updating task. Check console for details.', 'error');
    }
}

// Explicitly expose functions to global scope for onclick handlers
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.showTaskModal = showTaskModal;
window.saveTask = saveTask;
window.filterTasks = filterTasks;

console.log('✅ Tasks.js v5.0 - All functions exposed to global scope');

