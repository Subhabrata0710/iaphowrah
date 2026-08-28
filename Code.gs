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
const UPLOAD_FOLDER_ID = '1mG7hBhJD0O1mdJtJy5fXyP9jyw4SC1-L'; // Using EZECON one as default placeholder, user can modify


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
      'Notes'
    ]);

    sheet.getRange('A1:P1').setFontWeight('bold');
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
      }
    } catch (qrErr) {
      console.error('QR save failed: ' + qrErr.toString());
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

      '' // Notes

    ]);


    // --------------------------------------------------------
    // 5. Send Confirmation Email
    //
    // IMPORTANT:
    // If email fails, registration remains successful.
    // The email error is logged and a failure alert is sent.
    // --------------------------------------------------------

    try {

      sendConfirmationEmail(regId, data, savedQrUrl, qrBlob);

    } catch (emailErr) {

      console.error(
        'Confirmation email failed:',
        emailErr
      );

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
// SEND CONFIRMATION EMAIL
// ============================================================

function sendConfirmationEmail(regId, data, savedQrUrl, qrBlob) {

  const subject =
    `Registration Confirmed - 45th WB PEDICON 2026 [${regId}]`;

  var inlineBlob = null, attachBlob = null, hasQr = false;

  if (qrBlob) {
    try {
      inlineBlob = qrBlob.copyBlob().setName('qrCode.png');
      attachBlob = qrBlob.copyBlob().setName('WBP26_QR_' + regId + '.png');
      hasQr = true;
    } catch (e) { console.log('QR blob copy failed: ' + e.toString()); }
  }

  const plainBody =

`Dear ${data.name || 'Participant'},

Thank you for registering for the 45th WB PEDICON 2026.

Your Registration Details:
─────────────────────────────────
Registration ID : ${regId}
Category        : ${data.category || ''}
Amount Paid     : ₹${data.amount || 0}
Payment ID      : ${data.paymentId || 'N/A'}
─────────────────────────────────

QR Code: ${savedQrUrl}

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

  // ----------------------------------------------------------
  // Build email options
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Add CC automatically
  // ----------------------------------------------------------

  if (
    EMAIL_CC &&
    EMAIL_CC.toString().trim().length > 0
  ) {

    emailOptions.cc = EMAIL_CC;
  }


  // ----------------------------------------------------------
  // Send email
  // ----------------------------------------------------------

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
