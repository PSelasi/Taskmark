const fs = require('fs');
const { db } = require('../database/db.js');

function exportToCSV(targetFilePath) {
  db.all("SELECT id, title, priority, due_date, due_time, is_completed FROM tasks", [], (err, rows) => {
    if (err) return console.error(err);
    
    const csvHeaders = "ID,Title,Priority,DueDate,DueTime,IsCompleted\n";
    const csvRows = rows.map(r => `${r.id},"${r.title}",${r.priority},${r.due_date},${r.due_time},${r.is_completed}`).join('\n');
    
    fs.writeFileSync(targetFilePath, csvHeaders + csvRows, 'utf-8');
    alert("Database exported successfully!");
  });
}

module.exports = { exportToCSV };