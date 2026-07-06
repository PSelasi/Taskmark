const React = require('react');
const ReactDOM = require('react-dom/client');
const { db, initDatabase } = require('../database/db.js');

const { useEffect, useState } = React;

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'categories', label: 'Categories' }
];

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: 'all', priority: 'all', due: 'all' });
  const [form, setForm] = useState({ title: '', note: '', priority: 'Medium', date: '', time: '', category: '', recurrence: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#2563eb' });
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    initDatabase()
      .then(() => {
        loadCategories();
        loadTasks();
        setLoading(false);
      })
      .catch(err => {
        console.error('Database init failed:', err);
        setLoading(false);
      });
  }, []);

  function loadCategories() {
    db.all('SELECT id, name, color FROM categories ORDER BY id', [], (err, rows) => {
      if (err) return console.error(err);
      const nextCategories = rows || [];
      setCategories(nextCategories);
      if (!form.category && nextCategories.length) {
        setForm(prev => ({ ...prev, category: nextCategories[0].id }));
      }
    });
  }

  function loadTasks() {
    db.all(
      'SELECT id, title, notes AS note, priority, due_date AS dueDate, due_time AS dueTime, category_id AS category, is_completed AS isCompleted, created_at AS createdAt FROM tasks ORDER BY is_completed ASC, due_date ASC, due_time ASC',
      [],
      (err, rows) => {
        if (err) return console.error(err);
        const mappedRows = (rows || []).map(row => ({
          ...row,
          isCompleted: Boolean(row.isCompleted),
          dueDate: row.dueDate || '',
          dueTime: row.dueTime || ''
        }));
        setTasks(mappedRows);
      }
    );
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleTheme() {
    setTheme(current => (current === 'dark' ? 'light' : 'dark'));
  }

  function addTask(event) {
    event.preventDefault();
    if (!form.title.trim()) return alert('Task description cannot be blank.');

    const categoryId = form.category || categories[0]?.id || null;
    const stmt = db.prepare('INSERT INTO tasks (title, notes, priority, due_date, due_time, category_id, is_completed, recurrence, recurrence_start, next_occurrence) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)');
    stmt.run(form.title.trim(), form.note.trim(), form.priority, form.date, form.time, categoryId, form.recurrence || '', form.recurrence ? `${form.date || today}T${form.time || '09:00'}` : null, null, err => {
      if (err) return console.error(err);
      loadTasks();
      setForm({ title: '', note: '', priority: 'Medium', date: '', time: '', category: categoryId || '', recurrence: '' });
      setActiveView('tasks');
    });
    stmt.finalize();
  }

  function toggleTask(id) {
    db.run('UPDATE tasks SET is_completed = CASE WHEN is_completed = 0 THEN 1 ELSE 0 END WHERE id = ?', [id], err => {
      if (err) return console.error(err);
      loadTasks();
    });
  }

  function removeTask(id) {
    if (!confirm('Remove this task?')) return;
    db.run('DELETE FROM tasks WHERE id = ?', [id], err => {
      if (err) return console.error(err);
      loadTasks();
    });
  }

  function saveEdit(id) {
    db.run('UPDATE tasks SET title = ? WHERE id = ?', [editTitle, id], err => {
      if (err) return console.error(err);
      setEditingId(null);
      loadTasks();
    });
  }

  function addCategory(event) {
    event.preventDefault();
    if (!categoryForm.name.trim()) return;
    const stmt = db.prepare('INSERT INTO categories (name, color) VALUES (?, ?)');
    stmt.run(categoryForm.name.trim(), categoryForm.color, err => {
      if (err) return console.error(err);
      setCategoryForm({ name: '', color: '#2563eb' });
      loadCategories();
    });
    stmt.finalize();
  }

  const today = new Date().toISOString().split('T')[0];
  const pendingTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);
  const dueToday = pendingTasks.filter(task => task.dueDate === today);
  const overdue = pendingTasks.filter(task => task.dueDate && task.dueDate < today);
  const filteredTasks = pendingTasks.filter(task => {
    const haystack = `${task.title} ${task.note}`.toLowerCase();
    if (filters.search && !haystack.includes(filters.search.toLowerCase())) return false;
    if (filters.status !== 'all' && (filters.status === 'completed' ? !task.isCompleted : task.isCompleted)) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.due === 'today' && task.dueDate !== today) return false;
    if (filters.due === 'overdue' && !(task.dueDate && task.dueDate < today)) return false;
    if (filters.due === 'upcoming' && !(task.dueDate && task.dueDate > today)) return false;
    return true;
  });

  const calendarMap = {};
  tasks.forEach(task => {
    if (!task.dueDate) return;
    if (!calendarMap[task.dueDate]) calendarMap[task.dueDate] = [];
    calendarMap[task.dueDate].push(task);
  });

  const sidebar = React.createElement('aside', { className: 'sidebar' },
    React.createElement('div', { className: 'sidebar-brand' },
      React.createElement('div', { className: 'brand-badge' }, '✓'),
      React.createElement('div', null,
        React.createElement('div', { className: 'brand-title' }, 'TaskMark'),
        React.createElement('div', { className: 'brand-subtitle' }, 'Offline productivity')
      )
    ),
    React.createElement('nav', { className: 'nav-list' }, navItems.map(item =>
      React.createElement('button', {
        key: item.id,
        className: `nav-btn ${activeView === item.id ? 'active' : ''}`,
        onClick: () => setActiveView(item.id)
      }, item.label)
    )),
    React.createElement('button', { className: 'theme-toggle', onClick: toggleTheme }, theme === 'dark' ? '☀ Light mode' : '☾ Dark mode')
  );

  const content = React.createElement('main', { className: 'main-panel' },
    loading ? React.createElement('div', { className: 'panel card' }, 'Loading your tasks…') : (
      activeView === 'dashboard' ? React.createElement(DashboardView, {
        tasks,
        dueToday,
        overdue,
        completed: completedTasks,
        pending: pendingTasks
      }) :
      activeView === 'tasks' ? React.createElement(TasksView, {
        tasks: filteredTasks,
        categories,
        form,
        updateForm,
        addTask,
        toggleTask,
        removeTask,
        editingId,
        editTitle,
        setEditingId,
        setEditTitle,
        saveEdit,
        filters,
        setFilters
      }) :
      activeView === 'calendar' ? React.createElement(CalendarView, { calendarMap, tasks }) :
      React.createElement(CategoriesView, { categories, categoryForm, setCategoryForm, addCategory })
    )
  );

  return React.createElement('div', { className: 'app-shell' }, sidebar, content);
}

function DashboardView({ tasks, dueToday, overdue, completed, pending }) {
  const completion = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  return React.createElement('div', { className: 'view-stack' },
    React.createElement('div', { className: 'hero' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'page-title' }, 'Dashboard'),
        React.createElement('p', { className: 'page-subtitle' }, 'Your productivity at a glance.')
      )
    ),
    React.createElement('div', { className: 'stats-grid' },
      createMetric('Due Today', dueToday.length, 'warning', `${dueToday.length} tasks due now`),
      createMetric('Overdue', overdue.length, 'danger', overdue.length ? 'Needs attention' : 'All caught up'),
      createMetric('Completed', completed.length, 'success', `${completion}% completion rate`)
    ),
    React.createElement('div', { className: 'panel-grid' },
      React.createElement('div', { className: 'panel card' },
        React.createElement('h3', { className: 'panel-title' }, 'Quick Overview'),
        React.createElement('div', { className: 'info-list' },
          React.createElement('div', { className: 'info-row' }, React.createElement('span', null, 'Active tasks'), React.createElement('strong', null, pending.length)),
          React.createElement('div', { className: 'info-row' }, React.createElement('span', null, 'Completed tasks'), React.createElement('strong', null, completed.length)),
          React.createElement('div', { className: 'info-row' }, React.createElement('span', null, 'Total tasks'), React.createElement('strong', null, tasks.length))
        )
      ),
      React.createElement('div', { className: 'panel card' },
        React.createElement('h3', { className: 'panel-title' }, 'Recent activity'),
        completed.length ? React.createElement('ul', { className: 'activity-list' }, completed.slice(0, 5).map(task =>
          React.createElement('li', { key: task.id, className: 'activity-item' },
            React.createElement('span', null, task.title),
            React.createElement('small', null, task.dueDate || 'No date')
          )
        )) : React.createElement('p', { className: 'empty-state' }, 'No completed tasks yet.')
      )
    )
  );
}

function createMetric(label, value, tone, hint) {
  const toneClass = tone === 'danger' ? 'metric-danger' : tone === 'success' ? 'metric-success' : 'metric-warning';
  return React.createElement('div', { className: `card metric ${toneClass}` },
    React.createElement('div', { className: 'metric-label' }, label),
    React.createElement('div', { className: 'metric-value' }, value),
    React.createElement('div', { className: 'metric-hint' }, hint)
  );
}

function TasksView({ tasks, categories, form, updateForm, addTask, toggleTask, removeTask, editingId, editTitle, setEditingId, setEditTitle, saveEdit, filters, setFilters }) {
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statusOptions = ['all', 'active', 'completed'];
  const dueOptions = ['all', 'today', 'overdue', 'upcoming'];

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  return React.createElement('div', { className: 'view-stack' },
    React.createElement('div', { className: 'hero' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'page-title' }, 'Tasks'),
        React.createElement('p', { className: 'page-subtitle' }, `${tasks.length} visible task${tasks.length === 1 ? '' : 's'}`)
      )
    ),
    React.createElement('form', { className: 'card form-card', onSubmit: addTask },
      React.createElement('div', { className: 'field-row' },
        React.createElement('input', {
          className: 'input',
          placeholder: 'Task title…',
          value: form.title,
          onChange: event => updateForm('title', event.target.value)
        }),
        React.createElement('input', {
          className: 'input',
          placeholder: 'Quick note',
          value: form.note,
          onChange: event => updateForm('note', event.target.value)
        })
      ),
      React.createElement('div', { className: 'field-row' },
        React.createElement('select', {
          className: 'input',
          value: form.priority,
          onChange: event => updateForm('priority', event.target.value)
        }, priorities.map(priority => React.createElement('option', { key: priority, value: priority }, priority))),
        React.createElement('select', {
          className: 'input',
          value: form.category,
          onChange: event => updateForm('category', event.target.value)
        }, categories.map(category => React.createElement('option', { key: category.id, value: category.id }, category.name)))
      ),
      React.createElement('div', { className: 'field-row' },
        React.createElement('input', {
          className: 'input',
          type: 'date',
          value: form.date,
          onChange: event => updateForm('date', event.target.value)
        }),
        React.createElement('input', {
          className: 'input',
          type: 'time',
          value: form.time,
          onChange: event => updateForm('time', event.target.value)
        }),
        React.createElement('input', {
          className: 'input',
          placeholder: 'RRULE (optional), e.g. FREQ=DAILY;INTERVAL=1',
          value: form.recurrence,
          onChange: event => updateForm('recurrence', event.target.value)
        }),
        React.createElement('button', { className: 'btn primary', type: 'submit' }, 'Add Task')
      )
    ),
    React.createElement('div', { className: 'card toolbar' },
      React.createElement('input', {
        className: 'input',
        placeholder: 'Search tasks…',
        value: filters.search,
        onChange: event => updateFilter('search', event.target.value)
      }),
      React.createElement('select', { className: 'input', value: filters.status, onChange: event => updateFilter('status', event.target.value) },
        React.createElement('option', { value: 'all' }, 'All statuses'),
        React.createElement('option', { value: 'active' }, 'Active'),
        React.createElement('option', { value: 'completed' }, 'Completed')
      ),
      React.createElement('select', { className: 'input', value: filters.priority, onChange: event => updateFilter('priority', event.target.value) },
        React.createElement('option', { value: 'all' }, 'All priorities'),
        priorities.map(priority => React.createElement('option', { key: priority, value: priority }, priority))
      ),
      React.createElement('select', { className: 'input', value: filters.due, onChange: event => updateFilter('due', event.target.value) },
        React.createElement('option', { value: 'all' }, 'Any due date'),
        dueOptions.slice(1).map(option => React.createElement('option', { key: option, value: option }, option.charAt(0).toUpperCase() + option.slice(1)))
      )
    ),
    tasks.length ? React.createElement('div', { className: 'task-list' }, tasks.map(task => {
      const category = categories.find(item => item.id === task.category);
      return React.createElement('div', { key: task.id, className: `task-card ${task.isCompleted ? 'completed' : ''}` },
        React.createElement('div', { className: 'task-main' },
          editingId === task.id ? React.createElement('input', {
            className: 'input',
            autoFocus: true,
            value: editTitle,
            onChange: event => setEditTitle(event.target.value),
            onBlur: () => saveEdit(task.id),
            onKeyDown: event => event.key === 'Enter' && saveEdit(task.id)
          }) : React.createElement('div', { className: 'task-title' }, task.title),
          task.note ? React.createElement('div', { className: 'task-note' }, task.note) : null,
          React.createElement('div', { className: 'task-meta' },
            React.createElement('span', { className: 'pill' }, task.priority),
            category ? React.createElement('span', { className: 'pill muted', style: { borderColor: category.color, color: category.color } }, category.name) : null,
            React.createElement('span', { className: 'pill muted' }, task.dueDate || 'No date')
          )
        ),
        React.createElement('div', { className: 'task-actions' },
          React.createElement('button', { className: 'btn small', onClick: () => toggleTask(task.id) }, task.isCompleted ? 'Undo' : 'Complete'),
          React.createElement('button', { className: 'btn small', onClick: () => { setEditingId(task.id); setEditTitle(task.title); } }, 'Edit'),
          React.createElement('button', { className: 'btn small danger', onClick: () => removeTask(task.id) }, 'Delete')
        )
      );
    })) : React.createElement('div', { className: 'panel card empty-state' }, 'No tasks match your filters yet.')
  );
}

function CalendarView({ calendarMap, tasks }) {
  const dates = Object.keys(calendarMap).sort();
  return React.createElement('div', { className: 'view-stack' },
    React.createElement('div', { className: 'hero' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'page-title' }, 'Calendar'),
        React.createElement('p', { className: 'page-subtitle' }, 'Upcoming deadlines at a glance.')
      )
    ),
    React.createElement('div', { className: 'panel card' },
      dates.length ? React.createElement('div', { className: 'calendar-list' }, dates.map(date =>
        React.createElement('div', { key: date, className: 'calendar-item' },
          React.createElement('div', { className: 'calendar-date' }, date),
          React.createElement('ul', { className: 'activity-list' }, calendarMap[date].map(task => React.createElement('li', { key: task.id, className: 'activity-item' }, task.title)))
        )
      )) : React.createElement('p', { className: 'empty-state' }, 'No due dates yet.')
    )
  );
}

function CategoriesView({ categories, categoryForm, setCategoryForm, addCategory }) {
  return React.createElement('div', { className: 'view-stack' },
    React.createElement('div', { className: 'hero' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'page-title' }, 'Categories'),
        React.createElement('p', { className: 'page-subtitle' }, 'Keep work organized by area.')
      )
    ),
    React.createElement('form', { className: 'card form-card', onSubmit: addCategory },
      React.createElement('div', { className: 'field-row' },
        React.createElement('input', {
          className: 'input',
          placeholder: 'Category name',
          value: categoryForm.name,
          onChange: event => setCategoryForm(prev => ({ ...prev, name: event.target.value }))
        }),
        React.createElement('input', {
          className: 'input',
          type: 'color',
          value: categoryForm.color,
          onChange: event => setCategoryForm(prev => ({ ...prev, color: event.target.value }))
        }),
        React.createElement('button', { className: 'btn primary', type: 'submit' }, 'Add Category')
      )
    ),
    React.createElement('div', { className: 'panel card' },
      categories.length ? React.createElement('div', { className: 'category-list' }, categories.map(category =>
        React.createElement('div', { key: category.id, className: 'category-item' },
          React.createElement('span', { className: 'category-dot', style: { backgroundColor: category.color } }),
          React.createElement('span', null, category.name)
        )
      )) : React.createElement('p', { className: 'empty-state' }, 'No categories yet.')
    )
  );
}

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(React.createElement(App));