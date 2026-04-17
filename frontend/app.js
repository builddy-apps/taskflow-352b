// Dark Mode Management
const DARK_MODE_KEY = 'taskflow_dark_mode';

function initDarkMode() {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored === 'true' || (stored === null && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
}

function toggleDark() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(DARK_MODE_KEY, isDark);
}

// API Helpers with Loading States
const loadingStates = {};

function setLoading(key, isLoading) {
    loadingStates[key] = isLoading;
}

function isLoading(key) {
    return !!loadingStates[key];
}

async function apiFetch(url, options = {}) {
    const loadingKey = options.loadingKey;
    if (loadingKey) setLoading(loadingKey, true);
    
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error(`API ${options.method || 'GET'} ${url} error:`, err);
        return { success: false, error: err.message || 'Request failed' };
    } finally {
        if (loadingKey) setLoading(loadingKey, false);
    }
}

async function apiGet(url, options = {}) {
    return apiFetch(url, { method: 'GET', ...options });
}

async function apiPost(url, body, options = {}) {
    return apiFetch(url, { method: 'POST', body: JSON.stringify(body), ...options });
}

async function apiPut(url, body, options = {}) {
    return apiFetch(url, { method: 'PUT', body: JSON.stringify(body), ...options });
}

async function apiDelete(url, options = {}) {
    return apiFetch(url, { method: 'DELETE', ...options });
}

// Toast Notification System
const TOAST_DURATION = 4000;

function createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'info') {
    const container = createToastContainer();
    const config = {
        success: { bg: 'bg-green-500', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>' },
        error: { bg: 'bg-red-500', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>' },
        info: { bg: 'bg-blue-500', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>' }
    };
    const { bg, icon } = config[type];
    
    const toast = document.createElement('div');
    toast.className = `${bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-scale-in min-w-[300px] max-w-sm`;
    toast.innerHTML = `
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icon}</svg>
        <span class="flex-1 text-sm font-medium">${message}</span>
        <button class="hover:opacity-80 transition-opacity" onclick="this.parentElement.remove()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, TOAST_DURATION);
}

function showSuccess(msg) { showToast(msg, 'success'); }
function showError(msg) { showToast(msg, 'error'); }
function showInfo(msg) { showToast(msg, 'info'); }

// Confetti Animation
function triggerConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:100;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    
    const colors = ['#6366f1', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#ec4899'];
    const particles = Array.from({ length: 150 }, () => ({
        x: canvas.width / 2, y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4, rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10, gravity: 0.2
    }));
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = particles.filter(p => {
            p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
            p.rotation += p.rotationSpeed; p.vx *= 0.98;
            if (p.y < canvas.height + 20) {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
                return true;
            }
            return false;
        });
        
        if (active.length > 0) requestAnimationFrame(animate);
        else { canvas.remove(); window.removeEventListener('resize', resize); }
    }
    animate();
}

// Keyboard Shortcuts
const SHORTCUTS = { Enter: 'open-task-form', ' ': 'toggle-complete', Escape: 'close-modals', Delete: 'delete-task', Backspace: 'delete-task' };

function handleKeydown(e) {
    const tag = document.activeElement.tagName;
    if (['INPUT', 'TEXTAREA'].includes(tag) && e.key !== 'Escape') return;
    
    const action = SHORTCUTS[e.key];
    if (action) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action, key: e.key } }));
    }
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', handleKeydown);
}

// State Management
const state = {
    selectedTaskId: null,
    currentFilters: { status: 'all', priority: 'all', category: 'all' },
    searchQuery: '',
    listeners: []
};

function setState(updates) {
    Object.assign(state, updates);
    state.listeners.forEach(fn => fn(state));
}

function getState() {
    return { ...state };
}

function subscribe(listener) {
    state.listeners.push(listener);
    return () => { state.listeners.splice(state.listeners.indexOf(listener), 1); };
}

function selectTask(id) { setState({ selectedTaskId: id }); }
function updateFilters(updates) { setState({ currentFilters: { ...state.currentFilters, ...updates } }); }
function setSearchQuery(query) { setState({ searchQuery: query }); }

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initDarkMode();
    initKeyboardShortcuts();
});

// Global API
window.app = {
    toggleDark, initDarkMode,
    apiGet, apiPost, apiPut, apiDelete,
    showSuccess, showError, showInfo,
    triggerConfetti, initKeyboardShortcuts,
    selectTask, updateFilters, setSearchQuery, getState, subscribe,
    setLoading, isLoading
};