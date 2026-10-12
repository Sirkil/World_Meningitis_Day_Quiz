/** Deploy this Apps Script as a web app that runs as the Sheet owner. */
const QUIZ_SHEET_ID = '1BncAZn3nfe_dxeW02hZX3-9KEOPIMLQZPB0hTQvb3OA';
const SHEET_NAME = 'World Meningitis Day Quiz Logs';
const HEADERS = ['Name', 'Email', 'Consent', 'Q1 Points', 'Q2 Points', 'Q3 Points', 'Q4 Points', 'Q5 Points', 'Q6 Points', 'Q7 Points', 'Q8 Points', 'Q9 Points', 'Q10 Points', 'Total'];

/** Optional: run from the Apps Script editor to create and check the results tab. */
function setupQuizSheet() {
  getResultsSheet_();
}

function doGet() {
  try {
    getResultsSheet_();
    return HtmlService.createHtmlOutput('World Meningitis Day quiz results sheet is ready.');
  } catch (error) {
    console.error(error);
    return HtmlService.createHtmlOutput('World Meningitis Day quiz setup: ' + quizErrorResult_(error).code);
  }
}

function doPost(e) {
  const values = (e && e.parameter) || {};
  const nonce = /^[a-f0-9]{32}$/.test(values.nonce || '') ? values.nonce : '';
  let result;
  try {
    if (!nonce) throw new Error('Invalid request');
    if (values.action === 'check') {
      result = checkQuizEmail_(values.email);
    } else if (values.action === 'save') {
      result = saveQuiz_(values);
    } else throw new Error('Invalid request');
  } catch (error) {
    console.error(error);
    result = quizErrorResult_(error);
  }
  const payload = JSON.stringify({ type: 'wmd-quiz-result', nonce: nonce, result: result }).replace(/</g, '\\u003c');
  return HtmlService.createHtmlOutput('<!doctype html><html><body><script>window.top.postMessage(' + payload + ', "*");</script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function quizErrorResult_(error) {
  const message = String(error && error.message || error);
  if (message === 'SHEET_NOT_CONFIGURED') {
    return { ok: false, code: 'SETUP_REQUIRED', error: 'This quiz is not connected to its results sheet yet. Please contact the event team.' };
  }
  if (message === 'SHEET_HEADERS_MISMATCH') {
    return { ok: false, code: 'HEADERS_MISMATCH', error: 'The quiz results sheet needs attention. Please contact the event team.' };
  }
  if (message === 'SHEET_ACCESS_ERROR') {
    return { ok: false, code: 'SHEET_ACCESS_ERROR', error: 'The quiz cannot access its results sheet. Please contact the event team.' };
  }
  return { ok: false, code: 'SERVER_ERROR', error: 'The quiz is temporarily unavailable. Please try again or contact the event team.' };
}

function checkQuizEmail_(value) {
  const email = normalizeEmail_(value);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return { ok: true, taken: emailExists_(getResultsSheet_(), email) };
  } finally {
    lock.releaseLock();
  }
}

function saveQuiz_(values) {
  const name = String(values.name || '').trim().replace(/[\r\n]+/g, ' ');
  const email = normalizeEmail_(values.email);
  if (!name || name.length > 120 || values.consent !== 'true') throw new Error('Missing required data');
  let points;
  try { points = JSON.parse(values.points); } catch (error) { throw new Error('Invalid points'); }
  if (!Array.isArray(points) || points.length !== 10 || !points.every(function (point) {
    return Number.isInteger(point) && (point === 0 || (point >= 11 && point <= 20));
  })) throw new Error('Invalid points');
  const total = points.reduce(function (sum, point) { return sum + point; }, 0);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getResultsSheet_();
    if (emailExists_(sheet, email)) return { ok: false, code: 'ALREADY_TAKEN', error: 'You have already taken this quiz.' };
    sheet.appendRow([safeText_(name), safeText_(email), 'Yes'].concat(points, [total]));
    SpreadsheetApp.flush();
    return { ok: true, total: total };
  } finally {
    lock.releaseLock();
  }
}

function getResultsSheet_() {
  if (!QUIZ_SHEET_ID) throw new Error('SHEET_NOT_CONFIGURED');
  let spreadsheet;
  try {
    spreadsheet = SpreadsheetApp.openById(QUIZ_SHEET_ID);
  } catch (error) {
    console.error(error);
    throw new Error('SHEET_ACCESS_ERROR');
  }
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (firstRow.every(function (value) { return value === ''; })) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else if (HEADERS.some(function (heading, index) { return firstRow[index] !== heading; })) {
    throw new Error('SHEET_HEADERS_MISMATCH');
  }
  return sheet;
}

function emailExists_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  return sheet.getRange(2, 2, lastRow - 1, 1).getValues().some(function (row) {
    return String(row[0] || '').trim().replace(/^'/, '').toLowerCase() === email;
  });
}

function normalizeEmail_(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
  return email;
}

function safeText_(value) {
  return /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
}
