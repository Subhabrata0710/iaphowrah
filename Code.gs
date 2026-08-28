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

const SHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

const CONF_PREFIX = 'WBP26'; // ID Prefix (e.g. WBP26-0001)

// Email configuration
const EMAIL_FROM_NAME = '45th WB PEDICON 2026 — IAP Howrah';

// CC address — add multiple emails separated by commas
const EMAIL_CC = 'mukherjeerohit301@gmail.com';

// Email address that will receive backend failure alerts
const FAILURE_EMAIL = 'semiezecon@gmail.com';


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
      'Notes'
    ]);

    sheet.getRange('A1:O1').setFontWeight('bold');
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

      sendConfirmationEmail(regId, data);

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

function sendConfirmationEmail(regId, data) {

  const subject =
    `Registration Confirmed - 45th WB PEDICON 2026 [${regId}]`;


  const body =

`Dear ${data.name || 'Participant'},

Thank you for registering for the 45th WB PEDICON 2026.

Your Registration ID is: ${regId}

You can view your QR code and download your receipt by visiting the dashboard on our website and logging in with your Registration ID and email/mobile number.

Regards,
Organizing Committee
45th WB PEDICON 2026
IAP Howrah
`;


  // ----------------------------------------------------------
  // Build email options
  // ----------------------------------------------------------

  const emailOptions = {

    to: data.email,

    name: EMAIL_FROM_NAME,

    subject: subject,

    body: body

  };


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
