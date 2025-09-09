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

// Serve static files from the root directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

// In-memory storage (replace with database in production)
const sessions = new Map();
const userInteractions = new Map();

// Generate secure session ID
function generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex');
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
                range: 'A:C', // A=First Name, B=Last Name, C=Email
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
                        email: row[2] || ''
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
                range: 'A:C',
            });
            
            const rows = response.data.values || [];
            const nextRow = rows.length + 1; // Next empty row
            
            // Append new row with first name, last name, email
            await sheets.spreadsheets.values.append({
                spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                range: 'A:C',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [
                        [fields.firstname || '', fields.lastname || '', fields.email]
                    ]
                }
            });
            
            return {
                rowIndex: nextRow,
                firstName: fields.firstname || '',
                lastName: fields.lastname || '',
                email: fields.email
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
            const range = `A${rowIndex}:C${rowIndex}`;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
                range: range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [
                        [fields.firstname || '', fields.lastname || '', fields.email || '']
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
app.post('/api/airtable/submit', async (req, res) => {
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
            
            // User exists with same name, return existing record
            console.log('Existing user found at row:', existingUser.rowIndex);
            return res.json({ 
                success: true, 
                recordId: existingUser.rowIndex.toString(), 
                existing: true,
                message: 'Welcome back!' 
            });
        }
        
        // Create new user record
        const newRecord = await createUserRecord(fields);
        
        console.log('New user created successfully at row:', newRecord.rowIndex);
        res.json({ 
            success: true, 
            recordId: newRecord.rowIndex.toString(),
            existing: false,
            message: 'Registration successful!' 
        });
        
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
app.post('/api/airtable/update', async (req, res) => {
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

// Get user data endpoint
app.get('/api/airtable/user/:email', async (req, res) => {
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
            
            // For Google Sheets, we only have basic user data (no key status columns yet)
            // Return basic user data structure expected by frontend
            const keyStatuses = {
                key1: 'not_scanned',
                key2: 'not_scanned', 
                key3: 'not_scanned',
                key4: 'not_scanned'
            };

            res.json({ 
                success: true, 
                message: 'User data retrieved successfully',
                data: {
                    recordId: userRecord.rowIndex.toString(),
                    email: userRecord.email,
                    lastName: userRecord.lastName,
                    keyStatuses: keyStatuses
                }
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'User not found',
                message: 'No user found with the provided email address'
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

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Export the app for Vercel
module.exports = app;