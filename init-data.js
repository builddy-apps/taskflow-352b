import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

const count = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
if (count.count > 0) {
    console.log('Data already seeded, skipping...');
    process.exit(0);
}

const now = Date.now();
const day = 86400000;

const insertAll = db.transaction(() => {
    // Work tasks (category_id: 1)
    const workTasks = [
        {
            title: 'Redesign landing page hero section',
            description: 'Update the main hero with new brand colors and messaging. Include responsive breakpoints for mobile and tablet views.',
            priority: 'High',
            due_date: new Date(now + 2 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 0
        },
        {
            title: 'Review Q3 marketing budget',
            description: 'Analyze spending across all channels and prepare summary report for stakeholders meeting on Friday.',
            priority: 'Medium',
            due_date: new Date(now - 1 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 1
        },
        {
            title: 'Fix authentication bug on mobile',
            description: 'Users report intermittent login failures on iOS Safari. Investigate token refresh logic and session management.',
            priority: 'High',
            due_date: new Date(now + 1 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 2
        },
        {
            title: 'Write API documentation',
            description: 'Complete OpenAPI spec for user endpoints and add example requests/responses for onboarding.',
            priority: 'Low',
            due_date: new Date(now + 7 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 3
        },
        {
            title: 'Set up CI/CD pipeline',
            description: 'Configure GitHub Actions for automated testing and deployment to staging environment.',
            priority: 'Medium',
            due_date: new Date(now + 5 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 4
        },
        {
            title: 'Prepare sprint retrospective',
            description: 'Gather feedback from team members and create presentation for what went well and areas for improvement.',
            priority: 'Low',
            due_date: new Date(now - 3 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 5
        },
        {
            title: 'Optimize database queries',
            description: 'Profile slow endpoints and add proper indexing to reduce API response times below 200ms.',
            priority: 'High',
            due_date: new Date(now + 3 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 6
        },
        {
            title: 'Update privacy policy',
            description: 'Legal team provided new requirements. Update website policy page and email users about changes.',
            priority: 'Medium',
            due_date: new Date(now + 10 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 7
        }
    ];

    // Personal tasks (category_id: 2)
    const personalTasks = [
        {
            title: 'Plan weekend trip to mountains',
            description: 'Research hiking trails, book accommodation, and check weather forecast for Saturday-Sunday trip.',
            priority: 'Medium',
            due_date: new Date(now + 4 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 0
        },
        {
            title: 'Organize home office',
            description: 'Declutter desk, organize cables, and set up new monitor arm. Buy desk organizer from Amazon.',
            priority: 'Low',
            due_date: new Date(now + 6 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 1
        },
        {
            title: 'Read "Atomic Habits" chapters 5-8',
            description: 'Continue reading and take notes on habit stacking and implementation intentions strategies.',
            priority: 'Low',
            due_date: new Date(now - 2 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 2
        },
        {
            title: 'Schedule dentist appointment',
            description: 'Call Dr. Martinez office for annual checkup. Preferred time: weekday mornings before 10am.',
            priority: 'Medium',
            due_date: new Date(now + 14 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 3
        },
        {
            title: 'Update photo library backups',
            description: 'Sync phone photos to external drive and cloud storage. Delete duplicates and organize by month.',
            priority: 'Low',
            due_date: new Date(now - 5 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 4
        },
        {
            title: 'Renew car insurance',
            description: 'Compare quotes from Geico and Progressive. Current policy expires end of month.',
            priority: 'High',
            due_date: new Date(now + 8 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 5
        }
    ];

    // Health tasks (category_id: 3)
    const healthTasks = [
        {
            title: 'Complete 5K training run',
            description: 'Follow week 3 of Couch to 5K program. Run 25 minutes continuously at comfortable pace.',
            priority: 'High',
            due_date: new Date(now).toISOString().split('T')[0],
            completed: 0,
            order_index: 0
        },
        {
            title: 'Meal prep for the week',
            description: 'Prepare chicken, rice, and roasted vegetables for 5 days. Store in portioned containers.',
            priority: 'Medium',
            due_date: new Date(now + 1 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 1
        },
        {
            title: 'Schedule annual physical',
            description: 'Book appointment with primary care physician. Bring list of current medications and questions.',
            priority: 'Medium',
            due_date: new Date(now + 21 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 2
        },
        {
            title: 'Morning yoga routine - 30 days',
            description: 'Complete 20-minute yoga flow every morning before breakfast. Track streak in habit app.',
            priority: 'Low',
            due_date: new Date(now + 30 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 3
        },
        {
            title: 'Track water intake daily',
            description: 'Aim for 8 glasses (64oz) per day. Use water bottle with time markers.',
            priority: 'Low',
            due_date: new Date(now - 7 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 4
        }
    ];

    // Uncategorized tasks (category_id: 4)
    const uncategorizedTasks = [
        {
            title: 'Research new laptop models',
            description: 'Compare MacBook Pro M3 vs ThinkPad X1 Carbon. Focus on battery life, display quality, and price.',
            priority: 'Low',
            due_date: new Date(now + 12 * day).toISOString().split('T')[0],
            completed: 0,
            order_index: 0
        },
        {
            title: 'Reply to Sarah\'s email about reunion',
            description: 'Confirm attendance for college reunion event on March 15th. Check if plus-one is allowed.',
            priority: 'Medium',
            due_date: new Date(now - 4 * day).toISOString().split('T')[0],
            completed: 1,
            order_index: 1
        }
    ];

    const insertTask = db.prepare(`
        INSERT INTO tasks (title, description, priority, due_date, completed, category_id, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Insert work tasks
    for (const task of workTasks) {
        const createdAt = new Date(now - Math.floor(Math.random() * 20) * day).toISOString();
        const updatedAt = task.completed ? new Date(now - Math.floor(Math.random() * 5) * day).toISOString() : createdAt;
        insertTask.run(
            task.title,
            task.description,
            task.priority,
            task.due_date,
            task.completed,
            1,
            task.order_index,
            createdAt,
            updatedAt
        );
    }

    // Insert personal tasks
    for (const task of personalTasks) {
        const createdAt = new Date(now - Math.floor(Math.random() * 18) * day).toISOString();
        const updatedAt = task.completed ? new Date(now - Math.floor(Math.random() * 4) * day).toISOString() : createdAt;
        insertTask.run(
            task.title,
            task.description,
            task.priority,
            task.due_date,
            task.completed,
            2,
            task.order_index,
            createdAt,
            updatedAt
        );
    }

    // Insert health tasks
    for (const task of healthTasks) {
        const createdAt = new Date(now - Math.floor(Math.random() * 15) * day).toISOString();
        const updatedAt = task.completed ? new Date(now - Math.floor(Math.random() * 3) * day).toISOString() : createdAt;
        insertTask.run(
            task.title,
            task.description,
            task.priority,
            task.due_date,
            task.completed,
            3,
            task.order_index,
            createdAt,
            updatedAt
        );
    }

    // Insert uncategorized tasks
    for (const task of uncategorizedTasks) {
        const createdAt = new Date(now - Math.floor(Math.random() * 10) * day).toISOString();
        const updatedAt = task.completed ? new Date(now - Math.floor(Math.random() * 6) * day).toISOString() : createdAt;
        insertTask.run(
            task.title,
            task.description,
            task.priority,
            task.due_date,
            task.completed,
            4,
            task.order_index,
            createdAt,
            updatedAt
        );
    }
});

insertAll();

const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();

console.log(`Seeded: ${categoryCount.count} categories, ${taskCount.count} tasks`);
console.log('');
console.log('Distribution:');
console.log(`  Work: ${db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = 1').get().count} tasks`);
console.log(`  Personal: ${db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = 2').get().count} tasks`);
console.log(`  Health: ${db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = 3').get().count} tasks`);
console.log(`  Uncategorized: ${db.prepare('SELECT COUNT(*) as count FROM tasks WHERE category_id = 4').get().count} tasks`);

db.close();