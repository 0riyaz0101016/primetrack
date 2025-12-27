/**
 * Expenses View
 * Tracks budget and spending
 */

/**
 * Render Expenses View
 */
async function renderExpensesView() {
    const mainContent = document.getElementById('mainContent');
    const currentDate = AppState.selectedDate || new Date();

    // Calculate start and end of selected month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0));

    // Fetch expenses
    const response = await apiRequest(`expenses.php?start_date=${startDate}&end_date=${endDate}`);
    const data = response?.data || { expenses: [], total: 0 };
    window.currentExpenses = data.expenses; // Store for auditing

    mainContent.innerHTML = `
        <div class="view-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <div>
                <h2 style="font-size: 24px; margin-bottom: 4px;">Expenses</h2>
                <p style="color: var(--text-secondary);">${getMonthName(currentDate)} ${year}</p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn-icon btn-ghost" onclick="changeExpenseMonth(-1)">
                    <span class="material-symbols-rounded">chevron_left</span>
                </button>
                <button class="btn-icon btn-ghost" onclick="changeExpenseMonth(1)">
                    <span class="material-symbols-rounded">chevron_right</span>
                </button>
            </div>
        </div>

        <div class="summary-card" style="background: linear-gradient(135deg, #FF9800, #FF5722); color: white; padding: 24px; border-radius: 20px; margin-bottom: 24px; box-shadow: 0 10px 20px rgba(255, 87, 34, 0.3);">
            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">Total Spent</div>
            <div style="font-size: 32px; font-weight: 700;">$${data.total.toFixed(2)}</div>
        </div>

        <div class="expenses-list">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="font-size: 18px;">Transactions</h3>
            </div>
            ${renderExpensesList(data.expenses)}
        </div>
    `;
}

/**
 * Render expenses list
 */
function renderExpensesList(expenses) {
    if (expenses.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">💸</div>
                <h3 class="empty-title">No expenses</h3>
                <p class="empty-description">Tap the + button to add an expense</p>
            </div>
        `;
    }

    return expenses.map(expense => `
        <div class="item-card">
            <div class="item-icon" style="background: ${expense.category_color || '#607D8B'}20; color: ${expense.category_color || '#607D8B'};">
                <span class="material-symbols-rounded">payments</span>
            </div>
            
            <div class="item-content">
                <div class="item-header">
                    <span class="item-title">${expense.title}</span>
                </div>
                <div class="item-meta">
                    <span>${formatDate(expense.expense_date)}</span>
                    ${expense.category_name ? `<span>• ${expense.category_name}</span>` : ''}
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <div style="font-weight: 600; font-size: 16px;">-$${parseFloat(expense.amount).toFixed(2)}</div>
                <div style="display: flex; gap: 4px;">
                    <button class="btn-icon btn-ghost" onclick="editExpense(${expense.id})" style="width: 32px; height: 32px;">
                        <span class="material-symbols-rounded" style="font-size: 18px; color: var(--primary);">edit</span>
                    </button>
                    <button class="btn-icon btn-ghost" onclick="deleteExpense(${expense.id})" style="width: 32px; height: 32px;">
                        <span class="material-symbols-rounded" style="font-size: 18px; color: var(--error);">delete</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Show expense modal
 */
async function showExpenseModal(expense = null) {
    // Load categories
    const categoriesData = await apiRequest('categories.php');
    const categories = categoriesData?.data || [];

    const categoryOptions = categories.map(c =>
        `<option value="${c.id}" ${expense && expense.category_id == c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    const title = expense ? 'Edit Expense' : 'Add Expense';
    const amountVal = expense ? expense.amount : '';
    const titleVal = expense ? expense.title : '';
    const dateVal = expense ? expense.expense_date : formatDate(new Date());
    const idField = expense ? `<input type="hidden" name="id" value="${expense.id}">` : '';

    const modal = createModal(title, `
        <form id="expenseForm" onsubmit="saveExpense(event)">
            ${idField}
            <div class="form-group">
                <label class="form-label">Title</label>
                <input type="text" class="form-input" name="title" value="${titleVal}" required placeholder="e.g. Groceries">
            </div>
            
            <div class="form-group">
                <label class="form-label">Amount ($)</label>
                <input type="number" step="0.01" class="form-input" name="amount" value="${amountVal}" required placeholder="0.00">
            </div>
            
            <div class="form-group">
                <label class="form-label">Date</label>
                <input type="date" class="form-input" name="expense_date" value="${dateVal}" required>
            </div>
            
            <div class="form-group">
                <label class="form-label">Category</label>
                <div style="display: flex; gap: 8px;">
                    <select class="form-select" name="category_id" id="expenseCategorySelect" style="flex: 1;">
                        <option value="">Uncategorized</option>
                        ${categoryOptions}
                    </select>
                    <button type="button" class="btn btn-secondary" onclick="showAddCategoryModal()" style="padding: 0; width: 42px; display: flex; align-items: center; justify-content: center;">
                        <span class="material-symbols-rounded">add</span>
                    </button>
                </div>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('expenseForm').requestSubmit()">Save</button>
    `);

    document.body.appendChild(modal);
}

/**
 * Save expense
 */
async function saveExpense(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const isUpdate = data.id && data.id !== 'undefined' && data.id !== '';
    console.log('Is Update:', isUpdate, 'ID:', data.id); // Debug log

    const url = isUpdate ? 'expenses.php?action=update' : 'expenses.php';

    const response = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response && response.success) {
        showToast(isUpdate ? 'Expense updated!' : 'Expense added!', 'success');
        closeModal(event.target.closest('.modal-overlay'));
        renderExpensesView();
    }
}

/**
 * Delete expense
 */
async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return;

    const response = await apiRequest(`expenses.php?action=delete&id=${id}`, {
        method: 'POST',
        body: JSON.stringify({ id: id }) // Fix: Send ID in body to satisfy JSON requirement
    });

    if (response && response.success) {
        showToast('Expense deleted', 'success');
        renderExpensesView();
    }
}

/**
 * Change expense month
 */
function changeExpenseMonth(delta) {
    const currentDate = AppState.selectedDate || new Date();
    currentDate.setMonth(currentDate.getMonth() + delta);
    AppState.selectedDate = currentDate;
    renderExpensesView();
}

/**
 * Edit Expense helper
 */
function editExpense(id) {
    const expense = window.currentExpenses.find(e => e.id == id);
    if (expense) {
        showExpenseModal(expense);
    }
}

/**
 * Show Add Category Modal
 */
async function showAddCategoryModal() {
    const modal = createModal('New Category', `
        <form id="addCategoryForm" onsubmit="saveNewCategory(event)">
            <input type="hidden" name="type" value="expense">
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" name="name" required placeholder="e.g. Shopping">
            </div>
            <div class="form-group">
                <label class="form-label">Color</label>
                <input type="color" class="form-input" name="color" value="#FF4081" style="width: 100%; height: 50px; cursor: pointer; padding: 2px;">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal(this.closest('.modal-overlay'))">Cancel</button>
        <button class="btn btn-primary" onclick="document.getElementById('addCategoryForm').requestSubmit()">Save</button>
    `);
    document.body.appendChild(modal);
}

/**
 * Save New Category
 */
async function saveNewCategory(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    // Call API
    const response = await apiRequest('categories.php', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    if (response && response.success) {
        showToast('Category created', 'success');
        closeModal(event.target.closest('.modal-overlay'));

        // Refresh select in expense modal
        const newId = response.data ? response.data.id : null;
        await refreshCategorySelect(newId);
    } else {
        showToast(response?.message || 'Failed to create category', 'error');
    }
}

/**
 * Refresh Category Select in Expense Modal
 */
async function refreshCategorySelect(selectedId = null) {
    const response = await apiRequest('categories.php');
    const categories = response?.data || [];

    const select = document.getElementById('expenseCategorySelect');
    if (select) {
        select.innerHTML = '<option value="">Uncategorized</option>' +
            categories.map(c => `<option value="${c.id}" ${selectedId == c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    }
}

// Expose functions to window
window.renderExpensesView = renderExpensesView;
window.showExpenseModal = showExpenseModal;
window.saveExpense = saveExpense;
window.deleteExpense = deleteExpense;
window.editExpense = editExpense;
window.changeExpenseMonth = changeExpenseMonth;
window.showAddCategoryModal = showAddCategoryModal;
window.saveNewCategory = saveNewCategory;
