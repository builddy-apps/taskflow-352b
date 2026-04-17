// Dashboard State
let dashboardData = null;
let currentDateRange = 'week';
let refreshInterval = null;

// Date Range Helpers
function getDateRangeFilter() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (currentDateRange) {
        case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return weekAgo.toISOString().split('T')[0];
        case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return monthAgo.toISOString().split('T')[0];
        case 'all':
        default:
            return null;
    }
}

// Fetch Stats from API
async function fetchStats() {
    const dateFilter = getDateRangeFilter();
    const url = dateFilter ? `/api/stats?since=${dateFilter}` : '/api/stats';
    
    const result = await apiGet(url, { loadingKey: 'dashboard' });
    
    if (result.success) {
        dashboardData = result.data;
        renderDashboard();
    } else {
        showError('Failed to load dashboard data');
    }
}

// Render Dashboard
function renderDashboard() {
    if (!dashboardData) return;
    
    renderStatCards();
    renderCategoryBreakdown();
    renderRecentActivity();
}

function renderStatCards() {
    animateCounter('stat-total', dashboardData.total_tasks || 0);
    animateCounter('stat-completed', dashboardData.completed_tasks || 0);
    
    const rate = dashboardData.total_tasks > 0 
        ? Math.round((dashboardData.completed_tasks / dashboardData.total_tasks) * 100) 
        : 0;
    animateCounter('stat-rate', rate);
    
    animateCounter('stat-overdue', dashboardData.overdue_tasks || 0);
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const duration = 1000;
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeProgress);
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function renderCategoryBreakdown() {
    const container = document.getElementById('categoryBreakdown');
    if (!container || !dashboardData.category_stats) return;
    
    const categories = dashboardData.category_stats;
    
    if (categories.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <svg class="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p class="text-slate-500 dark:text-slate-400">No category data yet</p>
                <p class="text-sm text-slate-400 dark:text-slate-500">Start adding tasks to see your progress</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = categories.map(cat => {
        const rate = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
        
        return `
            <div class="space-y-2 animate-fade-in">
                <div class="flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full" style="background-color: ${cat.color}"></span>
                        <span class="font-medium text-slate-700 dark:text-slate-300">${cat.name}</span>
                    </div>
                    <span class="text-sm font-semibold" style="color: ${cat.color}">${rate}%</span>
                </div>
                <div class="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div class="h-full rounded-full animate-progress transition-all duration-300" 
                         style="width: ${rate}%; background-color: ${cat.color}"></div>
                </div>
                <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>${cat.completed} completed</span>
                    <span>${cat.total} total</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container || !dashboardData.recent_activity) return;
    
    const activities = dashboardData.recent_activity;
    
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center">
                <svg class="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <p class="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `<div class="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800"></div>` +
        activities.map((activity, index) => {
            const timeAgo = formatTimeAgo(activity.completed_at);
            const delay = index * 0.1;
            
            return `
                <div class="relative pl-8 pb-6 animate-fade-in" style="animation-delay: ${delay}s">
                    <div class="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-white dark:bg-slate-900 border-2 border-primary-500"></div>
                    <p class="font-medium text-slate-800 dark:text-slate-200 mb-1">${activity.title}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">${timeAgo}</p>
                </div>
            `;
        }).join('');
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
}

// Set Date Range Filter
function setDateRange(range) {
    currentDateRange = range;
    
    ['week', 'month', 'all'].forEach(r => {
        const btn = document.getElementById(`btn-${r}`);
        if (btn) {
            if (r === range) {
                btn.className = 'px-3 py-1.5 text-xs font-medium rounded-md transition-all text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950';
            } else {
                btn.className = 'px-3 py-1.5 text-xs font-medium rounded-md transition-all text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800';
            }
        }
    });
    
    fetchStats();
}

// Initialize Dashboard
function initDashboard() {
    fetchStats();
    
    refreshInterval = setInterval(fetchStats, 30000);
    window.addEventListener('focus', fetchStats);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initDashboard);