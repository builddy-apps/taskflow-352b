import express from 'express';
import cors from 'cors';
import db, { helpers } from './db.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// TASKS ROUTES
app.get('/api/tasks', (req, res) => {
    try {
        const { category_id, priority, completed, search } = req.query;
        let sql = 'SELECT * FROM tasks WHERE 1=1';
        const params = [];

        if (category_id) {
            sql += ' AND category_id = ?';
            params.push(parseInt(category_id));
        }
        if (priority) {
            sql += ' AND priority = ?';
            params.push(priority);
        }
        if (completed !== undefined) {
            sql += ' AND completed = ?';
            params.push(completed === 'true' ? 1 : 0);
        }
        if (search) {
            sql += ' AND (title LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        sql += ' ORDER BY order_index ASC';
        const tasks = helpers.queryAll(sql, [params]);
        res.json({ success: true, data: tasks });
    } catch (err) {
        console.error('GET /api/tasks error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', (req, res) => {
    try {
        const { title, description, priority, due_date, category_id, order_index } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const category = helpers.queryGet('SELECT id FROM categories WHERE id = ?', [[category_id]]);
        if (!category) {
            return res.status(400).json({ success: false, error: 'Category not found' });
        }

        const now = new Date().toISOString();
        const result = helpers.queryRun(
            'INSERT INTO tasks (title, description, priority, due_date, category_id, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [[title, description || null, priority || 'Medium', due_date || null, category_id, order_index || 0, now, now]]
        );

        const task = helpers.queryGet('SELECT * FROM tasks WHERE id = ?', [[result.lastInsertRowid]]);
        res.json({ success: true, data: task });
    } catch (err) {
        console.error('POST /api/tasks error:', err);
        res.status(500).json({ success: false, error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, priority, due_date, category_id, completed, order_index } = req.body;

        const existing = helpers.queryGet('SELECT * FROM tasks WHERE id = ?', [[id]]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        if (category_id) {
            const category = helpers.queryGet('SELECT id FROM categories WHERE id = ?', [[category_id]]);
            if (!category) {
                return res.status(400).json({ success: false, error: 'Category not found' });
            }
        }

        const updates = [];
        const values = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
        if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
        if (category_id !== undefined) { updates.push('category_id = ?'); values.push(category_id); }
        if (completed !== undefined) { updates.push('completed = ?'); values.push(completed ? 1 : 0); }
        if (order_index !== undefined) { updates.push('order_index = ?'); values.push(order_index); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        helpers.queryRun(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, [values]);
        const task = helpers.queryGet('SELECT * FROM tasks WHERE id = ?', [[id]]);
        res.json({ success: true, data: task });
    } catch (err) {
        console.error('PUT /api/tasks/:id error:', err);
        res.status(500).json({ success: false, error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    try {
        const { id } = req.params;
        const task = helpers.queryGet('SELECT * FROM tasks WHERE id = ?', [[id]]);
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found' });
        }

        helpers.queryRun('DELETE FROM tasks WHERE id = ?', [[id]]);
        res.json({ success: true, data: { id } });
    } catch (err) {
        console.error('DELETE /api/tasks/:id error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete task' });
    }
});

app.put('/api/tasks/reorder', (req, res) => {
    try {
        const { tasks } = req.body;
        if (!tasks || !Array.isArray(tasks)) {
            return res.status(400).json({ success: false, error: 'Tasks array required' });
        }

        const reorder = db.transaction((taskList) => {
            const update = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ?');
            for (const task of taskList) {
                update.run(task.order_index, task.id);
            }
        });

        reorder(tasks);
        res.json({ success: true, data: { reordered: tasks.length } });
    } catch (err) {
        console.error('PUT /api/tasks/reorder error:', err);
        res.status(500).json({ success: false, error: 'Failed to reorder tasks' });
    }
});

// CATEGORIES ROUTES
app.get('/api/categories', (req, res) => {
    try {
        const categories = helpers.queryAll('SELECT * FROM categories ORDER BY order_index ASC', []);
        res.json({ success: true, data: categories });
    } catch (err) {
        console.error('GET /api/categories error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch categories' });
    }
});

app.post('/api/categories', (req, res) => {
    try {
        const { name, color } = req.body;
        if (!name || !color) {
            return res.status(400).json({ success: false, error: 'Name and color are required' });
        }

        const maxOrder = helpers.queryGet('SELECT MAX(order_index) as max_order FROM categories', []);
        const orderIndex = (maxOrder.max_order || 0) + 1;
        const now = new Date().toISOString();

        const result = helpers.queryRun(
            'INSERT INTO categories (name, color, order_index, is_default, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
            [[name, color, orderIndex, now, now]]
        );

        const category = helpers.queryGet('SELECT * FROM categories WHERE id = ?', [[result.lastInsertRowid]]);
        res.json({ success: true, data: category });
    } catch (err) {
        console.error('POST /api/categories error:', err);
        res.status(500).json({ success: false, error: 'Failed to create category' });
    }
});

app.put('/api/categories/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, order_index } = req.body;

        const existing = helpers.queryGet('SELECT * FROM categories WHERE id = ?', [[id]]);
        if (!existing) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }

        const updates = [];
        const values = [];

        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (color !== undefined) { updates.push('color = ?'); values.push(color); }
        if (order_index !== undefined) { updates.push('order_index = ?'); values.push(order_index); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        updates.push('updated_at = ?');
        values.push(new Date().toISOString());
        values.push(id);

        helpers.queryRun(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, [values]);
        const category = helpers.queryGet('SELECT * FROM categories WHERE id = ?', [[id]]);
        res.json({ success: true, data: category });
    } catch (err) {
        console.error('PUT /api/categories/:id error:', err);
        res.status(500).json({ success: false, error: 'Failed to update category' });
    }
});

app.delete('/api/categories/:id', (req, res) => {
    try {
        const { id } = req.params;
        const category = helpers.queryGet('SELECT * FROM categories WHERE id = ?', [[id]]);
        if (!category) {
            return res.status(404).json({ success: false, error: 'Category not found' });
        }

        if (category.is_default) {
            return res.status(400).json({ success: false, error: 'Cannot delete default category' });
        }

        const uncategorized = helpers.queryGet("SELECT id FROM categories WHERE name = 'Uncategorized'", []);
        if (uncategorized) {
            helpers.queryRun('UPDATE tasks SET category_id = ? WHERE category_id = ?', [[uncategorized.id, id]]);
        }

        helpers.queryRun('DELETE FROM categories WHERE id = ?', [[id]]);
        res.json({ success: true, data: { id } });
    } catch (err) {
        console.error('DELETE /api/categories/:id error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete category' });
    }
});

// STATS ROUTE
app.get('/api/stats', (req, res) => {
    try {
        const categories = helpers.queryAll('SELECT id, name, color FROM categories ORDER BY order_index ASC', []);
        const now = new Date().toISOString();

        const categoryStats = categories.map(cat => {
            const total = helpers.queryGet('SELECT COUNT(*) as count FROM tasks WHERE category_id = ?', [[cat.id]]);
            const completed = helpers.queryGet('SELECT COUNT(*) as count FROM tasks WHERE category_id = ? AND completed = 1', [[cat.id]]);
            return {
                category_id: cat.id,
                name: cat.name,
                color: cat.color,
                total_tasks: total.count,
                completed_tasks: completed.count,
                completion_rate: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0
            };
        });

        const totalTasks = helpers.queryGet('SELECT COUNT(*) as count FROM tasks', []);
        const totalCompleted = helpers.queryGet('SELECT COUNT(*) as count FROM tasks WHERE completed = 1', []);
        const overdueTasks = helpers.queryGet('SELECT COUNT(*) as count FROM tasks WHERE completed = 0 AND due_date < ?', [[now]]);

        const recentActivity = helpers.queryAll(
            'SELECT id, title, completed, updated_at FROM tasks WHERE completed = 1 ORDER BY updated_at DESC LIMIT 10',
            []
        );

        res.json({
            success: true,
            data: {
                category_stats: categoryStats,
                total_tasks: totalTasks.count,
                completed_tasks: totalCompleted.count,
                completion_rate: totalTasks.count > 0 ? Math.round((totalCompleted.count / totalTasks.count) * 100) : 0,
                overdue_tasks: overdueTasks.count,
                recent_activity: recentActivity
            }
        });
    } catch (err) {
        console.error('GET /api/stats error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`TaskFlow server running on port ${PORT}`);
});