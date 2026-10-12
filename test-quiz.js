const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = __dirname;
const rows = [];
const sheet = {
  getRange(row, col, height, width) {
    return {
      getValues() {
        return Array.from({ length: height }, (_, offset) => Array.from({ length: width }, (_, column) => rows[row - 1 + offset]?.[col - 1 + column] ?? ''));
      },
      setValues(values) { values.forEach((value, offset) => { rows[row - 1 + offset] = value; }); }
    };
  },
  getLastRow() { return rows.length; },
  appendRow(row) { rows.push(row); },
  setFrozenRows() {}
};
const spreadsheet = { getId() { return 'test-sheet-id'; }, getSheetByName() { return sheet; }, insertSheet() { return sheet; } };
const properties = new Map();
const context = {
  console: { error() {} },
  SpreadsheetApp: { getActiveSpreadsheet: () => spreadsheet, openById(id) { assert.equal(id, 'test-sheet-id'); return spreadsheet; }, flush() {} },
  PropertiesService: { getScriptProperties: () => ({ getProperty(key) { return properties.get(key); }, setProperty(key, value) { properties.set(key, value); } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  HtmlService: {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createHtmlOutput(html) { return { html, setXFrameOptionsMode() { return this; } }; }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8'), context);
context.setupQuizSheet();
const email = 'test@example.com';
const initial = context.doPost({ parameter: { action: 'check', email, nonce: 'b'.repeat(32) } });
assert.match(initial.html, /"taken":false/);
const points = [20, 0, 19, 18, 17, 16, 15, 14, 13, 12];
const params = { action: 'save', nonce: 'a'.repeat(32), name: 'Test Person', email, consent: 'true', points: JSON.stringify(points) };
const saved = context.doPost({ parameter: params });
assert.match(saved.html, /"ok":true/);
assert.equal(rows.length, 2);
assert.equal(rows[0].join(','), 'Name,Email,Consent,Q1 Points,Q2 Points,Q3 Points,Q4 Points,Q5 Points,Q6 Points,Q7 Points,Q8 Points,Q9 Points,Q10 Points,Total');
assert.equal(JSON.stringify(rows[1]), JSON.stringify(['Test Person', email, 'Yes', ...points, 144]));
const repeated = context.doPost({ parameter: params });
assert.match(repeated.html, /ALREADY_TAKEN/);
assert.equal(rows.length, 2);
const checked = context.doPost({ parameter: { action: 'check', email: 'TEST@example.com', nonce: 'c'.repeat(32) } });
assert.match(checked.html, /"taken":true/);
properties.delete('QUIZ_SHEET_ID');
assert.match(context.doGet().html, /SETUP_REQUIRED/);
assert.match(context.doPost({ parameter: { action: 'check', email, nonce: 'd'.repeat(32) } }).html, /SETUP_REQUIRED/);
properties.set('QUIZ_SHEET_ID', 'test-sheet-id');
rows[0] = ['Incorrect header', ...rows[0].slice(1)];
assert.match(context.doGet().html, /HEADERS_MISMATCH/);
rows[0] = ['Name', ...rows[0].slice(1)];
const badPoints = context.doPost({ parameter: { ...params, email: 'other@example.com', points: JSON.stringify([99, ...points.slice(1)]) } });
assert.match(badPoints.html, /"ok":false/);
assert.equal(rows.length, 2);
const formulaName = context.doPost({ parameter: { ...params, email: 'other@example.com', name: '=HYPERLINK("bad")' } });
assert.match(formulaName.html, /"ok":true/);
assert.ok(rows[2][0].startsWith("'="));
assert.ok(!fs.readFileSync(path.join(root, 'quiz.js'), 'utf8').includes('localStorage'));
assert.ok(!fs.readFileSync(path.join(root, 'quiz.js'), 'utf8').includes('sessionStorage'));
assert.ok(!fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes('<style>'));
console.log('Apps Script and page checks passed');
