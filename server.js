const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const Airtable = require('airtable');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Secure server-side configuration - loaded from environment variables
const SERVER_CONFIG = {
    MISSION: process.env.MISSION || 'ENABLE',
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME || 'Table 1'
};

// Validate required environment variables
if (!SERVER_CONFIG.AIRTABLE_API_KEY || !SERVER_CONFIG.AIRTABLE_BASE_ID) {
    console.error('❌ Missing required environment variables:');
    if (!SERVER_CONFIG.AIRTABLE_API_KEY) console.error('   - AIRTABLE_API_KEY');
    if (!SERVER_CONFIG.AIRTABLE_BASE_ID) console.error('   - AIRTABLE_BASE_ID');
    console.error('Please create a .env file with the required variables.');
    process.exit(1);
}

// Configure Airtable
let base = null;
if (SERVER_CONFIG.AIRTABLE_API_KEY && SERVER_CONFIG.AIRTABLE_BASE_ID) {
    Airtable.configure({
        endpointUrl: 'https://api.airtable.com',
        apiKey: SERVER_CONFIG.AIRTABLE_API_KEY
    });
    base = Airtable.base(SERVER_CONFIG.AIRTABLE_BASE_ID);
    console.log('✅ Airtable configured successfully');
} else {
    console.warn('⚠️ Airtable not configured - running in offline mode');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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

// Airtable helper functions using Airtable.js library
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            // Check if it's a rate limit error
            if (error.statusCode === 429 || (error.error && error.error.indexOf('Rate limit') !== -1)) {
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
    if (!base) {
        throw new Error('Airtable not configured');
    }
    
    return await withRetry(async () => {
        return new Promise((resolve, reject) => {
            const records = [];
            base(SERVER_CONFIG.AIRTABLE_TABLE_NAME).select({
                filterByFormula: `{email} = "${email}"`,
                maxRecords: 1
            }).eachPage(
                function page(pageRecords, fetchNextPage) {
                    records.push(...pageRecords);
                    fetchNextPage();
                },
                function done(err) {
                    if (err) {
                        console.error('Error searching for user:', err);
                        reject(err);
                    } else {
                        resolve(records);
                    }
                }
            );
        });
    });
}

// Create new user record
async function createUserRecord(fields) {
    if (!base) {
        throw new Error('Airtable not configured');
    }
    
    return await withRetry(async () => {
        return new Promise((resolve, reject) => {
            base(SERVER_CONFIG.AIRTABLE_TABLE_NAME).create([
                {
                    fields: {
                        'email': fields.email,
                        'lastname': fields.lastname,
                        'key1 status': 'not_scanned',
                        'key2 status': 'not_scanned',
                        'key3 status': 'not_scanned'
                    }
                }
            ], function(err, records) {
                if (err) {
                    console.error('Error creating user record:', err);
                    reject(err);
                } else {
                    console.log('Created user record:', records[0].getId());
                    resolve(records[0]);
                }
            });
        });
    });
}

// Update existing user record
async function updateUserRecord(recordId, fields) {
    if (!base) {
        throw new Error('Airtable not configured');
    }
    
    return await withRetry(async () => {
        return new Promise((resolve, reject) => {
            base(SERVER_CONFIG.AIRTABLE_TABLE_NAME).update([
                {
                    id: recordId,
                    fields: {
                        ...fields,
                        lastUpdated: new Date().toISOString()
                    }
                }
            ], function(err, records) {
                if (err) {
                    console.error('Error updating user record:', err);
                    reject(err);
                } else {
                    console.log('Updated user record:', records[0].getId());
                    resolve(records[0]);
                }
            });
        });
    });
}

// Submit data to Airtable (secure endpoint)
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
            const existingLastname = existingUser.get('lastname');
            
            // Check if lastname matches
            if (existingLastname && existingLastname.toLowerCase() !== fields.lastname.toLowerCase()) {
                return res.status(409).json({
                    success: false,
                    error: 'EMAIL_ALREADY_USED',
                    message: `This email is already registered with a different name (${existingLastname}). Please use a different email or contact support.`
                });
            }
            
            // User exists with same name, return existing record
            console.log('Existing user found:', existingUser.getId());
            return res.json({ 
                success: true, 
                recordId: existingUser.getId(), 
                existing: true,
                message: 'Welcome back!' 
            });
        }
        
        // Create new user record
        const newRecord = await createUserRecord(fields);
        
        console.log('New user created successfully:', newRecord.getId());
        res.json({ 
            success: true, 
            recordId: newRecord.getId(),
            existing: false,
            message: 'Registration successful!' 
        });
        
    } catch (error) {
        console.error('Failed to submit to Airtable:', error);
        
        // Check if it's a rate limit error
        if (error.statusCode === 429) {
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

// Update existing Airtable record (secure endpoint)
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
        console.log('Updating record:', recordId);
        
        const updatedRecord = await updateUserRecord(recordId, fields);
        
        console.log('Record updated successfully');
        res.json({ 
            success: true, 
            record: {
                id: updatedRecord.getId(),
                fields: updatedRecord.fields
            },
            message: 'Record updated successfully'
        });
        
    } catch (error) {
        console.error('Failed to update Airtable record:', error);
        
        // Check if it's a rate limit error
        if (error.statusCode === 429) {
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

app.listen(PORT, () => {
    console.log(`🚀 CMKL OpenHouse secure server running on port ${PORT}`);
    console.log(`📱 Visit: http://localhost:${PORT}`);
});