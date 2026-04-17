let allTasks = [], allCategories = [], draggedTask = null, dropIndicator = null;

const PRIORITY_COLORS = {
    High: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    Low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
};

function initTasks() {
    setupEventListeners();
    loadTasks();
    loadCategories();
    subscribe(renderAll);
}

function setupEventListeners() {
    ['searchInput', 'searchInputMobile'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', debounce(e => {
            setSearchQuery(e.target.value);
            renderAll();
        }, 300));
    });

    document.getElementById('filterStatus')?.addEventListener('change', e => {
        updateFilters({ status: e.target.value });
        renderAll();
    });

    document.getElementById('filterPriority')?.addEventListener('change', e => {
        updateFilters({ priority: e.target.value });
        renderAll();
    });

    document.getElementById('filterCategory')?.addEventListener('change', e => {
        updateFilters({ category: e.target.value });
        renderAll();
    });

    document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);
    document.getElementById('taskDescription')?.addEventListener('input', updateCharCount);
    window.addEventListener('keyboard-shortcut', handleKeyboardShortcut);
}

function handleKeyboardShortcut(e) {
    const { action } = e.detail;
    if (action === 'open-task-form') openTaskModal();
    if (action === 'toggle-complete' && state.selectedTaskId) toggleTaskCompletion(state.selectedTaskId);
    if (action === 'delete-task' && state.selectedTaskId) deleteTask(state.selectedTaskId);
    if (action === 'close-modals') closeTaskModal();
}

async function loadTasks() {
    const result = await apiGet('/api/tasks', { loadingKey: 'tasks' });
    if (result.success) {
        allTasks = result.data;
        renderAll();
    } else showError('Failed to load tasks');
}

async function loadCategories() {
    const result = await apiGet('/api/categories', { loadingKey: 'categories' });
    if (result.success) {
        allCategories = result.data;
        populateCategoryFilter();
        populateCategorySelect();
        renderAll();
    }
}

function populateCategoryFilter() {
    const select = document.getElementById('filterCategory');
    if (!select) return;
    select.innerHTML = '<option value="all">All Categories</option>';
    allCategories.forEach(cat => {
        select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
    });
}

function populateCategorySelect() {
    const select = document.getElementById('taskCategory');
    if (!select) return;
    select.innerHTML = allCategories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function getFilteredTasks() {
    const { status, priority, category } = getState().currentFilters;
    const query = getState().searchQuery.toLowerCase();
    return allTasks.filter(task => {
        if (status === 'active' && task.completed) return false;
        if (status === 'completed' && !task.completed) return false;
        if (priority !== 'all' && task.priority !== priority) return false;
        if (category !== 'all' && task.category_id !== parseInt(category)) return false;
        if (query && !task.title.toLowerCase().includes(query) && !(task.description || '').toLowerCase().includes(query)) return false;
        return true;
    });
}

function renderAll() { renderCategoryColumns(); }

function renderCategoryColumns() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;

    const filteredTasks = getFilteredTasks();
    const isFiltered = ['all', 'all', 'all'].some((v, i) => Object.values(getState().currentFilters)[i] !== v) || getState().searchQuery;

    if (isFiltered) { renderFilteredView(container, filteredTasks); return; }

    container.innerHTML = '';
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';

    allCategories.forEach(cat => {
        const catTasks = allTasks.filter(t => t.category_id === cat.id);
        container.appendChild(createCategoryColumn(cat, catTasks));
    });

    if (allTasks.length === 0) renderEmptyState();
}

function createCategoryColumn(category, tasks) {
    const div = document.createElement('div');
    div.className = 'bg-slate-100 dark:bg-slate-900 rounded-xl p-4 min-h-[200px] transition-all';
    div.dataset.categoryId = category.id;

    div.innerHTML = `
        <div class="flex items-center gap-2 mb-4">
            <div class="w-3 h-3 rounded-full" style="background-color: ${category.color}"></div>
            <h3 class="font-semibold text-slate-800 dark:text-slate-200">${category.name}</h3>
            <span class="text-xs text-slate-500">(${tasks.length})</span>
        </div>
        <div class="task-list space-y-2 min-h-[100px]" data-category-id="${category.id}">
            ${tasks.map(t => createTaskCardHTML(t)).join('') || 
              '<div class="text-center text-sm text-slate-400 py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">Drop tasks here</div>'}
        </div>
    `;

    setupDragDrop(div);
    attachCardDragEvents(div);

    return div;
}

function createTaskCardHTML(task) {
    const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.completed;
    const dueDateClass = isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-slate-500';

    return `
        <div class="task-card group bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab" 
             data-task-id="${task.id}" draggable="true" style="transition: transform 0.2s ease;">
            <div class="flex items-start gap-3">
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    class="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    onchange="tasks.toggleTaskCompletion(${task.id})">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'} truncate">${escapeHtml(task.title)}</h4>
                    ${task.description ? `<p class="text-xs text-slate-500 truncate mt-1">${escapeHtml(task.description)}</p>` : ''}
                    <div class="flex items-center gap-2 mt-2">
                        <span class="px-2 py-0.5 text-xs rounded border ${priorityClass}">${task.priority}</span>
                        ${task.due_date ? `<span class="text-xs ${dueDateClass}">${formatDate(task.due_date)}</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="tasks.editTask(${task.id})" class="p-1 text-slate-400 hover:text-primary-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button onclick="tasks.deleteTask(${task.id})" class="p-1 text-slate-400 hover:text-red-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function attachCardDragEvents(column) {
    column.querySelectorAll('.task-card').forEach(card => {
        let dragTimer = null;
        card.setAttribute('draggable', 'false');

        card.addEventListener('mousedown', () => {
            dragTimer = setTimeout(() => {
                card.setAttribute('draggable', 'true');
            }, 300);
        });

        card.addEventListener('mouseup', () => { clearTimeout(dragTimer); card.setAttribute('draggable', 'false'); });
        card.addEventListener('mouseleave', () => { clearTimeout(dragTimer); card.setAttribute('draggable', 'false'); });
        card.addEventListener('dragstart', e => { handleDragStart(e); setTimeout(() => card.setAttribute('draggable', 'false'), 0); });
        card.addEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    draggedTask = allTasks.find(t => t.id === parseInt(e.target.closest('.task-card').dataset.taskId));
    e.target.closest('.task-card').classList.add('drag-ghost');

    const ghost = e.target.closest('.task-card').cloneNode(true);
    ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:1000;opacity:0.8;transform:rotate(3deg);width:280px;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => ghost.remove(), 0);
}

function handleDragEnd(e) {
    e.target.closest('.task-card')?.classList.remove('drag-ghost');
    removeDropIndicator();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function setupDragDrop(column) {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', handleDrop);
}

function handleDragOver(e) {
    e.preventDefault();
    const taskList = e.currentTarget.querySelector('.task-list');
    taskList.classList.add('drag-over');

    const afterElement = getDragAfterElement(taskList, e.clientY);
    removeDropIndicator();

    const indicator = document.createElement('div');
    indicator.className = 'drop-indicator h-0.5 bg-primary-500 rounded-full';
    dropIndicator = indicator;

    if (afterElement) afterElement.before(indicator);
    else taskList.appendChild(indicator);
}

function handleDragLeave(e) {
    const taskList = e.currentTarget.querySelector('.task-list');
    if (!taskList.contains(e.relatedTarget)) {
        taskList.classList.remove('drag-over');
        removeDropIndicator();
    }
}

async function handleDrop(e) {
    e.preventDefault();
    const column = e.currentTarget;
    const taskList = column.querySelector('.task-list');
    const newCategoryId = parseInt(column.dataset.categoryId);

    taskList.classList.remove('drag-over');
    removeDropIndicator();

    if (!draggedTask) return;

    const afterElement = getDragAfterElement(taskList, e.clientY);
    const categoryTasks = allTasks.filter(t => t.category_id === newCategoryId && t.id !== draggedTask.id);
    let newOrderIndex;

    if (afterElement) {
        const afterTask = categoryTasks.find(t => t.id === parseInt(afterElement.dataset.taskId));
        newOrderIndex = afterTask ? afterTask.order_index : categoryTasks.length;
    } else {
        newOrderIndex = categoryTasks.length;
    }

    await updateTaskCategory(draggedTask.id, newCategoryId, newOrderIndex);
    draggedTask = null;
}

function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll('.task-card:not(.drag-ghost)')];
    return elements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: child };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function removeDropIndicator() {
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    dropIndicator = null;
}

async function toggleTaskCompletion(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.completed ? 0 : 1;
    const result = await apiPut(`/api/tasks/${taskId}`, { completed: newStatus });

    if (result.success) {
        task.completed = newStatus;
        selectTask(taskId);
        if (newStatus && !task.wasCompleted) { triggerConfetti(); showSuccess('Task completed!'); }
        renderAll();
    } else showError('Failed to update task');
}

async function updateTaskCategory(taskId, categoryId, orderIndex) {
    const result = await apiPut(`/api/tasks/${taskId}`, { category_id: categoryId, order_index: orderIndex });
    if (result.success) {
        const task = allTasks.find(t => t.id === taskId);
        if (task) { task.category_id = categoryId; task.order_index = orderIndex; }
        await loadTasks();
    } else showError('Failed to move task');
}

function openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('taskDueDate').min = new Date().toISOString().split('T')[0];

    if (task) {
        document.getElementById('modalTitle').textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.due_date || '';
        document.getElementById('taskCategory').value = task.category_id;
        document.getElementById('charCount').textContent = (task.description || '').length;
        task.wasCompleted = task.completed;
    } else {
        document.getElementById('modalTitle').textContent = 'Create New Task';
    }

    modal.classList.remove('hidden');
    document.getElementById('taskTitle').focus();
}

function closeTaskModal() { document.getElementById('taskModal').classList.add('hidden'); }

async function handleTaskSubmit(e) {
    e.preventDefault();
    const taskId = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const categoryId = parseInt(document.getElementById('taskCategory').value);

    if (!title) { showError('Title is required'); return; }

    const data = { title, description: description || null, priority, due_date: dueDate || null, category_id: categoryId };

    let result;
    if (taskId) result = await apiPut(`/api/tasks/${taskId}`, data);
    else { data.order_index = allTasks.filter(t => t.category_id === categoryId).length; result = await apiPost('/api/tasks', data); }

    if (result.success) {
        closeTaskModal();
        await loadTasks();
        showSuccess(taskId ? 'Task updated!' : 'Task created!');
    } else showError(result.error || 'Failed to save task');
}

function updateCharCount(e) { document.getElementById('charCount').textContent = (e.target.value || '').length; }

async function editTask(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (task) openTaskModal(task);
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const card = document.querySelector(`[data-task-id="${taskId}"]`);
    if (card) { card.style.transition = 'all 0.3s ease'; card.style.opacity = '0'; card.style.transform = 'translateX(20px)'; }

    const result = await apiDelete(`/api/tasks/${taskId}`);

    if (result.success) {
        allTasks = allTasks.filter(t => t.id !== taskId);
        renderAll();
        showSuccess('Task deleted!');
    } else {
        showError('Failed to delete task');
        if (card) { card.style.opacity = '1'; card.style.transform = 'translateX(0)'; }
    }
}

function renderFilteredView(container, tasks) {
    container.innerHTML = '';
    container.className = 'space-y-4';

    if (tasks.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <svg class="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                <h3 class="text-lg font-medium text-slate-600 dark:text-slate-300">No tasks found</h3>
                <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Try adjusting your filters</p>
            </div>`;
        return;
    }

    const div = document.createElement('div');
    div.className = 'bg-white dark:bg-slate-900 rounded-xl p-6';
    div.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${tasks.map(t => createTaskCardHTML(t)).join('')}</div>`;
    container.appendChild(div);

    div.querySelectorAll('.task-card').forEach(card => {
        let dragTimer = null;
        card.setAttribute('draggable', 'false');
        card.addEventListener('mousedown', () => {
            dragTimer = setTimeout(() => card.setAttribute('draggable', 'true'), 300);
        });
        card.addEventListener('mouseup', () => { clearTimeout(dragTimer); card.setAttribute('draggable', 'false'); });
        card.addEventListener('mouseleave', () => { clearTimeout(dragTimer); card.setAttribute('draggable', 'false'); });
        card.addEventListener('dragstart', e => { handleDragStart(e); setTimeout(() => card.setAttribute('draggable', 'false'), 0); });
        card.addEventListener('dragend', handleDragEnd);
    });
}

function renderEmptyState() {
    const container = document.getElementById('categoriesContainer');
    container.innerHTML = `
        <div class="col-span-full text-center py-16 animate-fade-in">
            <svg class="w-20 h-20 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            <h3 class="text-xl font-semibold text-slate-600 dark:text-slate-300">No tasks yet</h3>
            <p class="text-slate-400 dark:text-slate-500 mt-2 mb-6">Get started by creating your first task</p>
            <button onclick="openTaskModal()" class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all active:scale-95">
                Create Your First Task
            </button>
        </div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function debounce(func, wait) {
    let timeout;
    return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); };
}

window.tasks = { initTasks, openTaskModal, closeTaskModal, toggleTaskCompletion, editTask, deleteTask };
window.openTaskModal = openTaskModal;
document.addEventListener('DOMContentLoaded', initTasks);