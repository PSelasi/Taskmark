const fs = require('fs');
const { db, initDatabase } = require('../database/db.js');

function exportToCSV(targetFilePath) {
  initDatabase().then(() => {
    db.all("SELECT id, title, priority, due_date, due_time, is_completed FROM tasks", [], (err, rows) => {
      if (err) return console.error(err);

      const csvHeaders = "ID,Title,Priority,DueDate,DueTime,IsCompleted\n";
      const csvRows = rows.map(r => `${r.id},"${r.title}",${r.priority},${r.due_date},${r.due_time},${r.is_completed}`).join('\n');

      fs.writeFileSync(targetFilePath, csvHeaders + csvRows, 'utf-8');
      alert("Database exported successfully!");
    });
  }).catch(err => console.error(err));
}

module.exports = { exportToCSV };