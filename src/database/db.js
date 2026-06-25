//SQLite connection & schema
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// Store DB in user data directory so it persists across app updates
const dbPath = path.join(app.getPath('userData'), 'task_reminder_pro.db');
const db = new sqlite3.Database(dbPath);

function initDatabase() {
  db.serialize(() => {
    // Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#3b82f6'
    )`);

    // Tasks Table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      notes TEXT,
      category_id INTEGER,
      priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
      due_date TEXT, -- ISO format YYYY-MM-DD
      due_time TEXT, -- HH:MM
      is_completed INTEGER DEFAULT 0,
      recurrence TEXT CHECK(recurrence IN ('None', 'Daily', 'Weekly', 'Monthly')) DEFAULT 'None',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
    )`);

    // Insert Default Categories safely
    const defaultCats = ['Work', 'School', 'Personal', 'Health'];
    const stmt = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
    defaultCats.forEach(cat => stmt.run(cat));
    stmt.finalize();
  });
}

module.exports = { db, initDatabase };