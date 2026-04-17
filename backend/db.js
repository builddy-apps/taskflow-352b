import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    );
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'Medium',
        due_date TEXT,
        completed INTEGER NOT NULL DEFAULT 0,
        category_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
`);

const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (categoryCount.count === 0) {
    const insert = db.prepare('INSERT INTO categories (name, color, order_index, is_default) VALUES (?, ?, ?, ?)');
    const insertMany = db.transaction((cats) => {
        for (const cat of cats) insert.run(cat.name, cat.color, cat.order_index, cat.is_default);
    });
    insertMany([
        { name: 'Work', color: '#6366f1', order_index: 1, is_default: 1 },
        { name: 'Personal', color: '#8b5cf6', order_index: 2, is_default: 1 },
        { name: 'Health', color: '#14b8a6', order_index: 3, is_default: 1 },
        { name: 'Uncategorized', color: '#64748b', order_index: 4, is_default: 1 }
    ]);
}

const helpers = {
    queryAll: (sql, params = []) => db.prepare(sql).all(...params),
    queryGet: (sql, params = []) => db.prepare(sql).get(...params),
    queryRun: (sql, params = []) => db.prepare(sql).run(...params),
    exec: (sql) => db.exec(sql)
};

export default db;
export { helpers };