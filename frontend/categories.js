// frontend/categories.js
let categories = [];
const DEFAULT_COLORS = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#10b981'];

function initCategories() {
    loadCategories();
}

async function loadCategories() {
    const res = await apiGet('/api/categories');
    if (res.success) {
        categories = res.data.sort((a, b) => a.order_index - b.order_index);
        window.allCategories = categories;
        renderCategories();
        if (window.allTasks && window.renderTasks) window.renderTasks();
    } else {
        showError('Failed to load categories');
    }
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    categories.forEach(cat => {
        container.appendChild(createCategoryColumn(cat));
    });
    
    container.appendChild(createAddCategoryColumn());
    setupColumnDrag();
}

function createCategoryColumn(cat) {
    const div = document.createElement('div');
    div.className = 'category-column flex flex-col min-h-[300px] animate-fade-in';
    div.dataset.categoryId = cat.id;
    div.draggable = true;
    
    const isDefault = cat.is_default === 1;
    const deleteBtn = isDefault ? '' : `
        <button onclick="confirmDeleteCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')" class="text-slate-400 hover:text-red-500 transition-colors p-1" title="Delete category">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
    `;
    
    div.innerHTML = `
        <div class="category-header flex items-center justify-between px-3 py-2 rounded-t-lg border-t-4 cursor-grab active:cursor-grabbing bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm" 
             style="border-top-color: ${cat.color}" ondblclick="startRenameCategory(${cat.id}, '${cat.name.replace(/'/g, "\\'")}')">
            <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-slate-400 select-none">::</span>
                <span class="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate" id="cat-name-${cat.id}">${cat.name}</span>
                <span class="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 rounded-full" id="cat-count-${cat.id}">0</span>
            </div>
            <div class="flex items-center gap-1">${deleteBtn}</div>
        </div>
        <div id="category-${cat.id}" class="category-tasks flex-1 p-3 space-y-2 rounded-b-lg border-x border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 min-h-[200px] transition-colors"></div>
    `;
    return div;
}

function createAddCategoryColumn() {
    const div = document.createElement('div');
    div.className = 'flex flex-col min-h-[300px] animate-fade-in';
    div.innerHTML = `
        <div id="add-cat-container" class="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:border-primary-400 dark:hover:border-primary-500 transition-colors cursor-pointer group">
            <button onclick="showAddCategoryForm()" class="flex flex-col items-center gap-2 text-slate-400 group-hover:text-primary-500 transition-colors">
                <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </div>
                <span class="text-sm font-medium">Add Category</span>
            </button>
        </div>
    `;
    return div;
}

function showAddCategoryForm() {
    const container = document.getElementById('add-cat-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="p-4 w-full h-full flex flex-col gap-3">
            <input type="text" id="new-cat-name" placeholder="Category name..." class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" autofocus>
            <div class="flex items-center gap-2">
                <input type="color" id="new-cat-color" value="${DEFAULT_COLORS[0]}" class="w-10 h-10 rounded cursor-pointer border-0 bg-transparent p-0">
                <button onclick="createNewCategory()" class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">Create</button>
                <button onclick="loadCategories()" class="px-3 py-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
            </div>
        </div>
    `;
    
    const input = document.getElementById('new-cat-name');
    input.focus();
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') createNewCategory(); });
}

async function createNewCategory() {
    const nameInput = document.getElementById('new-cat-name');
    const colorInput = document.getElementById('new-cat-color');
    const name = nameInput.value.trim();
    const color = colorInput.value;
    
    if (!name) return showError('Category name is required');
    
    const orderIndex = categories.length > 0 ? Math.max(...categories.map(c => c.order_index)) + 1 : 1;
    const res = await apiPost('/api/categories', { name, color, order_index: orderIndex });
    
    if (res.success) {
        showSuccess('Category created');
        await loadCategories();
    } else {
        showError(res.error || 'Failed to create category');
    }
}

function startRenameCategory(id, currentName) {
    const nameSpan = document.getElementById(`cat-name-${id}`);
    if (!nameSpan) return;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'bg-white dark:bg-slate-800 text-sm font-semibold px-2 py-0.5 rounded border border-primary-500 focus:outline-none w-full';
    
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    
    const save = async () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            const res = await apiPut(`/api/categories/${id}`, { name: newName });
            if (res.success) await loadCategories();
            else showError(res.error);
        } else {
            await loadCategories();
        }
    };
    
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
        else if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
}

function confirmDeleteCategory(id, name) {
    const count = window.allTasks ? window.allTasks.filter(t => t.category_id === id).length : 0;
    const modal = document.createElement('div');
    modal.id = 'delete-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-in';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="document.getElementById('delete-modal').remove()"></div>
        <div class="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6">
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Category?</h3>
            <p class="text-slate-600 dark:text-slate-400 text-sm mb-6">
                Delete <span class="font-semibold text-slate-900 dark:text-white">"${name}"</span>?
                ${count > 0 ? `<br><span class="text-amber-600 dark:text-amber-400">${count} task${count > 1 ? 's' : ''} will move to Uncategorized.</span>` : ''}
            </p>
            <div class="flex justify-end gap-3">
                <button onclick="document.getElementById('delete-modal').remove()" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                <button onclick="executeDeleteCategory(${id})" class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function executeDeleteCategory(id) {
    const res = await apiDelete(`/api/categories/${id}`);
    document.getElementById('delete-modal')?.remove();
    if (res.success) {
        showSuccess('Category deleted');
        await loadCategories();
    } else {
        showError(res.error || 'Failed to delete category');
    }
}

function setupColumnDrag() {
    const cols = document.querySelectorAll('.category-column');
    cols.forEach(col => {
        col.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', col.dataset.categoryId);
            e.dataTransfer.effectAllowed = 'move';
            col.classList.add('opacity-50');
        });
        
        col.addEventListener('dragend', () => {
            col.classList.remove('opacity-50');
            document.querySelectorAll('.category-column').forEach(c => c.classList.remove('border-primary-500', 'border-2', 'border-dashed'));
        });
        
        col.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.category-column.opacity-50');
            if (dragging === col) return;
            const rect = col.getBoundingClientRect();
            const mid = rect.left + rect.width / 2;
            if (e.clientX < mid) col.parentNode.insertBefore(dragging, col);
            else col.parentNode.insertBefore(dragging, col.nextSibling);
        });
        
        col.addEventListener('drop', async (e) => {
            e.preventDefault();
            const newOrder = Array.from(document.querySelectorAll('.category-column')).map(c => parseInt(c.dataset.categoryId));
            for (let i = 0; i < newOrder.length; i++) {
                await apiPut(`/api/categories/${newOrder[i]}`, { order_index: i + 1 });
            }
            await loadCategories();
        });
    });
}

document.addEventListener('DOMContentLoaded', initCategories);

window.showAddCategoryForm = showAddCategoryForm;
window.createNewCategory = createNewCategory;
window.startRenameCategory = startRenameCategory;
window.confirmDeleteCategory = confirmDeleteCategory;
window.executeDeleteCategory = executeDeleteCategory;