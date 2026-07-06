const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { resolveDatabasePath } = require('../src/database/db.js');

test('falls back to a safe local path when Electron app is unavailable', () => {
  const result = resolveDatabasePath({ app: undefined });
  assert.equal(result, path.join(process.cwd(), 'task_reminder_pro.db'));
});
