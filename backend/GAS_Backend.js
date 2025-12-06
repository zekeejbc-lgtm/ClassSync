/**
 * ClassSync - Google Apps Script Backend
 * 
 * This file contains the complete GAS backend code for ClassSync.
 * Deploy this as a Web App in Google Apps Script.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Copy this entire file content to Code.gs
 * 4. Run setupInitialSheets() once to create all required sheets
 * 5. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 6. Copy the Web App URL to your frontend configuration
 */

// ==================== CONFIGURATION ====================

const SCRIPT_PROPS = PropertiesService.getScriptProperties();
const CONFIG = {
  SPREADSHEET_ID: SCRIPT_PROPS.getProperty('CLASSSYNC_SHEET_ID') || '1WCga8IAyFhuwPDYvoUIWHH1p6O4GQQkt6Wv6BjW-IgU',
  DRIVE_FOLDERS: {
    CLASSSYNC: SCRIPT_PROPS.getProperty('CLASSSYNC_FOLDER_ID') || '1Rg7-dFZB7On1UTE9yr1jMYyiqlE53MpT',
    PROFILE_PICTURES: SCRIPT_PROPS.getProperty('CLASSSYNC_PROFILE_FOLDER_ID') || '12FPfu_L8-tSnmfe22ou6kwkUEhh0NwuB',
    SCHOOL_LOGOS: SCRIPT_PROPS.getProperty('CLASSSYNC_SCHOOL_LOGO_FOLDER_ID') || '1ZdELRwtat2hLk7gBIgNDZDfQrqHpygF0',
    CLASS_LOGOS: SCRIPT_PROPS.getProperty('CLASSSYNC_CLASS_LOGO_FOLDER_ID') || '1GXqc-00NNj1kyEqgPhiMZ6CHljsrrHrT'
  },
  EMAIL_SENDER_NAME: SCRIPT_PROPS.getProperty('CLASSSYNC_EMAIL_SENDER') || 'ClassSync Portal',
  OTP_EXPIRY_MINUTES: Number(SCRIPT_PROPS.getProperty('CLASSSYNC_OTP_EXPIRY_MINUTES') || 10),
  SECTION_CODE: SCRIPT_PROPS.getProperty('CLASSSYNC_SECTION_CODE') || '1SF', // Default section code
  API_KEY: SCRIPT_PROPS.getProperty('CLASSSYNC_API_KEY') || ''
};

// Lightweight request guards
function verifyApiKey(apiKey) {
  if (!CONFIG.API_KEY) return { ok: true };
  if (apiKey === CONFIG.API_KEY) return { ok: true };
  return { ok: false, success: false, error: 'Unauthorized', errorCode: 'ERR_AUTH_001' };
}

function enforceRateLimit(key) {
  if (!CONFIG.API_KEY) return; // Skip when no auth configured
  const cache = CacheService.getScriptCache();
  const cacheKey = 'rl_' + (key || 'anon');
  const current = Number(cache.get(cacheKey) || 0);
  if (current >= 120) {
    throw new Error('ERR_RATE_LIMIT');
  }
  cache.put(cacheKey, String(current + 1), 60);
}

function maskPayloadForLog(payload) {
  if (!payload) return payload;
  try {
    const clone = JSON.parse(JSON.stringify(payload));
    ['password', 'otp', 'code'].forEach(k => {
      if (clone[k]) clone[k] = '[REDACTED]';
    });
    return clone;
  } catch (_) {
    return payload;
  }
}

// ==================== WEB APP HANDLERS ====================

function doGet(e) {
  const apiKey = (e.parameter && (e.parameter.apiKey || e.parameter.apikey || e.parameter.key)) || '';
  const auth = verifyApiKey(apiKey);
  if (!auth.ok) return createJsonResponse(auth);

  try {
    enforceRateLimit(apiKey);
  } catch (err) {
    return createJsonResponse({ success: false, error: 'Rate limit exceeded', errorCode: 'ERR_RATE_LIMIT' });
  }

  const action = e.parameter.action;
  const result = handleRequest(action, e.parameter);
  return createJsonResponse(result);
}

function doPost(e) {
  try {
    const body = e.postData ? JSON.parse(e.postData.contents) : {};
    const action = body.action || e.parameter.action;
    const payload = body.payload || body;
    const apiKey = (payload.apiKey || e.parameter.apiKey || e.parameter.apikey || payload.key) || '';

    const auth = verifyApiKey(apiKey);
    if (!auth.ok) return createJsonResponse(auth);

    try {
      enforceRateLimit(apiKey);
    } catch (err) {
      return createJsonResponse({ success: false, error: 'Rate limit exceeded', errorCode: 'ERR_RATE_LIMIT' });
    }
    
    const result = handleRequest(action, payload);
    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ 
      success: false, 
      error: error.toString(),
      errorCode: 'ERR_PARSE_001'
    });
  }
}

function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== REQUEST ROUTER ====================

function handleRequest(action, payload) {
  // Log every request for debugging
  Logger.log('=== REQUEST RECEIVED ===');
  Logger.log('Action: ' + action);
  Logger.log('Payload: ' + JSON.stringify(maskPayloadForLog(payload)));
  
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { success: false, error: 'Server busy, please try again', errorCode: 'ERR_LOCK_001' };
  }
  
  try {
    let result = { success: false, error: 'Unknown action', errorCode: 'ERR_ACTION_001' };
    
    switch (action) {
      // Debug/Test
      case 'ping': result = { success: true, message: 'pong', timestamp: new Date().toISOString(), version: '2.0' }; break;
      
      // Setup
      case 'setupInitialSheets': result = setupInitialSheets(); break;
      
      // Registration Flow
      case 'validateStudentId': result = validateStudentId(payload); break;
      case 'sendOTP': result = sendOTP(payload); break;
      case 'verifyOTP': result = verifyOTP(payload); break;
      case 'completeRegistration': result = completeRegistration(payload); break;
      
      // User Management
      case 'getUsers': result = getUsers(); break;
      case 'getUser': result = getUser(payload); break;
      case 'updateUser': result = updateUser(payload); break;
      case 'login': result = loginUser(payload); break;
      
      // File Upload
      case 'uploadProfilePicture': result = uploadProfilePicture(payload); break;
      case 'uploadToFolder': result = uploadToFolder(payload); break;
      case 'uploadSchoolLogo': result = uploadSchoolLogo(payload); break;
      case 'uploadClassLogo': result = uploadClassLogo(payload); break;
      
      // Data Operations
      case 'getTodos': result = getData('Todos'); break;
      case 'saveTodo': result = saveData('Todos', payload); break;
      case 'deleteTodo': result = deleteData('Todos', payload.id); break;
      
      case 'getTransactions': result = getData('Transactions'); break;
      case 'addTransaction': result = appendData('Transactions', payload); break;
      
      case 'getCampaigns': result = getData('Campaigns'); break;
      case 'saveCampaign': result = saveData('Campaigns', payload); break;
      
      case 'getAttendance': result = getData('Attendance'); break;
      case 'saveAttendance': result = saveAttendanceRecords(payload); break;
      
      case 'getAnnouncements': result = getData('Announcements'); break;
      case 'addAnnouncement': result = appendData('Announcements', payload); break;
      
      case 'getLogs': result = getLogs(); break;
      case 'logAccess': result = appendData('Logs', payload); break;
      
      default:
        result = { success: false, error: `Unknown action: ${action}`, errorCode: 'ERR_ACTION_002' };
    }
    
    SpreadsheetApp.flush();
    return result;
    
  } catch (error) {
    Logger.log('Error in handleRequest: ' + error.toString());
    return { 
      success: false, 
      error: error.toString(), 
      errorCode: 'ERR_INTERNAL_001',
      stack: error.stack 
    };
  } finally {
    lock.releaseLock();
  }
}

// ==================== SETUP FUNCTIONS ====================

/**
 * Creates all required sheets with proper headers
 * Run this once when setting up the system
 */
function setupInitialSheets() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    const sheets = {
      'Users': [
        'id', 'idCode', 'studentId', 'username', 'email', 'personalEmail', 'universityEmail',
        'password', 'role', 'fullName', 'contactNumber', 'status', 'avatar', 'avatarFileId',
        'bio', 'province', 'city', 'barangay', 'purokHouseNumber', 'school', 'college',
        'program', 'major', 'yearLevel', 'section', 'emergencyPerson', 'emergencyContact',
        'socialLinks', 'createdAt', 'updatedAt', 'lastLogin'
      ],
      'OTP_Codes': [
        'id', 'email', 'code', 'type', 'expiresAt', 'used', 'createdAt'
      ],
      'Pending_Registrations': [
        'id', 'studentId', 'email', 'verified', 'step', 'data', 'createdAt', 'expiresAt'
      ],
      'Todos': [
        'id', 'title', 'description', 'isCompleted', 'type', 'createdBy', 'assignee',
        'createdAt', 'deadline', 'priority', 'dependencies', 'category', 'subject'
      ],
      'Transactions': [
        'id', 'type', 'amount', 'category', 'description', 'date', 'recordedBy',
        'verified', 'campaignId', 'studentId', 'proofUrl'
      ],
      'Campaigns': [
        'id', 'title', 'description', 'targetAmount', 'amountPerStudent', 'letterUrl',
        'status', 'createdBy', 'dateCreated'
      ],
      'Attendance': [
        'id', 'date', 'timeIn', 'studentId', 'status', 'recordedBy', 'proofUrl', 'remarks'
      ],
      'Announcements': [
        'id', 'title', 'subtitle', 'content', 'authorId', 'date', 'isEmailSent',
        'category', 'attachmentUrl'
      ],
      'Logs': [
        'id', 'timestamp', 'userId', 'action', 'details', 'ipAddress', 'userAgent'
      ],
      'Schedule': [
        'id', 'subject', 'day', 'startTime', 'endTime', 'isMakeup', 'room'
      ],
      'Excuses': [
        'id', 'studentId', 'reason', 'validationContact', 'startDate', 'endDate',
        'startTime', 'endTime', 'type', 'proofUrl', 'status', 'dateFiled'
      ],
      'Complaints': [
        'id', 'studentId', 'date', 'originalStatus', 'requestedStatus', 'reason',
        'proofUrl', 'status', 'dateFiled'
      ],
      'Feedback': [
        'id', 'name', 'email', 'subject', 'message', 'date', 'isRead'
      ],
      'Journal': [
        'id', 'userId', 'date', 'title', 'content', 'lessons', 'mood', 'tags',
        'createdAt', 'updatedAt'
      ],
      'Settings': [
        'key', 'value', 'updatedAt'
      ],
      'Album': [
        'id', 'url', 'caption', 'date', 'uploadedBy'
      ],
      'Achievements': [
        'id', 'title', 'description', 'date', 'icon'
      ]
    };
    
    const createdSheets = [];
    
    for (const [sheetName, headers] of Object.entries(sheets)) {
      let sheet = ss.getSheetByName(sheetName);
      
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        createdSheets.push(sheetName);
      }
      
      // Set headers in first row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#4a3728');
      headerRange.setFontColor('#ffffff');
      
      // Freeze header row
      sheet.setFrozenRows(1);
    }
    
    // Add default settings
    const settingsSheet = ss.getSheetByName('Settings');
    const existingSettings = settingsSheet.getDataRange().getValues();
    
    if (existingSettings.length <= 1) {
      const defaultSettings = [
        ['logoUrl', 'https://via.placeholder.com/150', new Date().toISOString()],
        ['className', 'Mandirigmang Filipino 1SF', new Date().toISOString()],
        ['academicYear', '2024-2025', new Date().toISOString()],
        ['sectionCode', CONFIG.SECTION_CODE, new Date().toISOString()]
      ];
      
      settingsSheet.getRange(2, 1, defaultSettings.length, 3).setValues(defaultSettings);
    }
    
    return { 
      success: true, 
      message: 'Sheets setup completed',
      createdSheets: createdSheets,
      totalSheets: Object.keys(sheets).length
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.toString(),
      errorCode: 'ERR_SETUP_001'
    };
  }
}

// ==================== REGISTRATION FLOW ====================

/**
 * Validates if a student ID is valid and not already registered
 */
function validateStudentId(payload) {
  const { studentId } = payload;
  
  // Validate format: YYYY-NNNNN (e.g., 2025-00046)
  const idPattern = /^\d{4}-\d{5}$/;
  if (!idPattern.test(studentId)) {
    return { 
      success: false, 
      error: 'Invalid Student ID format. Use YYYY-NNNNN (e.g., 2025-00046)',
      errorCode: 'ERR_REG_001'
    };
  }
  
  // Check if already registered
  const users = readSheet('Users');
  const existingUser = users.find(u => u.studentId === studentId);
  
  if (existingUser) {
    return { 
      success: false, 
      error: 'This Student ID is already registered',
      errorCode: 'ERR_REG_002'
    };
  }
  
  return { success: true, valid: true };
}

/**
 * Sends OTP to the provided email
 */
function sendOTP(payload) {
  const { email, studentId, type = 'registration' } = payload;
  
  // Validate .edu email
  if (!email.endsWith('.edu') && !email.endsWith('.edu.ph')) {
    return { 
      success: false, 
      error: 'Please use a valid university email (.edu or .edu.ph)',
      errorCode: 'ERR_OTP_001'
    };
  }
  
  // Check if email already registered
  const users = readSheet('Users');
  const existingUser = users.find(u => u.universityEmail === email || u.email === email);
  
  if (existingUser && type === 'registration') {
    return { 
      success: false, 
      error: 'This email is already registered',
      errorCode: 'ERR_OTP_002'
    };
  }
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000);
  
  // Save OTP to sheet
  const otpSheet = getSheet('OTP_Codes');
  const otpId = Utilities.getUuid();
  
  otpSheet.appendRow([
    otpId,
    email,
    otp,
    type,
    expiresAt.toISOString(),
    false,
    new Date().toISOString()
  ]);
  
  // Create pending registration
  if (type === 'registration') {
    const pendingSheet = getSheet('Pending_Registrations');
    const pendingId = Utilities.getUuid();
    
    pendingSheet.appendRow([
      pendingId,
      studentId,
      email,
      false,
      1,
      JSON.stringify({}),
      new Date().toISOString(),
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hour expiry
    ]);
  }
  
  // Send email
  try {
    const subject = type === 'registration' 
      ? 'ClassSync - Email Verification Code'
      : 'ClassSync - Password Reset Code';
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #4a3728 0%, #8d6e63 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fbbf24; margin: 0; font-size: 28px;">ClassSync</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 14px;">Student Portal Verification</p>
        </div>
        
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
          <h2 style="color: #333; margin-top: 0;">Your Verification Code</h2>
          <p style="color: #666;">Use the following code to ${type === 'registration' ? 'complete your registration' : 'reset your password'}:</p>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #4a3728;">${otp}</span>
          </div>
          
          <p style="color: #999; font-size: 12px;">This code expires in ${CONFIG.OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="color: #999; font-size: 11px; margin: 0;">© 2025 ClassSync - Mandirigmang Filipino 1SF</p>
        </div>
      </div>
    `;
    
    GmailApp.sendEmail(email, subject, `Your verification code is: ${otp}`, {
      name: CONFIG.EMAIL_SENDER_NAME,
      htmlBody: htmlBody
    });
    
    return { 
      success: true, 
      message: 'OTP sent successfully',
      email: email,
      expiresIn: CONFIG.OTP_EXPIRY_MINUTES
    };
    
  } catch (error) {
    Logger.log('Email error: ' + error.toString());
    return { 
      success: false, 
      error: 'Failed to send email. Please try again.',
      errorCode: 'ERR_OTP_003',
      // For development, return the OTP
      devOtp: otp
    };
  }
}

/**
 * Verifies the OTP code
 */
function verifyOTP(payload) {
  const { email, code } = payload;
  
  const otpCodes = readSheet('OTP_Codes');
  
  // Debug logging
  Logger.log('Verifying OTP - Email: ' + email + ', Code: ' + code);
  Logger.log('Found OTP records: ' + otpCodes.length);
  
  const validOtp = otpCodes.find(o => {
    // Convert both to strings for comparison (spreadsheet may store as number)
    const codeMatch = String(o.code).trim() === String(code).trim();
    const emailMatch = String(o.email).trim().toLowerCase() === String(email).trim().toLowerCase();
    // Handle boolean stored as string in spreadsheet
    const notUsed = o.used !== true && o.used !== 'true' && o.used !== 'TRUE';
    const notExpired = new Date(o.expiresAt) > new Date();
    
    Logger.log('Checking OTP record - Email: ' + o.email + ', Code: ' + o.code + 
               ', Used: ' + o.used + ', ExpiresAt: ' + o.expiresAt +
               ' | Match: email=' + emailMatch + ', code=' + codeMatch + 
               ', notUsed=' + notUsed + ', notExpired=' + notExpired);
    
    return emailMatch && codeMatch && notUsed && notExpired;
  });
  
  if (!validOtp) {
    // Provide more specific error message
    const matchingEmail = otpCodes.filter(o => 
      String(o.email).trim().toLowerCase() === String(email).trim().toLowerCase()
    );
    
    if (matchingEmail.length === 0) {
      return { 
        success: false, 
        error: 'No verification code found for this email. Please request a new code.',
        errorCode: 'ERR_VERIFY_002'
      };
    }
    
    const matchingCode = matchingEmail.find(o => String(o.code).trim() === String(code).trim());
    if (matchingCode) {
      if (matchingCode.used === true || matchingCode.used === 'true' || matchingCode.used === 'TRUE') {
        return { 
          success: false, 
          error: 'This code has already been used. Please request a new code.',
          errorCode: 'ERR_VERIFY_003'
        };
      }
      if (new Date(matchingCode.expiresAt) <= new Date()) {
        return { 
          success: false, 
          error: 'This code has expired. Please request a new code.',
          errorCode: 'ERR_VERIFY_004'
        };
      }
    }
    
    return { 
      success: false, 
      error: 'Invalid verification code. Please check and try again.',
      errorCode: 'ERR_VERIFY_001'
    };
  }
  
  // Mark OTP as used
  const otpSheet = getSheet('OTP_Codes');
  const data = otpSheet.getDataRange().getValues();
  const headers = data[0];
  const usedIndex = headers.indexOf('used');
  const idIndex = headers.indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === validOtp.id) {
      otpSheet.getRange(i + 1, usedIndex + 1).setValue(true);
      break;
    }
  }
  
  // Update pending registration
  const pendingSheet = getSheet('Pending_Registrations');
  const pendingData = pendingSheet.getDataRange().getValues();
  const pendingHeaders = pendingData[0];
  const emailIdx = pendingHeaders.indexOf('email');
  const verifiedIdx = pendingHeaders.indexOf('verified');
  const stepIdx = pendingHeaders.indexOf('step');
  
  for (let i = 1; i < pendingData.length; i++) {
    if (pendingData[i][emailIdx] === email) {
      pendingSheet.getRange(i + 1, verifiedIdx + 1).setValue(true);
      pendingSheet.getRange(i + 1, stepIdx + 1).setValue(3);
      break;
    }
  }
  
  return { 
    success: true, 
    verified: true,
    message: 'Email verified successfully'
  };
}

/**
 * Completes the registration process
 */
function completeRegistration(payload) {
  const {
    studentId,
    universityEmail,
    personalEmail,
    fullName,
    contactNumber,
    avatar,
    avatarFileId,
    socialLinks,
    province,
    city,
    barangay,
    purokHouseNumber,
    school,
    college,
    program,
    major,
    yearLevel,
    section,
    emergencyPerson,
    emergencyContact,
    username,
    password
  } = payload;
  
  // Validate required fields
  const requiredFields = ['studentId', 'universityEmail', 'fullName', 'username', 'password'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return { 
        success: false, 
        error: `Missing required field: ${field}`,
        errorCode: 'ERR_REG_003'
      };
    }
  }
  
  // Check if username already exists
  const users = readSheet('Users');
  if (users.find(u => u.username === username)) {
    return { 
      success: false, 
      error: 'Username already taken',
      errorCode: 'ERR_REG_004'
    };
  }
  
  // Generate unique ID Code: SECTION-STUDENTID (e.g., 1SF-2025-00046)
  const sectionCode = section || CONFIG.SECTION_CODE;
  const idCode = `${sectionCode}-${studentId}`;
  
  // Hash password (simple hash for demo - use bcrypt in production)
  const hashedPassword = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + studentId)
  );
  
  // Create user record
  const userId = Utilities.getUuid();
  const now = new Date().toISOString();
  
  const userSheet = getSheet('Users');
  const headers = getHeaders('Users');
  
  const userData = {
    id: userId,
    idCode: idCode,
    studentId: studentId,
    username: username,
    email: universityEmail,
    personalEmail: personalEmail || '',
    universityEmail: universityEmail,
    password: hashedPassword,
    role: 'Student',
    fullName: fullName,
    contactNumber: contactNumber || '',
    status: 'active',
    avatar: avatar || '',
    avatarFileId: avatarFileId || '',
    bio: '',
    province: province || '',
    city: city || '',
    barangay: barangay || '',
    purokHouseNumber: purokHouseNumber || '',
    school: school || '',
    college: college || '',
    program: program || '',
    major: major || '',
    yearLevel: yearLevel || '',
    section: sectionCode,
    emergencyPerson: emergencyPerson || '',
    emergencyContact: emergencyContact || '',
    socialLinks: JSON.stringify(socialLinks || []),
    createdAt: now,
    updatedAt: now,
    lastLogin: ''
  };
  
  const row = headers.map(h => userData[h] || '');
  userSheet.appendRow(row);
  
  // Clean up pending registration
  const pendingSheet = getSheet('Pending_Registrations');
  const pendingData = pendingSheet.getDataRange().getValues();
  const emailIdx = pendingData[0].indexOf('email');
  
  for (let i = pendingData.length - 1; i >= 1; i--) {
    if (pendingData[i][emailIdx] === universityEmail) {
      pendingSheet.deleteRow(i + 1);
      break;
    }
  }
  
  // Log the registration
  appendData('Logs', {
    id: Utilities.getUuid(),
    timestamp: Date.now(),
    userId: idCode,
    action: 'REGISTRATION',
    details: `New user registered: ${fullName} (${idCode})`,
    ipAddress: '',
    userAgent: ''
  });
  
  return { 
    success: true, 
    message: 'Registration completed successfully',
    user: {
      id: userId,
      idCode: idCode,
      studentId: studentId,
      username: username,
      fullName: fullName,
      email: universityEmail
    }
  };
}

// ==================== USER MANAGEMENT ====================

function loginUser(payload) {
  const { identifier, password } = payload;
  
  const users = readSheet('Users');
  const user = users.find(u => 
    u.username === identifier || 
    u.email === identifier || 
    u.idCode === identifier ||
    u.studentId === identifier
  );
  
  if (!user) {
    return { 
      success: false, 
      error: 'Invalid credentials',
      errorCode: 'ERR_LOGIN_001'
    };
  }
  
  // Verify password
  const hashedPassword = Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + user.studentId)
  );
  
  if (user.password !== hashedPassword) {
    return { 
      success: false, 
      error: 'Invalid credentials',
      errorCode: 'ERR_LOGIN_002'
    };
  }
  
  if (user.status !== 'active') {
    return { 
      success: false, 
      error: 'Account is suspended',
      errorCode: 'ERR_LOGIN_003'
    };
  }
  
  // Update last login
  updateUserField(user.id, 'lastLogin', new Date().toISOString());
  
  // Log access
  appendData('Logs', {
    id: Utilities.getUuid(),
    timestamp: Date.now(),
    userId: user.idCode,
    action: 'LOGIN',
    details: 'User logged in',
    ipAddress: '',
    userAgent: ''
  });
  
  // Return user without password
  const { password: _, ...safeUser } = user;
  
  return { 
    success: true, 
    user: safeUser
  };
}

function getUsers() {
  const users = readSheet('Users');
  // Remove passwords from response
  return { 
    success: true, 
    data: users.map(u => {
      const { password, ...safe } = u;
      return safe;
    })
  };
}

function getUser(payload) {
  const { id, idCode, username } = payload;
  const users = readSheet('Users');
  
  const user = users.find(u => 
    u.id === id || 
    u.idCode === idCode || 
    u.username === username
  );
  
  if (!user) {
    return { success: false, error: 'User not found', errorCode: 'ERR_USER_001' };
  }
  
  const { password, ...safeUser } = user;
  return { success: true, user: safeUser };
}

function updateUser(payload) {
  const { id, ...updates } = payload;
  
  if (!id) {
    return { success: false, error: 'User ID required', errorCode: 'ERR_USER_002' };
  }
  
  const userSheet = getSheet('Users');
  const data = userSheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, error: 'User not found', errorCode: 'ERR_USER_003' };
  }
  
  // Update fields
  updates.updatedAt = new Date().toISOString();
  
  for (const [key, value] of Object.entries(updates)) {
    const colIndex = headers.indexOf(key);
    if (colIndex !== -1 && key !== 'password') { // Don't update password this way
      userSheet.getRange(rowIndex + 1, colIndex + 1).setValue(value);
    }
  }
  
  return { success: true, message: 'User updated successfully' };
}

function updateUserField(userId, field, value) {
  const userSheet = getSheet('Users');
  const data = userSheet.getDataRange().getValues();
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  const fieldIndex = headers.indexOf(field);
  
  if (fieldIndex === -1) return;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === userId) {
      userSheet.getRange(i + 1, fieldIndex + 1).setValue(value);
      break;
    }
  }
}

// ==================== FILE UPLOAD ====================

function uploadProfilePicture(payload) {
  const { data, mimeType, filename } = payload;
  
  try {
    const decodedData = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decodedData, mimeType, filename);
    
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDERS.PROFILE_PICTURES);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    // Use thumbnail URL which is more reliable for embedding and has no CORS issues
    const url = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
    
    return {
      success: true,
      url: url,
      fileId: fileId,
      fileName: file.getName(),
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=s200',
      directUrl: 'https://drive.google.com/uc?export=view&id=' + fileId
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      errorCode: 'ERR_UPLOAD_001'
    };
  }
}

function uploadToFolder(payload) {
  const { data, mimeType, filename, folderId } = payload;
  
  try {
    const decodedData = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decodedData, mimeType, filename);
    
    const targetFolderId = folderId || CONFIG.DRIVE_FOLDERS.CLASSSYNC;
    const folder = DriveApp.getFolderById(targetFolderId);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    
    return {
      success: true,
      url: url,
      fileId: file.getId(),
      fileName: file.getName()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      errorCode: 'ERR_UPLOAD_002'
    };
  }
}

/**
 * Upload a School Logo to the dedicated School Logos folder
 */
function uploadSchoolLogo(payload) {
  const { data, mimeType, filename } = payload;
  
  try {
    const decodedData = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decodedData, mimeType, filename || 'school_logo_' + Date.now());
    
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDERS.SCHOOL_LOGOS);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    
    return {
      success: true,
      url: url,
      fileId: file.getId(),
      fileName: file.getName()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      errorCode: 'ERR_UPLOAD_SCHOOL_LOGO'
    };
  }
}

/**
 * Upload a Class Logo to the dedicated Class Logos folder
 */
function uploadClassLogo(payload) {
  const { data, mimeType, filename } = payload;
  
  try {
    const decodedData = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decodedData, mimeType, filename || 'class_logo_' + Date.now());
    
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDERS.CLASS_LOGOS);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    
    return {
      success: true,
      url: url,
      fileId: file.getId(),
      fileName: file.getName()
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString(),
      errorCode: 'ERR_UPLOAD_CLASS_LOGO'
    };
  }
}

// ==================== GENERIC DATA OPERATIONS ====================

function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  // Auto-create sheet if it doesn't exist
  if (!sheet) {
    Logger.log('Sheet not found, creating: ' + sheetName);
    
    // Define headers for each sheet
    const sheetHeaders = {
      'Users': ['id', 'idCode', 'studentId', 'username', 'email', 'personalEmail', 'universityEmail', 'password', 'role', 'fullName', 'contactNumber', 'status', 'avatar', 'avatarFileId', 'bio', 'province', 'city', 'barangay', 'purokHouseNumber', 'school', 'college', 'program', 'major', 'yearLevel', 'section', 'emergencyPerson', 'emergencyContact', 'socialLinks', 'createdAt', 'updatedAt', 'lastLogin'],
      'OTP_Codes': ['id', 'email', 'code', 'type', 'expiresAt', 'used', 'createdAt'],
      'Pending_Registrations': ['id', 'studentId', 'email', 'verified', 'step', 'data', 'createdAt', 'expiresAt'],
      'Todos': ['id', 'title', 'description', 'isCompleted', 'type', 'createdBy', 'assignee', 'createdAt', 'deadline', 'priority', 'dependencies', 'category', 'subject'],
      'Transactions': ['id', 'type', 'amount', 'category', 'description', 'date', 'recordedBy', 'verified', 'campaignId', 'studentId', 'proofUrl'],
      'Campaigns': ['id', 'title', 'description', 'targetAmount', 'amountPerStudent', 'letterUrl', 'status', 'createdBy', 'dateCreated'],
      'Attendance': ['id', 'date', 'timeIn', 'studentId', 'status', 'recordedBy', 'proofUrl', 'remarks'],
      'Announcements': ['id', 'title', 'subtitle', 'content', 'authorId', 'date', 'isEmailSent', 'category', 'attachmentUrl'],
      'Logs': ['id', 'timestamp', 'userId', 'action', 'details', 'ipAddress', 'userAgent'],
      'Schedule': ['id', 'subject', 'day', 'startTime', 'endTime', 'isMakeup', 'room'],
      'Excuses': ['id', 'studentId', 'reason', 'validationContact', 'startDate', 'endDate', 'startTime', 'endTime', 'type', 'proofUrl', 'status', 'dateFiled'],
      'Complaints': ['id', 'studentId', 'date', 'originalStatus', 'requestedStatus', 'reason', 'proofUrl', 'status', 'dateFiled'],
      'Feedback': ['id', 'name', 'email', 'subject', 'message', 'date', 'isRead'],
      'Journal': ['id', 'userId', 'date', 'title', 'content', 'lessons', 'mood', 'tags', 'createdAt', 'updatedAt'],
      'Settings': ['key', 'value', 'updatedAt'],
      'Album': ['id', 'url', 'caption', 'date', 'uploadedBy'],
      'Achievements': ['id', 'title', 'description', 'date', 'icon']
    };
    
    const headers = sheetHeaders[sheetName] || ['id', 'data', 'createdAt'];
    
    sheet = ss.insertSheet(sheetName);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4a3728');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

function getHeaders(sheetName) {
  const sheet = getSheet(sheetName);
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function readSheet(sheetName) {
  const sheet = getSheet(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  }).filter(obj => obj.id); // Only return rows with ID
}

function getData(sheetName) {
  return { success: true, data: readSheet(sheetName) };
}

function appendData(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  
  if (!data.id) {
    data.id = Utilities.getUuid();
  }
  
  const row = headers.map(h => {
    const value = data[h];
    if (typeof value === 'object') return JSON.stringify(value);
    return value !== undefined ? value : '';
  });
  
  sheet.appendRow(row);
  return { success: true, data: data };
}

function saveData(sheetName, data) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheetName);
  const allData = sheet.getDataRange().getValues();
  const idIndex = headers.indexOf('id');
  
  if (!data.id) {
    // New record
    data.id = Utilities.getUuid();
    return appendData(sheetName, data);
  }
  
  // Find existing record
  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idIndex] === data.id) {
      rowIndex = i;
      break;
    }
  }
  
  if (rowIndex === -1) {
    // Not found, append
    return appendData(sheetName, data);
  }
  
  // Update existing
  const row = headers.map(h => {
    const value = data[h];
    if (typeof value === 'object') return JSON.stringify(value);
    return value !== undefined ? value : allData[rowIndex][headers.indexOf(h)];
  });
  
  sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([row]);
  return { success: true, data: data };
}

function deleteData(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const idIndex = data[0].indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  
  return { success: false, error: 'Record not found', errorCode: 'ERR_DELETE_001' };
}

function saveAttendanceRecords(payload) {
  const records = Array.isArray(payload) ? payload : [payload];
  
  records.forEach(record => {
    if (!record.id) {
      record.id = Utilities.getUuid();
    }
    saveData('Attendance', record);
  });
  
  return { success: true, count: records.length };
}

function getLogs() {
  const allLogs = readSheet('Logs');
  // Return last 100 logs, sorted by timestamp descending
  const sorted = allLogs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  return { success: true, data: sorted };
}

// ==================== ERROR CODES REFERENCE ====================
/**
 * ERROR CODES:
 * 
 * ERR_PARSE_001    - Failed to parse request body
 * ERR_LOCK_001     - Server busy (lock timeout)
 * ERR_ACTION_001   - Unknown action
 * ERR_ACTION_002   - Invalid action
 * ERR_INTERNAL_001 - Internal server error
 * 
 * ERR_SETUP_001    - Sheet setup failed
 * 
 * ERR_REG_001      - Invalid Student ID format
 * ERR_REG_002      - Student ID already registered
 * ERR_REG_003      - Missing required field
 * ERR_REG_004      - Username already taken
 * 
 * ERR_OTP_001      - Invalid email domain
 * ERR_OTP_002      - Email already registered
 * ERR_OTP_003      - Failed to send email
 * 
 * ERR_VERIFY_001   - Invalid or expired OTP
 * 
 * ERR_LOGIN_001    - User not found
 * ERR_LOGIN_002    - Invalid password
 * ERR_LOGIN_003    - Account suspended
 * 
 * ERR_USER_001     - User not found
 * ERR_USER_002     - User ID required
 * ERR_USER_003     - User not found for update
 * 
 * ERR_UPLOAD_001   - Profile picture upload failed
 * ERR_UPLOAD_002   - File upload failed
 * 
 * ERR_DELETE_001   - Record not found for deletion
 */
