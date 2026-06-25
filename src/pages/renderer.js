//UI Logic, Sidebar, Tabs, Interactivity
const { ipcRenderer } = require('electron');
const { db } = require('../database/db.js');

// Navigation Tab Router
function switchTab(viewName) {
  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(`${viewName}-view`).style.display = 'block';
  event.target.classList.add('active');
  
  if(viewName === 'tasks') loadTasks();
  if(viewName === 'dashboard') loadDashboardStats();
}

function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  html.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
}

// Write Task to DB
function addNewTask() {
  const title = document.getElementById('task-title').value;
  const priority = document.getElementById('task-priority').value;
  const date = document.getElementById('task-date').value;
  const time = document.getElementById('task-time').value;

  if (!title) return alert('Task description cannot be blank.');

  const stmt = db.prepare("INSERT INTO tasks (title, priority, due_date, due_time) VALUES (?, ?, ?, ?)");
  stmt.run(title, priority, date, time, function(err) {
    if (err) console.error(err);
    loadTasks();
    // Clear inputs
    document.getElementById('task-title').value = '';
  });
  stmt.finalize();
}

// Fetch and Render Tasks
function loadTasks() {
  const container = document.getElementById('task-container');
  container.innerHTML = '';
  
  db.all("SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date ASC", [], (err, rows) => {
    if (err) return;
    rows.forEach(task => {
      const card = document.createElement('div');
      card.className = `task-card priority-${task.priority}`;
      card.innerHTML = `
        <div>
          <strong>${task.title}</strong>
          <div style="font-size:12px; color:gray;">Due: ${task.due_date || 'No Date'} ${task.due_time || ''}</div>
        </div>
        <button onclick="completeTask(${task.id})" style="padding:5px 10px; cursor:pointer;">✓ Complete</button>
      `;
      container.appendChild(card);
    });
  });
}

function completeTask(id) {
  db.run("UPDATE tasks SET is_completed = 1 WHERE id = ?", [id], () => {
    loadTasks();
  });
}

function loadDashboardStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  
  db.get("SELECT count(*) as count FROM tasks WHERE due_date = ? AND is_completed = 0", [todayStr], (err, row) => {
    if(!err) document.getElementById('stat-today').innerText = row.count;
  });
  db.get("SELECT count(*) as count FROM tasks WHERE due_date < ? AND is_completed = 0", [todayStr], (err, row) => {
    if(!err) document.getElementById('stat-overdue').innerText = row.count;
  });
  db.get("SELECT count(*) as count FROM tasks WHERE is_completed = 1", [], (err, row) => {
    if(!err) document.getElementById('stat-done').innerText = row.count;
  });
}

// Run initial configurations
loadDashboardStats();