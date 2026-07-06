//Background reminder scanner
const { ipcRenderer } = require('electron');
const { db, initDatabase } = require('../database/db.js');

function pollReminders() {
  initDatabase().catch(err => console.error('Reminder DB init failed:', err));

  setInterval(() => {
    initDatabase().then(() => {
      const now = new Date();
      const currentDate = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

      db.all(
        "SELECT * FROM tasks WHERE due_date = ? AND due_time = ? AND is_completed = 0",
        [currentDate, currentTime],
        (err, rows) => {
          if (err) return;
          rows.forEach(task => {
            ipcRenderer.send('send-notification', {
              title: `Reminder: ${task.priority} Priority Task`,
              body: task.title
            });
          });
        }
      );
    }).catch(err => console.error('Reminder DB init failed:', err));
  }, 60000); // Check precisely every 60 seconds
}

// Start tracking immediately on app launch
pollReminders();