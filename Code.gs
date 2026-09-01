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
const UPLOAD_FOLDER_ID = '1BKUq5rWxkEiz5EEfZ_RkQJKzcatPNRzC'; // Using EZECON one as default placeholder, user can modify


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
      'Status'
    ]);

    sheet.getRange('A1:S1').setFontWeight('bold');
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
      if (UPLOAD_FOLDER_ID && UPLOAD_FOLDER_ID !== 'YOUR_GDRIVE_FOLDER_ID_HERE') {
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
        if (UPLOAD_FOLDER_ID && UPLOAD_FOLDER_ID !== 'YOUR_GDRIVE_FOLDER_ID_HERE') {
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
  const subject = `Registration Received - 45th WB PEDICON 2026 [${regId}]`;

  const plainBody = `Dear ${data.name || 'Participant'},

We have received your registration for the 45th WB PEDICON 2026.
We will confirm your registration within 48H over mail.
If you receive no confirmation mail, please contact support.

Your Registration Details:
─────────────────────────────────
Registration ID : ${regId}
Category        : ${data.category || ''}
Amount Paid     : ₹${data.amount || 0}
Payment ID      : ${data.paymentId || 'N/A'}
─────────────────────────────────

Regards,
Organizing Committee
45th WB PEDICON 2026
IAP Howrah
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
IAP Howrah
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
      body: 'Error: ' + error.toString() + '\n\nRaw Data:\n' + rawData
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
