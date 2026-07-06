//SQLite connection & schema
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let app = null;
try {
  const electron = require('electron');
  app = electron.app || electron.remote?.app || null;
} catch (error) {
  app = null;
}

function resolveDatabasePath(electronApp = app) {
  if (electronApp && typeof electronApp.getPath === 'function') {
    return path.join(electronApp.getPath('userData'), 'task_reminder_pro.db');
  }

  return path.join(process.cwd(), 'task_reminder_pro.db');
}

// Store DB in user data directory so it persists across app updates
const dbPath = resolveDatabasePath();
let db = null;
let initPromise = null;

function ensureDatabaseConnection() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.get('SELECT 1', err => {
        if (!err) return resolve();
        if (err.code === 'SQLITE_NOTADB' || err.code === 'SQLITE_MISUSE') {
          if (db) {
            db.close(closeErr => {
              if (closeErr && closeErr.code !== 'SQLITE_MISUSE') return reject(closeErr);
            });
          }
          if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
          }
          db = new sqlite3.Database(dbPath);
          return resolve();
        }
        reject(err);
      });
      return;
    }

    db = new sqlite3.Database(dbPath);
    db.get('SELECT 1', err => {
      if (!err) return resolve();
      if (err.code === 'SQLITE_NOTADB' || err.code === 'SQLITE_MISUSE') {
        if (db) {
          db.close(closeErr => {
            if (closeErr && closeErr.code !== 'SQLITE_MISUSE') return reject(closeErr);
          });
        }
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
        db = new sqlite3.Database(dbPath);
        return resolve();
      }
      reject(err);
    });
  });
}

function initDatabase() {
  if (initPromise) {
    return initPromise;
  }

  initPromise = ensureDatabaseConnection().then(() => new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#3b82f6'
      )`, err => {
        if (err) return reject(err);
      });

      db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        notes TEXT,
        category_id INTEGER,
        priority TEXT CHECK(priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
        due_date TEXT, -- ISO format YYYY-MM-DD
        due_time TEXT, -- HH:MM
        is_completed INTEGER DEFAULT 0,
        recurrence TEXT,
        recurrence_start TEXT,
        next_occurrence TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE SET NULL
      )`, err => {
        if (err) return reject(err);
      });

      const defaultCats = ['Work', 'School', 'Personal', 'Health'];
      const stmt = db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)");
      defaultCats.forEach(cat => stmt.run(cat));
      stmt.finalize(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }));

  return initPromise;
}

module.exports = {
  get db() {
    return db;
  },
  initDatabase,
  resolveDatabasePath
};