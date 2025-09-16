const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Secure server-side configuration - loaded from environment variables
const SERVER_CONFIG = {
    MISSION: process.env.MISSION,
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID,
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY,
    GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
};

// Validate required configuration
const requiredEnvVars = [
    'GOOGLE_SHEETS_ID',
    'GOOGLE_PROJECT_ID', 
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL'
];

const missingVars = requiredEnvVars.filter(varName => !SERVER_CONFIG[varName]);
if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('Please check your .env file configuration.');
    process.exit(1);
}

// Configure Google Sheets API with Service Account from environment variables
let sheets = null;
try {
    const serviceAccountCredentials = {
        type: "service_account",
        project_id: SERVER_CONFIG.GOOGLE_PROJECT_ID,
        private_key: SERVER_CONFIG.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: SERVER_CONFIG.GOOGLE_CLIENT_EMAIL,
        client_id: SERVER_CONFIG.GOOGLE_CLIENT_ID
    };

    const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets configured successfully with service account from environment variables');
} catch (error) {
    console.error('❌ Failed to configure Google Sheets:', error.message);
    console.warn('⚠️ Google Sheets not configured - running in offline mode');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Mount svg and model folders for Vercel deployment
app.use('/svg', express.static(path.join(__dirname, '..', 'svg')));
app.use('/model', express.static(path.join(__dirname, '..', 'model')));

// In-memory storage (replace with database in production)
const sessions = new Map();
const userInteractions = new Map();

// Generate secure session ID
function generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// SQL Injection Detection Patterns
const SQL_INJECTION_PATTERNS = [
    // Basic SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    // Common SQL injection techniques
    /(\'|\"|;|--|\/\*|\*\/)/,
    // XSS patterns
    /(<script|<iframe|<object|<embed|javascript:|vbscript:|onload=|onerror=)/i,
    // SQL functions and operators
    /(OR\s+1=1|AND\s+1=1|OR\s+\'1\'=\'1\'|AND\s+\'1\'=\'1\')/i,
    // Union-based injection
    /(UNION\s+(ALL\s+)?SELECT)/i,
    // Comment-based injection
    /(\/\*.*\*\/|--.*|#.*)/i,
    // Time-based injection
    /(SLEEP\(|WAITFOR\s+DELAY|BENCHMARK\()/i,
    // Information gathering
    /(INFORMATION_SCHEMA|SYSOBJECTS|SYSTABLES)/i,
    // Advanced patterns
    /(CONCAT\(|CHAR\(|ASCII\(|SUBSTRING\()/i,
    // Encoded attempts
    /(%27|%22|%3B|%2D%2D)/i,
];

// Advanced threat detection
const ADVANCED_PATTERNS = [
    // SQL injection with encoding
    /(%3C%73%63%72%69%70%74|%3Cscript)/i,
    // NoSQL injection
    /(\$where|\$ne|\$gt|\$lt|\$regex)/i,
    // Command injection
    /(;|\||\&\&|ls\s|cat\s|pwd|whoami|id\s)/,
    // Path traversal
    /(\.\.\/|\.\.\\|%2e%2e%2f)/i,
    // LDAP injection
    /(\*\)\(|\)\(|\*\()/,
];

// Check for malicious patterns in input
function detectSQLInjection(input) {
    if (!input || typeof input !== 'string') return false;
    
    const normalizedInput = input.toLowerCase().trim();
    
    // Check against SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
        if (pattern.test(normalizedInput)) {
            console.warn(`🚨 SQL Injection attempt detected: Pattern matched - ${pattern}`);
            return true;
        }
    }
    
    // Check against advanced patterns
    for (const pattern of ADVANCED_PATTERNS) {
        if (pattern.test(normalizedInput)) {
            console.warn(`🚨 Advanced attack detected: Pattern matched - ${pattern}`);
            return true;
        }
    }
    
    return false;
}

// Validate all fields in an object
function validateInputSecurity(fields) {
    for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string' && detectSQLInjection(value)) {
            console.error(`🚨 SECURITY ALERT: Malicious input detected in field '${key}': ${value}`);
            return {
                isMalicious: true,
                field: key,
                value: value
            };
        }
    }
    return { isMalicious: false };
}

// Security middleware for protecting endpoints
function securityMiddleware(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    
    // Check URL parameters
    if (req.params) {
        const urlCheck = validateInputSecurity(req.params);
        if (urlCheck.isMalicious) {
            console.error(`🚨 SECURITY BREACH: URL parameter attack from IP ${clientIP}`);
            console.error(`🚨 Field: ${urlCheck.field}, Value: ${urlCheck.value}`);
            return res.redirect('/hacker-detected.html');
        }
    }
    
    // Check query parameters
    if (req.query) {
        const queryCheck = validateInputSecurity(req.query);
        if (queryCheck.isMalicious) {
            console.error(`🚨 SECURITY BREACH: Query parameter attack from IP ${clientIP}`);
            console.error(`🚨 Field: ${queryCheck.field}, Value: ${queryCheck.value}`);
            return res.redirect('/hacker-detected.html');
        }
    }
    
    // Check request body
    if (req.body) {
        const bodyCheck = validateInputSecurity(req.body);
        if (bodyCheck.isMalicious) {
            console.error(`🚨 SECURITY BREACH: Request body attack from IP ${clientIP}`);
            console.error(`🚨 Field: ${bodyCheck.field}, Value: ${bodyCheck.value}`);
            return res.redirect('/hacker-detected.html');
        }
        
        // Deep check nested objects (like fields.email, fields.lastname)
        if (req.body.fields) {
            const fieldsCheck = validateInputSecurity(req.body.fields);
            if (fieldsCheck.isMalicious) {
                console.error(`🚨 SECURITY BREACH: Form fields attack from IP ${clientIP}`);
                console.error(`🚨 Field: ${fieldsCheck.field}, Value: ${fieldsCheck.value}`);
                return res.redirect('/hacker-detected.html');
            }
        }
    }
    
    next();
}

// Create new session
app.post('/api/session/create', (req, res) => {
    const sessionId = generateSecureSessionId();
    const sessionData = {
        sessionId,
        startTime: new Date().toISOString(),
        collectedKeys: [],
        targetsFound: [],
        interactions: [],
        requiredKeys: ['Engineering Access Key', 'Science Lab Key'],
        isCompleted: false,
        createdAt: new Date().toISOString()
    };
    
    sessions.set(sessionId, sessionData);
    
    // Only return minimal data to frontend
    res.json({
        sessionId,
        requiredKeys: sessionData.requiredKeys,
        status: 'created'
    });
});

// Validate session
app.get('/api/session/:sessionId/validate', (req, res) => {
    const { sessionId } = req.params;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    res.json({
        valid: true,
        collectedKeysCount: session.collectedKeys.length,
        totalKeys: session.requiredKeys.length,
        isCompleted: session.isCompleted
    });
});

// Collect key (secure endpoint)
app.post('/api/session/:sessionId/collect-key', (req, res) => {
    const { sessionId } = req.params;
    const { keyName, targetType, method } = req.body;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    
    // Validate key name
    if (!session.requiredKeys.includes(keyName)) {
        return res.status(400).json({ error: 'Invalid key name' });
    }
    
    // Check if already collected
    if (session.collectedKeys.includes(keyName)) {
        return res.status(400).json({ error: 'Key already collected' });
    }
    
    // Add key to collection
    session.collectedKeys.push(keyName);
    
    // Track target found
    if (!session.targetsFound.includes(targetType)) {
        session.targetsFound.push(targetType);
    }
    
    // Record interaction (server-side only)
    const interaction = {
        type: 'key_collected',
        keyName,
        targetType,
        method,
        timestamp: new Date().toISOString(),
        sessionId // Server tracks this, not exposed to frontend
    };
    
    session.interactions.push(interaction);
    
    // Check completion
    const isCompleted = session.requiredKeys.every(key => session.collectedKeys.includes(key));
    if (isCompleted && !session.isCompleted) {
        session.isCompleted = true;
        session.completionTime = new Date().toISOString();
        
        session.interactions.push({
            type: 'game_completed',
            completionTime: session.completionTime,
            timeTaken: new Date() - new Date(session.startTime),
            timestamp: new Date().toISOString(),
            sessionId
        });
    }
    
    // Update session
    sessions.set(sessionId, session);
    
    // Return minimal response
    res.json({
        success: true,
        keyCollected: keyName,
        totalCollected: session.collectedKeys.length,
        totalRequired: session.requiredKeys.length,
        isCompleted,
        message: isCompleted ? 'Congratulations! All keys collected!' : `Key ${keyName} collected successfully!`
    });
});

// Record interaction (secure endpoint)
app.post('/api/session/:sessionId/interaction', (req, res) => {
    const { sessionId } = req.params;
    const { type, data } = req.body;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    
    const interaction = {
        type,
        ...data,
        timestamp: new Date().toISOString(),
        sessionId // Server-side only
    };
    
    session.interactions.push(interaction);
    sessions.set(sessionId, session);
    
    res.json({ success: true });
});

// Get session progress (minimal data)
app.get('/api/session/:sessionId/progress', (req, res) => {
    const { sessionId } = req.params;
    
    if (!sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    const session = sessions.get(sessionId);
    
    // Only return non-sensitive progress data
    res.json({
        collectedKeysCount: session.collectedKeys.length,
        totalKeys: session.requiredKeys.length,
        targetsFoundCount: session.targetsFound.length,
        isCompleted: session.isCompleted,
        progress: Math.round((session.collectedKeys.length / session.requiredKeys.length) * 100)
    });
});

// Google Sheets helper functions
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            // Check if it's a rate limit error
            if (error.code === 429 || error.status === 429) {
                if (attempt === maxRetries) {
                    throw error; // Last attempt, give up
                }
                
                // Exponential backoff: wait longer each time
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.log(`Rate limited (attempt ${attempt}/${maxRetries}). Waiting ${delay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // If it's not a rate limit error, throw immediately
            throw error;
        }
    }
}

// Search for existing user by email
async function findUserByEmail(email) {
    if (!sheets) {
        throw new Error('Google Sheets not configured');
    }
    
    return await withRetry(async () => {
        try {
            // Get all data from the sheet
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                range: 'A:I', // A=First Name, B=Last Name, C=Email, D=Check-in, E=Register Key, F=Project showcase Key, G=Afternoon session Key, H=Redeem Key, I=CODE
            });
            
            const rows = response.data.values;
            if (!rows || rows.length <= 1) {
                return []; // No data rows (only header or no data)
            }
            
            // Find matching email (skip header row)
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row[2] && row[2].toLowerCase() === email.toLowerCase()) {
                    return [{
                        rowIndex: i + 1, // 1-based for Sheets API
                        firstName: row[0] || '',
                        lastName: row[1] || '',
                        email: row[2] || '',
                        checkin: row[3] || '',
                        registerKey: row[4] || '',
                        projectShowcaseKey: row[5] || '',
                        afternoonSessionKey: row[6] || '',
                        redeemKey: row[7] || 'FALSE',
                        code: row[8] || ''
                    }];
                }
            }
            
            return []; // No match found
        } catch (error) {
            console.error('Error searching for user:', error);
            throw error;
        }
    });
}

// Create new user record
async function createUserRecord(fields) {
    if (!sheets) {
        throw new Error('Google Sheets not configured');
    }
    
    return await withRetry(async () => {
        try {
            // Find the next empty row
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                range: 'A:G',
            });
            
            const rows = response.data.values || [];
            const nextRow = rows.length + 1; // Next empty row
            
            // Append new row with first name, last name, email
            await sheets.spreadsheets.values.append({
                spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                range: 'A:G',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [
                        [fields.firstname || '', fields.lastname || '', fields.email, 'checked-in', '', '', '']
                    ]
                }
            });
            
            return {
                rowIndex: nextRow,
                firstName: fields.firstname || '',
                lastName: fields.lastname || '',
                email: fields.email,
                checkin: 'checked-in',
                registerKey: '',
                projectShowcaseKey: '',
                afternoonSessionKey: '',
                redeemKey: 'FALSE',
                code: ''
            };
        } catch (error) {
            console.error('Error creating user record:', error);
            throw error;
        }
    });
}

// Update existing user record (Google Sheets doesn't have record IDs, so we use row index)
async function updateUserRecord(rowIndex, fields) {
    if (!sheets) {
        throw new Error('Google Sheets not configured');
    }
    
    return await withRetry(async () => {
        try {
            // Update specific row
            const range = `A${rowIndex}:G${rowIndex}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [
                        [fields.firstname || '', fields.lastname || '', fields.email || '', fields.checkin || '', fields.registerKey || '', fields.projectShowcaseKey || '', fields.afternoonSessionKey || '', fields.redeemKey || 'FALSE', fields.code || '']
                    ]
                }
            });
            
            return {
                rowIndex: rowIndex,
                firstName: fields.firstname || '',
                lastName: fields.lastname || '',
                email: fields.email || ''
            };
        } catch (error) {
            console.error('Error updating user record:', error);
            throw error;
        }
    });
}

// Submit data to Google Sheets (secure endpoint)
app.post('/api/harty/submit', securityMiddleware, async (req, res) => {
    // Check if mission is enabled
    if (SERVER_CONFIG.MISSION !== 'ENABLE') {
        return res.json({ success: false, message: 'Data submission disabled' });
    }
    
    const { fields } = req.body;
    
    if (!fields || !fields.email || !fields.lastname) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing required fields: email and lastname are required' 
        });
    }
    
    try {
        console.log('Processing submission for:', fields.email);
        
        // Check if user already exists
        const existingUsers = await findUserByEmail(fields.email);
        
        if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            const existingLastname = existingUser.lastName;
            
            // Check if lastname matches
            if (existingLastname && existingLastname.toLowerCase() !== fields.lastname.toLowerCase()) {
                return res.status(409).json({
                    success: false,
                    error: 'EMAIL_ALREADY_USED',
                    message: `This email is already registered with a different name (${existingLastname}). Please use a different email or contact support.`
                });
            }
            
            // User exists with same name - auto check-in and initialize fields if needed
            console.log('Existing user found at row:', existingUser.rowIndex);
            
            // Check if user needs check-in or field initialization
            const needsUpdate = !existingUser.checkin || existingUser.checkin !== 'checked-in';
            
            if (needsUpdate) {
                console.log('Auto-checking in existing user and initializing fields...');
                
                // Update user with check-in status
                const updateFields = {
                    firstname: existingUser.firstName,
                    lastname: existingUser.lastName,
                    email: existingUser.email,
                    checkin: 'checked-in', // Mark as checked in
                    registerKey: existingUser.registerKey || '', // Keep existing or empty
                    projectShowcaseKey: existingUser.projectShowcaseKey || '', // Keep existing or empty
                    afternoonSessionKey: existingUser.afternoonSessionKey || '', // Keep existing or empty
                    redeemKey: existingUser.redeemKey || 'FALSE', // Keep existing or default
                    code: existingUser.code || '' // Keep existing or empty
                };
                
                await updateUserRecord(existingUser.rowIndex, updateFields);
                console.log('Existing user auto-checked in successfully');
            }
            
            return res.json({ 
                success: true, 
                recordId: existingUser.rowIndex.toString(), 
                existing: true,
                checkedIn: true,
                message: needsUpdate ? 'Welcome back! You have been checked in.' : 'Welcome back!' 
            });
        } else {
            // User not found - only pre-existing users are allowed
            console.log('New user registration blocked:', fields.email);
            return res.status(403).json({
                success: false,
                error: 'USER_NOT_REGISTERED',
                message: 'Only pre-registered users can access this portal. Please contact the administrator.',
                registrationUrl: 'https://example.com/contact',
                showModal: true
            });
        }
        
    } catch (error) {
        console.error('Failed to submit to Google Sheets:', error);
        
        // Check if it's a rate limit error
        if (error.code === 429 || error.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please try again in a few seconds.',
                message: 'Too many requests - please wait a moment and try again.'
            });
        }
        
        // For other errors, return 500 but allow fallback
        console.log('Falling back to offline mode');
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Unable to process registration at this time. Please try again later.',
            offline: true
        });
    }
});

// Update existing Google Sheets record (secure endpoint)
app.post('/api/harty/update', securityMiddleware, async (req, res) => {
    // Check if mission is enabled
    if (SERVER_CONFIG.MISSION !== 'ENABLE') {
        return res.json({ success: false, message: 'Data updates disabled' });
    }
    
    const { recordId, fields } = req.body;
    
    if (!recordId || !fields) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing recordId or fields' 
        });
    }
    
    try {
        console.log('Updating row:', recordId);
        
        const rowIndex = parseInt(recordId);
        const updatedRecord = await updateUserRecord(rowIndex, fields);
        
        console.log('Record updated successfully');
        res.json({ 
            success: true, 
            record: {
                id: updatedRecord.rowIndex.toString(),
                fields: {
                    firstName: updatedRecord.firstName,
                    lastName: updatedRecord.lastName,
                    email: updatedRecord.email
                }
            },
            message: 'Record updated successfully'
        });
        
    } catch (error) {
        console.error('Failed to update Google Sheets record:', error);
        
        // Check if it's a rate limit error
        if (error.code === 429 || error.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please try again in a few seconds.',
                message: 'Too many requests - please wait a moment and try again.'
            });
        }
        
        // For other errors, return 500 but allow fallback
        console.log('Falling back to offline mode for update');
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Unable to update record at this time. Please try again later.',
            offline: true
        });
    }
});

// Helper function to get user email by row index
async function getUserEmailByRowIndex(rowIndex) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
            range: `C${rowIndex}`, // Column C contains the email
        });

        const rows = response.data.values;
        if (rows && rows.length > 0 && rows[0].length > 0) {
            return rows[0][0];
        }
        return null;
    } catch (error) {
        console.error('Error getting user email by row index:', error);
        return null;
    }
}

// Helper function to check if keys 1, 2, 3 are collected and update Redeem Key
async function checkAndUpdateRedeemKey(userRecord) {
    const key1Collected = userRecord.registerKey === 'scanned';
    const key2Collected = userRecord.projectShowcaseKey === 'scanned';
    const key3Collected = userRecord.afternoonSessionKey === 'scanned';

    if (key1Collected && key2Collected && key3Collected && userRecord.redeemKey !== 'TRUE') {
        console.log(`All keys 1, 2, 3 collected for user ${userRecord.email}. Setting Redeem Key to TRUE.`);

        // Update Redeem Key column (H) to TRUE
        const range = `H${userRecord.rowIndex}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [['TRUE']]
            }
        });

        return true; // Redeem key was updated
    }

    return false; // No update needed
}

// Update specific key for a user
app.post('/api/harty/update-key', securityMiddleware, async (req, res) => {
    // Check if mission is enabled
    if (SERVER_CONFIG.MISSION !== 'ENABLE') {
        return res.json({ success: false, message: 'Key updates disabled' });
    }
    
    const { recordId, keyField, status } = req.body;
    
    if (!recordId || !keyField || !status) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing recordId, keyField, or status' 
        });
    }
    
    try {
        console.log(`Updating key ${keyField} to ${status} for row ${recordId}`);
        
        const rowIndex = parseInt(recordId);
        
        // Map key fields to spreadsheet columns
        let columnLetter = '';
        let columnIndex = -1;
        
        switch(keyField) {
            case 'key1 status':
                columnLetter = 'E'; // Register Key
                columnIndex = 4;
                break;
            case 'key2 status':
                columnLetter = 'F'; // Project showcase Key
                columnIndex = 5;
                break;
            case 'key3 status':
                columnLetter = 'G'; // Afternoon session Key
                columnIndex = 6;
                break;
            case 'key4 status':
                columnLetter = 'D'; // Check-in (if needed)
                columnIndex = 3;
                break;
            default:
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid keyField: ' + keyField 
                });
        }
        
        // Update specific cell
        const range = `${columnLetter}${rowIndex}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[status]]
            }
        });
        
        console.log(`Key ${keyField} updated successfully to ${status}`);

        // Check if this update means we should enable redeem key
        if (status === 'scanned' && (keyField === 'key1 status' || keyField === 'key2 status' || keyField === 'key3 status')) {
            try {
                // Get updated user record to check all keys
                const userEmail = await getUserEmailByRowIndex(rowIndex);
                if (userEmail) {
                    const updatedUsers = await findUserByEmail(userEmail);
                    if (updatedUsers && updatedUsers.length > 0) {
                        const updatedUser = updatedUsers[0];
                        await checkAndUpdateRedeemKey(updatedUser);
                    }
                }
            } catch (redeemError) {
                console.error('Error checking/updating redeem key:', redeemError);
                // Don't fail the main operation if redeem key check fails
            }
        }

        res.json({
            success: true,
            message: `Key ${keyField} updated to ${status}`,
            keyField,
            status
        });
        
    } catch (error) {
        console.error('Failed to update key in Google Sheets:', error);
        
        // Check if it's a rate limit error
        if (error.code === 429 || error.status === 429) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please try again in a few seconds.',
                message: 'Too many requests - please wait a moment and try again.'
            });
        }
        
        // For other errors, return 500 but allow fallback
        console.log('Falling back to offline mode for key update');
        res.status(500).json({ 
            success: false,
            error: 'Internal server error',
            message: 'Unable to update key at this time. Please try again later.',
            offline: true
        });
    }
});

// Save redeem code to user record
app.post('/api/harty/save-redeem-code', securityMiddleware, async (req, res) => {
    // Check if mission is enabled
    if (SERVER_CONFIG.MISSION !== 'ENABLE') {
        return res.json({ success: false, message: 'Code saving disabled' });
    }

    const { email, redeemCode } = req.body;

    if (!email || !redeemCode) {
        return res.status(400).json({
            success: false,
            error: 'Missing email or redeemCode'
        });
    }

    try {
        console.log(`Saving redeem code for user ${email}: ${redeemCode}`);

        // Find user by email
        const users = await findUserByEmail(email);
        if (!users || users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = users[0];

        // Update CODE column (I) with the redeem code
        const range = `I${user.rowIndex}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[redeemCode]]
            }
        });

        console.log(`Redeem code saved successfully for user ${email}`);
        res.json({
            success: true,
            message: 'Redeem code saved successfully'
        });

    } catch (error) {
        console.error('Failed to save redeem code:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save redeem code',
            message: error.message
        });
    }
});

// Get user data endpoint
app.get('/api/harty/user/:email', securityMiddleware, async (req, res) => {
    try {
        if (!sheets) {
            return res.status(503).json({ 
                success: false, 
                error: 'Configuration error',
                message: 'Google Sheets integration is required but not configured. Please contact administrator.' 
            });
        }

        const { email } = req.params;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required parameter: email' 
            });
        }

        console.log(`Searching for user data for ${email}`);
        
        // Search for user by email using our existing function
        const existingUsers = await findUserByEmail(email);

        if (existingUsers && existingUsers.length > 0) {
            const userRecord = existingUsers[0];
            
            // Map spreadsheet columns to key statuses
            const keyStatuses = {
                key1: userRecord.registerKey === 'scanned' ? 'scanned' : 'not_scanned', // Column E
                key2: userRecord.projectShowcaseKey === 'scanned' ? 'scanned' : 'not_scanned', // Column F
                key3: userRecord.afternoonSessionKey === 'scanned' ? 'scanned' : 'not_scanned', // Column G
                key4: userRecord.checkin === 'scanned' ? 'scanned' : 'not_scanned' // Column D
            };

            // Check if keys 1, 2, 3 are all scanned but Redeem Key is still FALSE
            let redeemKeyEnabled = userRecord.redeemKey === 'TRUE';
            if (!redeemKeyEnabled && keyStatuses.key1 === 'scanned' && keyStatuses.key2 === 'scanned' && keyStatuses.key3 === 'scanned') {
                try {
                    console.log(`Auto-updating Redeem Key to TRUE for user ${userRecord.email} - all keys 1,2,3 are scanned`);

                    // Update Redeem Key column (H) to TRUE
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                        range: `H${userRecord.rowIndex}`,
                        valueInputOption: 'USER_ENTERED',
                        resource: {
                            values: [['TRUE']]
                        }
                    });

                    redeemKeyEnabled = true;
                    console.log(`Redeem Key auto-updated to TRUE for user ${userRecord.email}`);
                } catch (updateError) {
                    console.error('Failed to auto-update Redeem Key:', updateError);
                    // Continue with original value if update fails
                }
            }

            res.json({
                success: true,
                message: 'User data retrieved successfully',
                data: {
                    recordId: userRecord.rowIndex.toString(),
                    email: userRecord.email,
                    lastName: userRecord.lastName,
                    keyStatuses: keyStatuses,
                    redeemKeyEnabled: redeemKeyEnabled
                }
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'USER_NOT_REGISTERED',
                message: 'Please register first before accessing the portal.',
                registrationUrl: 'https://airtable.com/appE4SeDTpEI6XTRX/pagOUHvMAlLgJS2Pf/form',
                showModal: true
            });
        }

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: 'Failed to retrieve user data'
        });
    }
});

// Get public configuration (safe values only)
app.get('/api/config', (req, res) => {
    res.json({
        mission: SERVER_CONFIG.MISSION,
        features: {
            dataSubmission: SERVER_CONFIG.MISSION === 'ENABLE'
        }
    });
});

// Admin endpoint to view analytics (add authentication in production)
app.get('/api/admin/analytics', (req, res) => {
    // In production, add proper authentication here
    const analytics = {
        totalSessions: sessions.size,
        completedSessions: Array.from(sessions.values()).filter(s => s.isCompleted).length,
        totalInteractions: Array.from(sessions.values()).reduce((sum, s) => sum + s.interactions.length, 0)
    };
    
    res.json(analytics);
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// For Vercel deployment
module.exports = app;

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 CMKL OpenHouse secure server running on port ${PORT}`);
        console.log(`📱 Visit: http://localhost:${PORT}`);
    });
}