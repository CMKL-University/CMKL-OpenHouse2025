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

// Submit data to Airtable (secure endpoint)
app.post('/api/airtable/submit', async (req, res) => {
    // Check if mission is enabled
    if (SERVER_CONFIG.MISSION !== 'ENABLE') {
        return res.json({ success: false, message: 'Data submission disabled' });
    }
    
    const { sessionId, fields } = req.body;
    
    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(400).json({ error: 'Invalid session' });
    }
    
    try {
        if (!base) {
            throw new Error('Airtable not configured');
        }

        // First check if user exists
        const email = fields.email;
        const lastname = fields.lastname;
        
        if (email) {
            const searchResult = await new Promise((resolve, reject) => {
                base(SERVER_CONFIG.AIRTABLE_TABLE_NAME).select({
                    filterByFormula: `{email} = "${email}"`
                }).firstPage((err, records) => {
                    if (err) reject(err);
                    else resolve(records);
                });
            });
            
            if (searchResult && searchResult.length > 0) {
                const existingRecord = searchResult[0];
                const existingLastname = existingRecord.get('lastname');
                
                // Check if the lastname matches
                if (existingLastname && existingLastname.toLowerCase() !== lastname.toLowerCase()) {
                    // Email exists but with different lastname - return error
                    return res.status(409).json({ 
                        success: false, 
                        error: 'EMAIL_ALREADY_USED',
                        message: `This email is already registered with a different name. Please use a different email or contact support if this is your email.`
                    });
                } else {
                    // Email exists with same lastname - return existing record
                    return res.json({ success: true, recordId: existingRecord.getId(), existing: true });
                }
            }
        }
        
        // Create new user record with your actual Table 1 structure
        const records = await new Promise((resolve, reject) => {
            base(SERVER_CONFIG.AIRTABLE_TABLE_NAME).create([
                {
                    "fields": {
                        'email': fields.email,
                        'lastname': fields.lastname,
                        'key1 status': 'not_scanned',
                        'key2 status': 'not_scanned', 
                        'key3 status': 'not_scanned'
                    }
                }
            ], (err, records) => {
                if (err) reject(err);
                else resolve(records);
            });
        });
        
        res.json({ success: true, recordId: records[0].getId() });
    } catch (error) {
        console.error('Failed to submit to Airtable:', error);
        console.log('Falling back to offline mode');
        // Return success even if Airtable fails - allow AR experience to continue
        res.json({ 
            success: true, 
            recordId: 'offline_session_' + Date.now(),
            message: 'Running in offline mode - data not stored remotely'
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
        return res.status(400).json({ error: 'Missing recordId or fields' });
    }
    
    try {
        if (!base) {
            throw new Error('Airtable not configured');
        }

        const records = await new Promise((resolve, reject) => {
            base(SERVER_CONFIG.AIRTABLE_TABLE_NAME).update([
                {
                    "id": recordId,
                    "fields": {
                        ...fields,
                        lastUpdated: new Date().toISOString()
                    }
                }
            ], (err, records) => {
                if (err) reject(err);
                else resolve(records);
            });
        });
        
        res.json({ success: true, record: records[0] });
    } catch (error) {
        console.error('Failed to update Airtable record:', error);
        console.log('Falling back to offline mode for update');
        // Return success even if Airtable fails - allow AR experience to continue
        res.json({ 
            success: true, 
            record: { id: recordId, fields: fields },
            message: 'Running in offline mode - data not updated remotely'
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