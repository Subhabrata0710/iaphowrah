/**
 * ============================================================
 * Google Apps Script Backend for 45th WB PEDICON 2026
 * IAP Howrah
 * ============================================================
 *
 * Publish > Deploy as Web App
 * Execute as: Me
 * Who has access: Anyone
 */

// ============================================================
// CONFIGURATION
// ============================================================

const SHEET_ID = '1eInxOSekHiXioWPf8BGDLxCO_2f2nSz-qQNa46Npz3g';

const CONF_PREFIX = 'WBP26'; // ID Prefix (e.g. WBP26-0001)

// Email configuration
const EMAIL_FROM_NAME = '45th WB PEDICON 2026 — IAP Howrah';

// CC address — add multiple emails separated by commas
const EMAIL_CC = 'mukherjeerohit301@gmail.com';

// Email address that will receive backend failure alerts
const FAILURE_EMAIL = 'mukherjeerohit301@gmail.com';

// Google Drive Folder ID to store generated QR codes
const UPLOAD_FOLDER_ID = '1emZUzrwtUOLm016PsnWF-0VFdnlheWFG'; // Using EZECON one as default placeholder, user can modify

// ------------------------------------------------------------
// DELEGATE PORTAL (login + dashboard uploads)
// ------------------------------------------------------------

// Name of the sheet tab that logs every file a delegate uploads
const UPLOADS_SHEET_NAME = 'Uploads';

// false = uploaded files stay private (only the Drive owner and people the
//         folder is shared with can open them). Recommended, because ID
//         documents are sensitive.
// true  = anyone with the file link can view it.
const SHARE_UPLOADS_BY_LINK = false;

// Upload rules (keep in sync with dashboard.html)
const MAX_IMAGE_BYTES    = 5 * 1024 * 1024;
const MAX_ABSTRACT_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS    = ['jpg', 'jpeg', 'png', 'webp'];
const ABSTRACT_EXTENSIONS = ['doc', 'docx', 'ppt', 'pptx'];

// Registrations sheet: new columns added for the portal (1-based)
// A-S already exist. T-X are created automatically the first time they are needed.
const COL_MOBILE          = 4;   // D
const COL_IDENTITY_URL    = 20;  // T  ID / photo file (first upload)
const COL_DECLARATION     = 21;  // U  Yes when the delegate ticked the declaration
const COL_DECLARATION_AT  = 22;  // V
const COL_ABSTRACT_URL    = 23;  // W  latest abstract
const COL_ABSTRACT_AT     = 24;  // X
const PORTAL_HEADERS = [
  'ID / Photo URL',
  'Declaration Accepted',
  'Declaration Time',
  'Abstract URL',
  'Abstract Uploaded At'
];


// ============================================================
// HANDLE INCOMING REQUESTS
// ============================================================

function doPost(e) {
  try {

    // Make sure request data exists
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No data received');
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'register') {
      return handleRegistration(data);
    }

    else if (action === 'contact') {
      return handleContact(data);
    }

    else if (action === 'lookup') {
      return handleLookup(data);
    }

    else if (action === 'login') {
      return handleLogin(data);
    }

    else if (action === 'profile') {
      return handleProfile(data);
    }

    else if (action === 'upload') {
      return handleUpload(data);
    }

    return createJsonResponse({
      success: false,
      message: 'Invalid action'
    });

  } catch (err) {

    // Log error
    console.error('Global Error:', err);

    // Send failure notification
    sendFailureEmail(
      err,
      e && e.postData
        ? e.postData.contents
        : 'No request data received'
    );

    return createJsonResponse({
      success: false,
      message: 'Server Error: ' + err.toString()
    });
  }
}


// ============================================================
// REGISTRATION HANDLER
// ============================================================

function handleRegistration(data) {

  const ss = SpreadsheetApp.openById(SHEET_ID);

  // ----------------------------------------------------------
  // Ensure "Registrations" sheet exists
  // ----------------------------------------------------------

  let sheet = ss.getSheetByName('Registrations');

  if (!sheet) {

    sheet = ss.insertSheet('Registrations');

    sheet.appendRow([
      'Registration ID',
      'Timestamp',
      'Name',
      'Mobile',
      'Alternate Number',
      'Email',
      'Category',
      'Institution',
      'Designation',
      'Registration Fee',
      'Registration Period',
      'Payment Status',
      'Payment ID',
      'Is Free',
      'QR Code URL',
      'Notes',
      'Uploaded Docs',
      'Action',
      'Status',
      'ID / Photo URL',
      'Declaration Accepted',
      'Declaration Time',
      'Abstract URL',
      'Abstract Uploaded At'
    ]);

    sheet.getRange('A1:X1').setFontWeight('bold');
  }


  try {

    // --------------------------------------------------------
    // 1. Check for duplicates
    // Same email OR mobile
    // --------------------------------------------------------

    const dataRange = sheet.getDataRange().getValues();

    for (let i = 1; i < dataRange.length; i++) {

      const row = dataRange[i];

      const existingId = row[0];
      const existingMobile = row[3];
      const existingEmail = row[5];

      if (
        existingEmail &&
        data.email &&
        existingEmail.toString().toLowerCase() ===
        data.email.toString().toLowerCase()
      ) {

        return createJsonResponse({
          success: false,
          duplicate: true,
          regId: existingId,
          message:
            'Registration already exists for this email or mobile number.'
        });
      }

      if (
        existingMobile &&
        data.mobile &&
        existingMobile.toString() === data.mobile.toString()
      ) {

        return createJsonResponse({
          success: false,
          duplicate: true,
          regId: existingId,
          message:
            'Registration already exists for this email or mobile number.'
        });
      }
    }


    // --------------------------------------------------------
    // 2. Generate Registration ID
    // --------------------------------------------------------

    const lastRow = sheet.getLastRow();

    let nextNumber = 1;

    if (lastRow > 1) {

      const lastId = sheet
        .getRange(lastRow, 1)
        .getValue()
        .toString();

      const idParts = lastId.split('-');

      const previousNumber = parseInt(idParts[1], 10);

      if (!isNaN(previousNumber)) {
        nextNumber = previousNumber + 1;
      }
    }

    const regId =
      CONF_PREFIX +
      '-' +
      nextNumber.toString().padStart(4, '0');


    // --------------------------------------------------------
    // 3. Registration details
    // --------------------------------------------------------

    const timestamp = new Date();

    const paymentStatus =
      data.isFree
        ? 'Confirmed (Free)'
        : 'Confirmed (Paid)';


    // --------------------------------------------------------
    // 3.5 Generate QR Code and Save to Google Drive
    // --------------------------------------------------------
    var qrText = '45th WB PEDICON 2026\nReg ID: ' + regId + '\nName: ' + (data.name || '') +
      '\nCategory: ' + (data.category || '') + '\nAmount: Rs.' + (data.amount || 0);
    var qrApiUrl = 'https://quickchart.io/qr?text=' + encodeURIComponent(qrText) + '&margin=2&size=300';
    var savedQrUrl = qrApiUrl;
    var qrBlob = null;
    var qrFileId = null;

    try {
      if (UPLOAD_FOLDER_ID && UPLOAD_FOLDER_ID !== '1emZUzrwtUOLm016PsnWF-0VFdnlheWFG') {
        var response = UrlFetchApp.fetch(qrApiUrl);
        qrBlob = response.getBlob().getAs(MimeType.PNG).setName('QR_' + regId + '.png');
        var parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
        var qrFolders = parentFolder.getFoldersByName('QR');
        var qrFolder = qrFolders.hasNext() ? qrFolders.next() : parentFolder.createFolder('QR');
        var qrFile = qrFolder.createFile(qrBlob);
        qrFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        savedQrUrl = qrFile.getUrl();
        qrFileId = qrFile.getId();
      }
    } catch (qrErr) {
      console.error('QR save failed: ' + qrErr.toString());
    }

    // --------------------------------------------------------
    // 3.6 Process Document Upload
    // --------------------------------------------------------
    var savedDocUrl = '';
    if (data.docData) {
      try {
        var decodedDoc = Utilities.base64Decode(data.docData);
        var docBlob = Utilities.newBlob(decodedDoc, data.docMimeType, data.docName);
        if (UPLOAD_FOLDER_ID && UPLOAD_FOLDER_ID !== '1Jf4Vz_4FBRY6AlZ6gLdlO6nbP6WXY3cg') {
          var parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
          var docFolders = parentFolder.getFoldersByName('Documents');
          var docFolder = docFolders.hasNext() ? docFolders.next() : parentFolder.createFolder('Documents');
          var docFile = docFolder.createFile(docBlob);
          docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          savedDocUrl = docFile.getUrl();
        }
      } catch (docErr) {
        console.error('Document save failed: ' + docErr.toString());
        savedDocUrl = 'Upload Failed: ' + docErr.toString();
      }
    }

    // --------------------------------------------------------
    // 4. Append registration to Sheet
    // --------------------------------------------------------
    sheet.appendRow([
      regId,
      timestamp,
      data.name || '',
      data.mobile || '',
      data.altMobile || '',
      data.email || '',
      data.category || '',
      data.institution || '',
      data.designation || '',
      data.amount || 0,
      data.period || '',
      paymentStatus,
      data.paymentId || '',
      data.isFree ? 'Yes' : 'No',
      savedQrUrl,
      '', // Notes
      savedDocUrl,
      '', // Action
      qrFileId // Temporarily store QR ID in Status column for easy retrieval on delete
    ]);


    // --------------------------------------------------------
    // 5. Send Acknowledgment Email
    // --------------------------------------------------------
    try {
      if (data.category !== 'Faculty') {
        sendAcknowledgmentEmail(regId, data);
      }
    } catch (emailErr) {
      console.error('Acknowledgment email failed:', emailErr);

      // Notify admin about email failure
      sendFailureEmail(
        emailErr,
        JSON.stringify({
          type: 'CONFIRMATION_EMAIL_FAILURE',
          registrationId: regId,
          registrationData: data
        })
      );
    }


    // --------------------------------------------------------
    // 6. Return success
    // --------------------------------------------------------

    return createJsonResponse({

      success: true,

      regId: regId

    });


  } catch (err) {

    // --------------------------------------------------------
    // Registration-level failure
    // --------------------------------------------------------

    console.error(
      'Registration Error:',
      err
    );


    // Send failure alert
    sendFailureEmail(
      err,
      JSON.stringify(data)
    );


    return createJsonResponse({

      success: false,

      message:
        'Registration failed: ' +
        err.toString()

    });
  }
}


// ============================================================
// LOOKUP HANDLER
// ============================================================

function handleLookup(data) {

  const ss = SpreadsheetApp.openById(SHEET_ID);

  const sheet =
    ss.getSheetByName('Registrations');

  if (!sheet) {

    return createJsonResponse({
      success: false,
      notFound: true
    });
  }


  const rows =
    sheet.getDataRange().getValues();


  const searchId =
    data.regId
      .trim()
      .toUpperCase();

  const contact =
    data.contact
      .trim()
      .toLowerCase();


  for (let i = 1; i < rows.length; i++) {

    const row = rows[i];

    const rowId =
      row[0]
        .toString()
        .toUpperCase();

    const rowMobile =
      row[3]
        .toString();

    const rowEmail =
      row[5]
        .toString()
        .toLowerCase();


    if (
      rowId === searchId &&
      (
        rowMobile === contact ||
        rowEmail === contact
      )
    ) {

      return createJsonResponse({

        success: true,

        registration: {

          regId: row[0],

          name: row[2],

          mobile: row[3],

          email: row[5],

          category: row[6],

          institution: row[7],

          designation: row[8],

          amount: row[9],

          paymentStatus: row[11],

          isFree: row[13] === 'Yes'

        }

      });
    }
  }


  return createJsonResponse({

    success: false,

    notFound: true

  });
}


// ============================================================
// DELEGATE PORTAL - LOGIN, PROFILE, UPLOADS
// ============================================================

const AUTH_FAILED_MESSAGE =
  'Registration ID and phone number do not match our records. ' +
  'If you do not know your Registration ID, please call 9830367423.';

// Keeps the last 10 digits, so "+91 98303 67423" and "9830367423" match.
function normalizePhone(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/\D/g, '')
    .slice(-10);
}

// Returns the Registrations sheet with the portal headers (T:X) guaranteed.
function getRegistrationsSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Registrations');
  if (!sheet) return null;

  // Make sure the grid is wide enough for columns T:X
  if (sheet.getMaxColumns() < COL_ABSTRACT_AT) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), COL_ABSTRACT_AT - sheet.getMaxColumns());
  }

  const headerCell = sheet.getRange(1, COL_IDENTITY_URL, 1, PORTAL_HEADERS.length);
  const existing = headerCell.getValues()[0];
  if (existing.join('') === '') {
    headerCell.setValues([PORTAL_HEADERS]).setFontWeight('bold');
  }
  return sheet;
}

// Finds the registrant by Registration ID + phone. Returns null when not found.
// Rows whose ID was cleared by a "reject" action can never match.
function authenticate(regId, phone) {
  const id = String(regId || '').trim().toUpperCase();
  const mobile = normalizePhone(phone);
  if (!id || mobile.length !== 10) return null;

  const sheet = getRegistrationsSheet();
  if (!sheet) return null;

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowId = String(rows[i][0] || '').trim().toUpperCase();
    if (rowId && rowId === id && normalizePhone(rows[i][COL_MOBILE - 1]) === mobile) {
      return { sheet: sheet, rowNumber: i + 1 };
    }
  }
  return null;
}

// Reads one row fresh from the sheet and shapes it for the dashboard.
function buildProfile(sheet, rowNumber) {
  const width = Math.max(sheet.getLastColumn(), COL_ABSTRACT_AT);
  const row = sheet.getRange(rowNumber, 1, 1, width).getValues()[0];
  const at = function (col) { return row[col - 1]; };
  const regId = String(row[0]);

  return {
    regId: regId,
    name: String(row[2] || ''),
    mobile: String(row[3] || ''),
    email: String(row[5] || ''),
    category: String(row[6] || ''),
    amount: Number(row[9]) || 0,
    isFree: row[13] === 'Yes',
    paymentStatus: String(row[11] || ''),
    hasIdentity: String(at(COL_IDENTITY_URL) || '') !== '',
    declarationAccepted: String(at(COL_DECLARATION) || '') === 'Yes',
    abstractSubmitted: String(at(COL_ABSTRACT_URL) || '') !== '',
    uploads: readUploads(regId)
  };
}

// File names and dates only. File links are deliberately not sent to the browser.
function readUploads(regId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const log = ss.getSheetByName(UPLOADS_SHEET_NAME);
  if (!log || log.getLastRow() < 2) return [];

  const rows = log.getRange(2, 1, log.getLastRow() - 1, 5).getValues();
  const out = [];
  rows.forEach(function (r) {
    if (String(r[1]).toUpperCase() === String(regId).toUpperCase()) {
      out.push({
        uploadedAt: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
        type: String(r[3]),
        fileName: String(r[4])
      });
    }
  });
  return out;
}

function appendUploadLog(regId, name, type, fileName, fileUrl, fileId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let log = ss.getSheetByName(UPLOADS_SHEET_NAME);
  if (!log) {
    log = ss.insertSheet(UPLOADS_SHEET_NAME);
    log.appendRow(['Timestamp', 'Registration ID', 'Name', 'Type', 'File Name', 'File URL', 'File ID']);
    log.getRange('A1:G1').setFontWeight('bold');
  }
  log.appendRow([new Date(), regId, name, type, fileName, fileUrl, fileId]);
}

function getUploadSubfolder(name) {
  const parent = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
  const found = parent.getFoldersByName(name);
  return found.hasNext() ? found.next() : parent.createFolder(name);
}

function safeFileName(name) {
  return String(name || 'file').replace(/[^\w.\-]+/g, '_').substring(0, 80);
}

function getExtension(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

// ---------------- Login ----------------
function handleLogin(data) {
  const auth = authenticate(data.regId, data.phone);
  if (!auth) {
    return createJsonResponse({ success: false, code: 'AUTH_FAILED', message: AUTH_FAILED_MESSAGE });
  }
  const row = auth.sheet.getRange(auth.rowNumber, 1, 1, 6).getValues()[0];
  return createJsonResponse({
    success: true,
    regId: String(row[0]),
    name: String(row[2] || '')
  });
}

// ---------------- Profile (dashboard data straight from the sheet) ----------------
function handleProfile(data) {
  const auth = authenticate(data.regId, data.phone);
  if (!auth) {
    return createJsonResponse({ success: false, code: 'AUTH_FAILED', message: AUTH_FAILED_MESSAGE });
  }
  return createJsonResponse({ success: true, profile: buildProfile(auth.sheet, auth.rowNumber) });
}

// ---------------- Upload ----------------
// uploadType 'image'    : the first image is stored as the ID / photo, later ones as extra images
// uploadType 'abstract' : allowed only after the ID / photo exists AND the declaration is ticked
function handleUpload(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return processUpload(data);
  } finally {
    lock.releaseLock();
  }
}

function processUpload(data) {
  const auth = authenticate(data.regId, data.phone);
  if (!auth) {
    return createJsonResponse({ success: false, code: 'AUTH_FAILED', message: AUTH_FAILED_MESSAGE });
  }

  const sheet = auth.sheet;
  const rowNumber = auth.rowNumber;
  const current = buildProfile(sheet, rowNumber);

  const fileName = String(data.filename || '');
  const extension = getExtension(fileName);
  const base64 = String(data.base64Data || '');
  if (!base64) {
    return createJsonResponse({ success: false, message: 'No file was received. Please try again.' });
  }
  const approxBytes = Math.floor(base64.length * 3 / 4);

  let type;
  if (data.uploadType === 'abstract') {
    type = 'abstract';

    if (!current.hasIdentity) {
      return createJsonResponse({
        success: false,
        message: 'Please upload your ID or photo before submitting an abstract.'
      });
    }
    if (data.declaration !== true) {
      return createJsonResponse({
        success: false,
        message: 'Please accept the declaration before submitting your abstract.'
      });
    }
    if (ABSTRACT_EXTENSIONS.indexOf(extension) === -1) {
      return createJsonResponse({ success: false, message: 'Abstract must be a PPT, PPTX, DOC or DOCX file.' });
    }
    if (approxBytes > MAX_ABSTRACT_BYTES) {
      return createJsonResponse({ success: false, message: 'Abstract file is larger than 10 MB.' });
    }

  } else if (data.uploadType === 'image') {
    // The first image a delegate ever uploads is their identity proof.
    type = current.hasIdentity ? 'image' : 'identity';

    if (IMAGE_EXTENSIONS.indexOf(extension) === -1) {
      return createJsonResponse({ success: false, message: 'Image must be a JPG, PNG or WebP file.' });
    }
    if (approxBytes > MAX_IMAGE_BYTES) {
      return createJsonResponse({ success: false, message: 'Image is larger than 5 MB.' });
    }

  } else {
    return createJsonResponse({ success: false, message: 'Unknown upload type.' });
  }

  // ---- Save to Google Drive ----
  const folderName = type === 'abstract' ? 'Abstracts' : (type === 'identity' ? 'Identity' : 'Images');
  const stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd-HHmmss');
  const storedName = current.regId + '_' + type + '_' + stamp + '_' + safeFileName(fileName);

  let file;
  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', storedName);
    file = getUploadSubfolder(folderName).createFile(blob);
    if (SHARE_UPLOADS_BY_LINK) {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  } catch (err) {
    console.error('Upload save failed:', err);
    sendFailureEmail(err, JSON.stringify({ type: 'UPLOAD_FAILURE', regId: current.regId, fileName: fileName }));
    return createJsonResponse({ success: false, message: 'The file could not be saved. Please try again in a moment.' });
  }

  // ---- Record in the sheet ----
  const now = new Date();
  const url = file.getUrl();

  if (type === 'identity') {
    sheet.getRange(rowNumber, COL_IDENTITY_URL).setValue(url);
  } else if (type === 'abstract') {
    sheet.getRange(rowNumber, COL_DECLARATION).setValue('Yes');
    sheet.getRange(rowNumber, COL_DECLARATION_AT).setValue(now);
    sheet.getRange(rowNumber, COL_ABSTRACT_URL).setValue(url);
    sheet.getRange(rowNumber, COL_ABSTRACT_AT).setValue(now);
  }
  appendUploadLog(current.regId, current.name, type, fileName, url, file.getId());

  return createJsonResponse({
    success: true,
    type: type,
    profile: buildProfile(sheet, rowNumber)
  });
}


// ============================================================
// CONTACT FORM HANDLER
// ============================================================

function handleContact(data) {

  try {

    const ss =
      SpreadsheetApp.openById(SHEET_ID);


    // --------------------------------------------------------
    // Ensure Contacts sheet exists
    // --------------------------------------------------------

    let sheet =
      ss.getSheetByName('Contacts');


    if (!sheet) {

      sheet =
        ss.insertSheet('Contacts');

      sheet.appendRow([
        'Timestamp',
        'Name',
        'Email',
        'Mobile',
        'Subject',
        'Message'
      ]);

      sheet
        .getRange('A1:F1')
        .setFontWeight('bold');
    }


    // --------------------------------------------------------
    // Save contact request
    // --------------------------------------------------------

    sheet.appendRow([

      new Date(),

      data.name || '',

      data.email || '',

      data.mobile || '',

      data.subject || '',

      data.message || ''

    ]);


    // --------------------------------------------------------
    // Optional admin notification
    //
    // Uncomment this block if you want contact form
    // submissions emailed to the organizing committee.
    // --------------------------------------------------------

    /*
    MailApp.sendEmail({

      to: FAILURE_EMAIL,

      cc: EMAIL_CC,

      name: EMAIL_FROM_NAME,

      subject:
        'New Contact Inquiry: ' +
        (data.subject || 'General Inquiry'),

      body:
        'Name: ' + data.name +
        '\nEmail: ' + data.email +
        '\nMobile: ' + (data.mobile || 'N/A') +
        '\nSubject: ' + (data.subject || 'N/A') +
        '\n\nMessage:\n' +
        (data.message || '')

    });
    */


    return createJsonResponse({

      success: true

    });


  } catch (err) {

    // --------------------------------------------------------
    // Contact form failure notification
    // --------------------------------------------------------

    console.error(
      'Contact Form Error:',
      err
    );


    sendFailureEmail(
      err,
      JSON.stringify(data)
    );


    return createJsonResponse({

      success: false,

      message:
        'Failed to submit contact form.'

    });
  }
}


// ============================================================
// SEND ACKNOWLEDGMENT EMAIL
// ============================================================

function sendAcknowledgmentEmail(regId, data) {
  const subject = `Registration Received - 45th WB PEDICON 2026`;

  const plainBody = `Dear ${data.name || 'Participant'},

We have received your registration for the 45th WB PEDICON 2026.
We will confirm your registration within 48H over mail.
If you receive no confirmation mail, please contact support.

Your Registration Details:
─────────────────────────────────
Category        : ${data.category || ''}
Amount Paid     : ₹${data.amount || 0}
Payment ID      : ${data.paymentId || 'N/A'}
─────────────────────────────────

Regards,
Organizing Committee
45th WB PEDICON 2026
`;

  var htmlBody = plainBody.replace(/\n/g, '<br>');

  const emailOptions = {
    to: data.email,
    name: EMAIL_FROM_NAME,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody
  };

  MailApp.sendEmail(emailOptions);
}


// ============================================================
// ON EDIT TRIGGER (MANUAL CONFIRMATION / REJECTION)
// ============================================================

function onSpreadsheetEdit(e) {
  if (!e || !e.range) return;

  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Registrations') return;

  const col = e.range.getColumn();
  if (col !== 18) return; // Action column (R)

  const val = (e.value || '').toLowerCase().trim();
  if (val !== 'send' && val !== 'reject') return;

  const row = e.range.getRow();
  if (row <= 1) return;

  // Clear the cell so it's ready for another action if needed, or leave it. We'll leave it.
  
  // Set status to pending
  sheet.getRange(row, 19).setValue('Pending (1 min delay)...');

  // Schedule trigger for 1 minute from now
  const trigger = ScriptApp.newTrigger('processActionTrigger')
    .timeBased()
    .after(60000)
    .create();

  // Save the trigger data
  PropertiesService.getScriptProperties().setProperty(
    trigger.getUniqueId(),
    JSON.stringify({ row: row, action: val })
  );
}

function processActionTrigger(e) {
  const triggerId = e.triggerUid;
  const props = PropertiesService.getScriptProperties();
  const dataStr = props.getProperty(triggerId);

  // Delete the trigger so it doesn't run again or pile up
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(triggers[i]);
      break;
    }
  }

  if (!dataStr) return;
  const tData = JSON.parse(dataStr);
  props.deleteProperty(triggerId);

  const row = tData.row;
  const action = tData.action;

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Registrations');
  if (!sheet) return;

  const rowData = sheet.getRange(row, 1, 1, 19).getValues()[0];
  const regId = rowData[0];
  const name = rowData[2];
  const email = rowData[5];
  const category = rowData[6];
  const amount = rowData[9];
  const paymentId = rowData[12];
  const savedQrUrl = rowData[14];
  const qrFileId = rowData[18]; // Stored temporarily in column S on creation

  if (action === 'send') {
    try {
      sendConfirmationEmail(regId, {
        name: name,
        category: category,
        amount: amount,
        paymentId: paymentId,
        email: email
      }, savedQrUrl, qrFileId);

      sheet.getRange(row, 19).setValue('Success ' + new Date().toISOString());
    } catch (err) {
      sheet.getRange(row, 19).setValue('Failed: ' + err.toString() + ' ' + new Date().toISOString());
    }
  } else if (action === 'reject') {
    try {
      // Delete QR code file from Google Drive
      if (qrFileId) {
        try {
          DriveApp.getFileById(qrFileId).setTrashed(true);
        } catch (driveErr) {
          console.error("Could not delete QR file: " + driveErr);
        }
      }

      // Clear the registration ID and status
      sheet.getRange(row, 1).setValue(''); // Clear Reg ID
      sheet.getRange(row, 15).setValue(''); // Clear QR URL
      sheet.getRange(row, 18).setValue(''); // Clear Action
      sheet.getRange(row, 19).setValue('Rejected & Deleted ' + new Date().toISOString());
    } catch (err) {
      sheet.getRange(row, 19).setValue('Reject Failed: ' + err.toString());
    }
  }
}

// ============================================================
// SEND CONFIRMATION EMAIL (Modified for manual trigger)
// ============================================================

function sendConfirmationEmail(regId, data, savedQrUrl, qrFileId) {
  const subject = `Registration Confirmed - 45th WB PEDICON 2026 [${regId}]`;

  var inlineBlob = null, attachBlob = null, hasQr = false;

  if (qrFileId) {
    try {
      var qrBlob = DriveApp.getFileById(qrFileId).getBlob();
      inlineBlob = qrBlob.copyBlob().setName('qrCode.png');
      attachBlob = qrBlob.copyBlob().setName('WBP26_QR_' + regId + '.png');
      hasQr = true;
    } catch (e) { console.log('QR blob fetch failed: ' + e.toString()); }
  }

  const plainBody = `Dear ${data.name || 'Participant'},

Thank you for registering for the 45th WB PEDICON 2026.

Your Registration Details:
─────────────────────────────────
Registration ID : ${regId}
Category        : ${data.category || ''}
Amount Paid     : ₹${data.amount || 0}
Payment ID      : ${data.paymentId || 'N/A'}
─────────────────────────────────

QR Code: ${savedQrUrl || 'N/A'}

${hasQr ? 'Please present the attached QR code at the venue.\n\n' : ''}Event Details:
Dates : 19–20 December 2026 (Saturday & Sunday)
Venue : The Park Hotel, Kolkata

Regards,
Organizing Committee
45th WB PEDICON 2026
`;

  var htmlBody = plainBody.replace(/\n/g, '<br>');
  if (hasQr) {
    htmlBody += '<br><br><b>Your Event QR Code:</b><br>' +
      '<img src="cid:qrCode" alt="Event QR Code" style="width:200px;height:200px;border:1px solid #ccc;"/>' +
      '<br><small>QR code also attached.</small>';
  }

  const emailOptions = {
    to: data.email,
    name: EMAIL_FROM_NAME,
    subject: subject,
    body: plainBody,
    htmlBody: htmlBody
  };

  if (hasQr) {
    emailOptions.inlineImages = { qrCode: inlineBlob };
    emailOptions.attachments = [attachBlob];
  }

  if (EMAIL_CC && EMAIL_CC.toString().trim().length > 0) {
    emailOptions.cc = EMAIL_CC;
  }

  MailApp.sendEmail(emailOptions);
}


// ============================================================
// SEND FAILURE EMAIL
// ============================================================
function sendFailureEmail(error, rawData) {
  try {
    MailApp.sendEmail({
      to: FAILURE_EMAIL,
      cc: EMAIL_CC,
      name: EMAIL_FROM_NAME,
      subject: '[45th WB PEDICON 2026] Registration Error Alert',
      body: 'Error: ' + error.toString() + '\n\nRaw Data (truncated):\n' + String(rawData).substring(0, 3000)
    });
  } catch (e) { console.log('Failure email also failed: ' + e.toString()); }
}


// ============================================================
// UTILITY — JSON RESPONSE
// ============================================================

function createJsonResponse(data) {

  return ContentService

    .createTextOutput(
      JSON.stringify(data)
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );
}


// ============================================================
// GET REQUEST / DEPLOYMENT CHECK
// ============================================================

function doGet() {

  return ContentService

    .createTextOutput(
      '45th WB PEDICON API is active.'
    );
}