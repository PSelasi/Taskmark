const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { resolveDatabasePath } = require('../src/database/db.js');
const { getNextOccurrence } = require('../src/services/recurrence.js');

test('falls back to a safe local path when Electron app is unavailable', () => {
  const result = resolveDatabasePath({ app: undefined });
  assert.equal(result, path.join(process.cwd(), 'task_reminder_pro.db'));
});

test('initializes the schema through a promise', async () => {
  const { initDatabase } = require('../src/database/db.js');
  const result = initDatabase();

  assert.equal(typeof result?.then, 'function', 'initDatabase should return a promise');
  await result;
});

test('computes the next recurrence occurrence from an RRULE string', () => {
  const dtstart = new Date(2026, 6, 6, 9, 0, 0);
  const after = new Date(2026, 6, 6, 9, 0, 0);
  const next = getNextOccurrence('FREQ=DAILY;COUNT=3', dtstart, after);

  assert.ok(next instanceof Date);
  assert.equal(next.getFullYear(), 2026);
  assert.equal(next.getMonth(), 6);
  assert.equal(next.getDate(), 7);
});
