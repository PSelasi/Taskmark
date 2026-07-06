//Background reminder scanner
const { ipcRenderer } = require('electron');
const { db, initDatabase } = require('../database/db.js');
const { getNextOccurrence } = require('./recurrence.js');

function pollReminders() {
  initDatabase().catch(err => console.error('Reminder DB init failed:', err));

  setInterval(() => {
    initDatabase().then(() => {
      const now = new Date();

      db.all(
        "SELECT * FROM tasks WHERE is_completed = 0",
        [],
        (err, rows) => {
          if (err) return;

          rows.forEach(task => {
            const taskDate = task.due_date;
            const taskTime = task.due_time;
            const recurrence = task.recurrence;
            const recurrenceStart = task.recurrence_start;
            const nextOccurrence = task.next_occurrence;

            const baseDate = recurrenceStart || taskDate;
            const scheduledAt = nextOccurrence ? new Date(nextOccurrence) : null;
            const shouldFire = scheduledAt && scheduledAt <= now;

            if (!shouldFire) {
              if (recurrence && !scheduledAt) {
                const computedNext = getNextOccurrence(recurrence, new Date(`${baseDate}T${taskTime || '09:00'}`), now);
                if (computedNext) {
                  db.run('UPDATE tasks SET next_occurrence = ? WHERE id = ?', [computedNext.toISOString(), task.id], err => {
                    if (err) console.error(err);
                  });
                }
              }
              return;
            }

            ipcRenderer.send('send-notification', {
              title: `Reminder: ${task.priority} Priority Task`,
              body: task.title
            });

            const nextDate = recurrence
              ? getNextOccurrence(recurrence, new Date(`${baseDate}T${taskTime || '09:00'}`), scheduledAt)
              : null;

            db.run(
              recurrence && nextDate
                ? 'UPDATE tasks SET next_occurrence = ? WHERE id = ?'
                : 'UPDATE tasks SET next_occurrence = NULL WHERE id = ?',
              recurrence && nextDate ? [nextDate.toISOString(), task.id] : [task.id],
              err => {
                if (err) console.error(err);
              }
            );
          });
        }
      );
    }).catch(err => console.error('Reminder DB init failed:', err));
  }, 60000);
}

// Start tracking immediately on app launch
pollReminders();