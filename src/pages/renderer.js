const React = require('react');
const ReactDOM = require('react-dom/client');
const { db, initDatabase } = require('../database/db.js');

const { useState, useEffect } = React;

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ today: 0, overdue: 0, done: 0 });
  const [form, setForm] = useState({ title: '', priority: 'Medium', date: '', time: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    initDatabase().then(() => {
      if (activeTab === 'tasks') {
        loadTasks();
      }
      if (activeTab === 'dashboard') {
        loadDashboardStats();
      }
    }).catch(err => console.error('Database initialization failed:', err));
  }, [activeTab]);

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleTheme() {
    setTheme(current => (current === 'dark' ? 'light' : 'dark'));
  }

  function addNewTask() {
    if (!form.title.trim()) return alert('Task description cannot be blank.');

    const stmt = db.prepare('INSERT INTO tasks (title, priority, due_date, due_time) VALUES (?, ?, ?, ?)');
    stmt.run(form.title.trim(), form.priority, form.date, form.time, function(err) {
      if (err) {
        console.error(err);
        return;
      }
      loadTasks();
      setForm({ title: '', priority: 'Medium', date: '', time: '' });
      setActiveTab('tasks');
    });
    stmt.finalize();
  }

  function loadTasks() {
    db.all('SELECT * FROM tasks WHERE is_completed = 0 ORDER BY due_date ASC', [], (err, rows) => {
      if (err) {
        console.error(err);
        return;
      }
      setTasks(rows);
    });
  }

  function completeTask(id) {
    db.run('UPDATE tasks SET is_completed = 1 WHERE id = ?', [id], err => {
      if (err) return console.error(err);
      loadTasks();
      if (activeTab === 'dashboard') loadDashboardStats();
    });
  }

  function loadDashboardStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextStats = { today: 0, overdue: 0, done: 0 };

    db.get('SELECT count(*) as count FROM tasks WHERE due_date = ? AND is_completed = 0', [todayStr], (err, row) => {
      if (!err && row) setStats(prev => ({ ...prev, today: row.count }));
    });
    db.get('SELECT count(*) as count FROM tasks WHERE due_date < ? AND is_completed = 0', [todayStr], (err, row) => {
      if (!err && row) setStats(prev => ({ ...prev, overdue: row.count }));
    });
    db.get('SELECT count(*) as count FROM tasks WHERE is_completed = 1', [], (err, row) => {
      if (!err && row) setStats(prev => ({ ...prev, done: row.count }));
    });
  }

  const navButton = (label, tab) =>
    React.createElement(
      'button',
      {
        className: `nav-btn ${activeTab === tab ? 'active' : ''}`,
        onClick: () => setActiveTab(tab)
      },
      label
    );

  const taskRows = tasks.map(task =>
    React.createElement(
      'div',
      { key: task.id, className: `task-card priority-${task.priority}` },
      React.createElement('div', null,
        React.createElement('strong', null, task.title),
        React.createElement('div', { style: { fontSize: '12px', color: 'gray' } },
          `Due: ${task.due_date || 'No Date'} ${task.due_time || ''}`
        )
      ),
      React.createElement(
        'button',
        { onClick: () => completeTask(task.id), style: { padding: '5px 10px', cursor: 'pointer' } },
        '✓ Complete'
      )
    )
  );

  return React.createElement('div', { id: 'app-shell', style: { display: 'flex', height: '100%' } },
    React.createElement('div', { id: 'sidebar' },
      React.createElement('h2', null, 'Taskmark'),
      React.createElement('hr', { style: { border: 0, borderTop: '1px solid var(--border-color)', width: '100%' } }),
      navButton('Dashboard', 'dashboard'),
      navButton('Tasks', 'tasks'),
      navButton('Calendar', 'calendar'),
      React.createElement('button', { style: { marginTop: 'auto' }, className: 'nav-btn', onClick: toggleTheme }, 'Toggle Theme')
    ),
    React.createElement('div', { id: 'main-content' },
      activeTab === 'dashboard' && React.createElement('div', { className: 'view-section' },
        React.createElement('h1', null, 'Dashboard'),
        React.createElement('div', { id: 'quick-stats', style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' } },
          React.createElement('div', { style: { background: 'var(--bg-sidebar)', padding: '20px', borderRadius: '8px' } },
            React.createElement('h3', null, 'Due Today'),
            React.createElement('p', { style: { fontSize: '24px', fontWeight: 'bold' } }, stats.today)
          ),
          React.createElement('div', { style: { background: 'var(--bg-sidebar)', padding: '20px', borderRadius: '8px' } },
            React.createElement('h3', null, 'Overdue'),
            React.createElement('p', { style: { fontSize: '24px', fontWeight: 'bold', color: '#ef4444' } }, stats.overdue)
          ),
          React.createElement('div', { style: { background: 'var(--bg-sidebar)', padding: '20px', borderRadius: '8px' } },
            React.createElement('h3', null, 'Completed'),
            React.createElement('p', { style: { fontSize: '24px', fontWeight: 'bold', color: '#10b981' } }, stats.done)
          )
        )
      ),
      activeTab === 'tasks' && React.createElement('div', { className: 'view-section' },
        React.createElement('h1', null, 'Manage Tasks'),
        React.createElement('div', { style: { background: 'var(--bg-sidebar)', padding: '20px', borderRadius: '8px', marginBottom: '20px' } },
          React.createElement('input', {
            type: 'text',
            value: form.title,
            placeholder: 'What needs to be done?',
            onChange: e => updateForm('title', e.target.value),
            style: { width: '100%', padding: '10px', marginBottom: '10px' }
          }),
          React.createElement('select', {
            value: form.priority,
            onChange: e => updateForm('priority', e.target.value),
            style: { width: '100%', padding: '10px', marginBottom: '10px' }
          },
            React.createElement('option', null, 'Low'),
            React.createElement('option', null, 'Medium'),
            React.createElement('option', null, 'High'),
            React.createElement('option', null, 'Critical')
          ),
          React.createElement('input', {
            type: 'date',
            value: form.date,
            onChange: e => updateForm('date', e.target.value),
            style: { width: '100%', padding: '10px', marginBottom: '10px' }
          }),
          React.createElement('input', {
            type: 'time',
            value: form.time,
            onChange: e => updateForm('time', e.target.value),
            style: { width: '100%', padding: '10px', marginBottom: '10px' }
          }),
          React.createElement('button', {
            onClick: addNewTask,
            style: { padding: '10px 20px', background: 'var(--accent-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }
          }, 'Add Task')
        ),
        React.createElement('div', { id: 'task-container' }, taskRows)
      ),
      activeTab === 'calendar' && React.createElement('div', { className: 'view-section' },
        React.createElement('h1', null, 'Calendar'),
        React.createElement('p', null, 'Calendar visualization schedules go here.')
      )
    )
  );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(React.createElement(App));