/**
 * DCCPA Application Backend - Google Apps Script
 * Receives applications from daviscountycpa.com, saves each one as a row in
 * this Google Sheet, and emails the coordinators.
 * Setup steps: see SETUP.md in this folder.
 */

// ---- Settings: edit these ------------------------------------------------
// Who gets the "new application" email. Separate several addresses with commas.
var NOTIFY_EMAIL = 'CHANGE-ME@example.com';
// Name of the sheet tab that stores applications (it is created automatically).
var SHEET_NAME = 'Applications';
// --------------------------------------------------------------------------

// Column order in the sheet. Each entry is [form field name, column header].
var FIELDS = [
  ['firstName', 'First Name'],
  ['middleName', 'Middle Name'],
  ['lastName', 'Last Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['dob', 'Date of Birth'],
  ['tshirt', 'T-Shirt Size'],
  ['address', 'Street Address'],
  ['employer', 'Employer / School'],
  ['dlNumber', 'UT Driver License #'],
  ['emergencyName', 'Emergency Contact'],
  ['emergencyPhone', 'Emergency Phone'],
  ['felony', 'Felony Conviction?'],
  ['misdemeanor', 'Class A/B Misdemeanor (5 yrs)?'],
  ['motivation', 'Statement of Interest'],
  ['consentBackground', 'Background Check Consent'],
  ['consentFee', 'Fee Acknowledged'],
  ['signature', 'Signature']
];

var REQUIRED = ['firstName', 'lastName', 'email', 'phone', 'dob', 'tshirt', 'address',
  'dlNumber', 'emergencyName', 'emergencyPhone', 'felony', 'misdemeanor',
  'motivation', 'consentBackground', 'consentFee', 'signature'];

function doPost(e) {
  try {
    var data = (e && e.parameter) || {};

    // Spam trap: the hidden "website" field is left empty by real people.
    // Answer "success" so bots don't learn they were caught, but save nothing.
    if (data.website) return json_({ result: 'success' });

    var missing = REQUIRED.filter(function (k) { return !String(data[k] || '').trim(); });
    if (missing.length) {
      return json_({ result: 'error', message: 'Missing required fields: ' + missing.join(', ') });
    }

    // Lock so two applications arriving at the same moment don't collide.
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet_();
      var row = [new Date()].concat(FIELDS.map(function (f) {
        return clean_(data[f[0]]);
      }));
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    notify_(data);
    return json_({ result: 'success' });
  } catch (err) {
    console.error(err);
    return json_({ result: 'error', message: 'Server error. Please try again.' });
  }
}

// Simple check that the deployment is live: open the Web App URL in a browser.
function doGet() {
  return json_({ result: 'ok', service: 'DCCPA applications' });
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Submitted'].concat(FIELDS.map(function (f) { return f[1]; })));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, FIELDS.length + 1).setFontWeight('bold');
  }
  return sheet;
}

// Trims input, caps its length, and stops Sheets from treating it as a formula
// (a value starting with = + - @ could otherwise run as a formula).
function clean_(value) {
  var v = String(value == null ? '' : value).trim().slice(0, 2000);
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  return v;
}

function notify_(data) {
  if (!NOTIFY_EMAIL || NOTIFY_EMAIL.indexOf('CHANGE-ME') === 0) return;
  var name = clean_(data.firstName) + ' ' + clean_(data.lastName);
  var flags = [];
  if (data.felony === 'Yes') flags.push('Felony disclosure: YES');
  if (data.misdemeanor === 'Yes') flags.push('Misdemeanor disclosure: YES');
  // The email leaves out DOB, license number and address on purpose;
  // coordinators read those in the Sheet.
  var body = [
    'A new Citizens Police Academy application was submitted.',
    '',
    'Name: ' + name,
    'Email: ' + clean_(data.email),
    'Phone: ' + clean_(data.phone),
    flags.length ? '\n' + flags.join('\n') : '',
    '',
    'Full details: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ].join('\n');
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    subject: 'New DCCPA Application: ' + name,
    body: body,
    replyTo: clean_(data.email)
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
