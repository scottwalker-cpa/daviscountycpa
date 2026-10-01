/**
 * DCCPA Application Backend - Google Apps Script
 * Receives applications from daviscountycpa.com, checks them, saves each one as a
 * row in this Google Sheet, and emails the coordinators.
 *
 * Protections:
 *   1. Cloudflare Turnstile: every submission must include a valid human-check token.
 *   2. Rate limiting: caps how many submissions the script accepts per 10 minutes / day.
 *   3. Duplicate blocking: one application per email address per 6 hours.
 *   4. Validation: required fields, formats, allowed values and length limits.
 *   5. Spam trap: the hidden "website" field must be empty.
 *   6. Formula-injection guard: values are never interpreted as Sheet formulas.
 *   7. Data retention: purgeOldApplications() deletes rows older than RETENTION_DAYS.
 *
 * Settings live in Project Settings > Script Properties, NOT in this file
 * (the website's GitHub repo is public). See SETUP.md.
 *   TURNSTILE_SECRET   (required) Cloudflare Turnstile secret key
 *   NOTIFY_EMAIL       (required) who gets new-application emails, comma-separated
 *   ALLOWED_HOSTNAMES  (optional) default: daviscountycpa.com,www.daviscountycpa.com
 *   RETENTION_DAYS     (optional) default: 365
 */

var SHEET_NAME = 'Applications';
var TURNSTILE_ACTION = 'apply';
var LIMIT_PER_10_MIN = 20;       // total submissions accepted per 10 minutes
var LIMIT_PER_DAY = 150;         // total submissions accepted per day
var DUPLICATE_WINDOW_SEC = 6 * 60 * 60;  // one application per email per 6 hours

var TSHIRT_SIZES = ['Small', 'Medium', 'Large', 'X-Large', '2X-Large', '3X-Large'];

// Sheet columns: [form field, header, max length]
var FIELDS = [
  ['firstName', 'First Name', 60],
  ['middleName', 'Middle Name', 60],
  ['lastName', 'Last Name', 60],
  ['email', 'Email', 254],
  ['phone', 'Phone', 30],
  ['dob', 'Date of Birth', 10],
  ['tshirt', 'T-Shirt Size', 10],
  ['address', 'Street Address', 200],
  ['employer', 'Employer / School', 120],
  ['dlNumber', 'UT Driver License #', 20],
  ['emergencyName', 'Emergency Contact', 120],
  ['emergencyPhone', 'Emergency Phone', 30],
  ['felony', 'Felony Conviction?', 3],
  ['misdemeanor', 'Class A/B Misdemeanor (5 yrs)?', 3],
  ['motivation', 'Statement of Interest', 2000],
  ['consentBackground', 'Background Check Consent', 3],
  ['consentFee', 'Fee Acknowledged', 3],
  ['signature', 'Signature', 120]
];

var REQUIRED = ['firstName', 'lastName', 'email', 'phone', 'dob', 'tshirt', 'address',
  'dlNumber', 'emergencyName', 'emergencyPhone', 'felony', 'misdemeanor',
  'motivation', 'consentBackground', 'consentFee', 'signature'];

// ---------------------------------------------------------------------------
// Web endpoint
// ---------------------------------------------------------------------------

function doPost(e) {
  var data = (e && e.parameter) || {};

  // Spam trap: real people never see or fill the hidden "website" field.
  // Answer "success" so bots don't learn they were caught; save nothing.
  if (data.website) {
    console.warn('Rejected: honeypot filled');
    return json_({ result: 'success' });
  }

  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('TURNSTILE_SECRET');
  if (!secret) {
    console.error('TURNSTILE_SECRET is not set; refusing all submissions (fail closed).');
    return error_('unavailable');
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return error_('busy');
  try {
    // Rate limit before doing any other work (including the Cloudflare call).
    if (!takeRateLimitSlot_()) {
      console.warn('Rejected: rate limit reached');
      return error_('rate_limited');
    }

    var problem = validate_(data);
    if (problem) {
      console.warn('Rejected: invalid input (' + problem + ')');
      return error_('invalid', problem);
    }

    if (!verifyTurnstile_(data['cf-turnstile-response'], secret, props)) {
      return error_('verification_failed');
    }

    var cache = CacheService.getScriptCache();
    var dupKey = 'email:' + hash_(String(data.email).trim().toLowerCase());
    if (cache.get(dupKey)) {
      console.warn('Rejected: duplicate email within window');
      return error_('duplicate');
    }

    var row = [new Date()].concat(FIELDS.map(function (f) { return clean_(data[f[0]], f[2]); }));
    getSheet_().appendRow(row);
    cache.put(dupKey, '1', DUPLICATE_WINDOW_SEC);
  } catch (err) {
    console.error(err);
    return error_('server_error');
  } finally {
    lock.releaseLock();
  }

  try { notify_(data, props); } catch (mailErr) { console.error('Email failed: ' + mailErr); }
  return json_({ result: 'success' });
}

// Visiting the Web App URL in a browser confirms the deployment is live.
function doGet() {
  return json_({ result: 'ok', service: 'DCCPA applications' });
}

// ---------------------------------------------------------------------------
// Protections
// ---------------------------------------------------------------------------

function verifyTurnstile_(token, secret, props) {
  if (!token) {
    console.warn('Rejected: missing Turnstile token');
    return false;
  }
  var res = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: { secret: secret, response: String(token) },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    console.error('Turnstile siteverify HTTP ' + res.getResponseCode());
    return false;
  }
  var out = JSON.parse(res.getContentText());
  if (!out.success) {
    console.warn('Rejected: Turnstile failed ' + JSON.stringify(out['error-codes'] || []));
    return false;
  }
  var allowed = (props.getProperty('ALLOWED_HOSTNAMES') || 'daviscountycpa.com,www.daviscountycpa.com')
    .split(',').map(function (h) { return h.trim().toLowerCase(); });
  if (allowed.indexOf(String(out.hostname || '').toLowerCase()) === -1) {
    console.warn('Rejected: Turnstile token from unexpected hostname ' + out.hostname);
    return false;
  }
  if (out.action && out.action !== TURNSTILE_ACTION) {
    console.warn('Rejected: Turnstile action mismatch ' + out.action);
    return false;
  }
  return true;
}

// Counts every attempt (successful or not) in 10-minute and daily buckets.
function takeRateLimitSlot_() {
  var cache = CacheService.getScriptCache();
  var now = Date.now();
  var buckets = [
    ['rl10:' + Math.floor(now / 600000), LIMIT_PER_10_MIN, 900],
    ['rlday:' + Math.floor(now / 86400000), LIMIT_PER_DAY, 21600]
  ];
  for (var i = 0; i < buckets.length; i++) {
    if (Number(cache.get(buckets[i][0]) || 0) >= buckets[i][1]) return false;
  }
  buckets.forEach(function (b) {
    cache.put(b[0], String(Number(cache.get(b[0]) || 0) + 1), b[2]);
  });
  return true;
}

// Returns a short reason string if the submission is invalid, or '' if it is fine.
function validate_(d) {
  for (var i = 0; i < REQUIRED.length; i++) {
    if (!String(d[REQUIRED[i]] || '').trim()) return 'missing ' + REQUIRED[i];
  }
  for (var j = 0; j < FIELDS.length; j++) {
    if (String(d[FIELDS[j][0]] || '').length > FIELDS[j][2]) return 'too long: ' + FIELDS[j][0];
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email).trim())) return 'email';
  if (!phoneOk_(d.phone)) return 'phone';
  if (!phoneOk_(d.emergencyPhone)) return 'emergencyPhone';
  if (!/^[A-Za-z0-9 -]{4,20}$/.test(String(d.dlNumber).trim())) return 'dlNumber';
  if (TSHIRT_SIZES.indexOf(d.tshirt) === -1) return 'tshirt';
  if (['Yes', 'No'].indexOf(d.felony) === -1 || ['Yes', 'No'].indexOf(d.misdemeanor) === -1) return 'disclosures';
  if (d.consentBackground !== 'Yes' || d.consentFee !== 'Yes') return 'consent';

  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d.dob));
  if (!m) return 'dob';
  var dob = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  var age = (Date.now() - dob.getTime()) / (365.25 * 86400000);
  if (isNaN(age) || age < 17 || age > 110) return 'dob range';
  return '';
}

function phoneOk_(p) {
  var digits = String(p || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// Trims input, caps its length, and stops Sheets from treating it as a formula.
function clean_(value, maxLen) {
  var v = String(value == null ? '' : value).trim().slice(0, maxLen || 2000);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

// ---------------------------------------------------------------------------
// Sheet, email, responses
// ---------------------------------------------------------------------------

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Submitted'].concat(FIELDS.map(function (f) { return f[1]; })));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FIELDS.length + 1).setFontWeight('bold');
  }
  return sheet;
}

function notify_(data, props) {
  var to = props.getProperty('NOTIFY_EMAIL');
  if (!to) return;
  var name = clean_(data.firstName, 60) + ' ' + clean_(data.lastName, 60);
  var lines = [
    'A new Citizens Police Academy application was submitted.',
    '',
    'Name: ' + name,
    'Email: ' + clean_(data.email, 254),
    'Phone: ' + clean_(data.phone, 30)
  ];
  if (data.felony === 'Yes') lines.push('Felony disclosure: YES');
  if (data.misdemeanor === 'Yes') lines.push('Misdemeanor disclosure: YES');
  // DOB, license number and address are deliberately left out of email.
  lines.push('', 'Full details: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
  // GmailApp (not MailApp): new Workspace accounts can have script mail sent via
  // MailApp rejected by Google, while mail sent through the account's Gmail works.
  GmailApp.sendEmail(to, 'New DCCPA Application: ' + name, lines.join('\n'), {
    replyTo: clean_(data.email, 254),
    name: 'DCCPA Applications'
  });
}

function error_(code, detail) {
  return json_({ result: 'error', code: code, detail: detail || '' });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Admin functions: run these from the Apps Script editor (select, then Run)
// ---------------------------------------------------------------------------

// Reports which settings are in place. Run after setup; see the Execution log.
function checkSetup() {
  var p = PropertiesService.getScriptProperties();
  ['TURNSTILE_SECRET', 'NOTIFY_EMAIL', 'ALLOWED_HOSTNAMES', 'RETENTION_DAYS'].forEach(function (k) {
    var v = p.getProperty(k);
    console.log(k + ': ' + (v ? (k === 'TURNSTILE_SECRET' ? 'set (hidden)' : v) : 'NOT SET'));
  });
  var triggers = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'purgeOldApplications';
  });
  console.log('Daily cleanup trigger: ' + (triggers.length ? 'installed' : 'NOT installed (run installCleanupTrigger)'));
  console.log('Sheet: ' + getSheet_().getParent().getUrl());
}

// Installs a daily 3 AM job that runs purgeOldApplications. Safe to run twice.
function installCleanupTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'purgeOldApplications') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('purgeOldApplications').timeBased().everyDays(1).atHour(3).create();
  console.log('Daily cleanup trigger installed.');
}

// Deletes application rows older than RETENTION_DAYS (default 365).
function purgeOldApplications() {
  var days = Number(PropertiesService.getScriptProperties().getProperty('RETENTION_DAYS') || 365);
  if (!(days > 0)) return;
  var cutoff = new Date(Date.now() - days * 86400000);
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var stamps = sheet.getRange(2, 1, last - 1, 1).getValues();
  // Rows are appended in time order, so old rows are at the top.
  var oldCount = 0;
  while (oldCount < stamps.length && stamps[oldCount][0] instanceof Date && stamps[oldCount][0] < cutoff) oldCount++;
  if (oldCount > 0) sheet.deleteRows(2, oldCount);
  console.log('Removed ' + oldCount + ' application(s) older than ' + days + ' days.');
}

// Sends a test alert to NOTIFY_EMAIL and shows any error. Safe to run anytime.
function sendTestEmail() {
  var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  console.log('Sending to: ' + to);
  GmailApp.sendEmail(to, 'DCCPA test email',
    'If you received this, application alerts are working.', { name: 'DCCPA Applications' });
  console.log('Sent with no errors. Check each inbox (and Admin > Email Log Search).');
}
