const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Secure server-side configuration - loaded from environment variables
const SERVER_CONFIG = {
    MISSION: process.env.MISSION || 'DISABLE',
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME: process.env.AIRTABLE_TABLE_NAME || 'Table%201'
};

// Validate required environment variables
if (!SERVER_CONFIG.AIRTABLE_API_KEY || !SERVER_CONFIG.AIRTABLE_BASE_ID) {
    console.error('❌ Missing required environment variables:');
    if (!SERVER_CONFIG.AIRTABLE_API_KEY) console.error('   - AIRTABLE_API_KEY');
    if (!SERVER_CONFIG.AIRTABLE_BASE_ID) console.error('   - AIRTABLE_BASE_ID');
    console.error('Please create a .env file with the required variables.');
    process.exit(1);
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

// Secure Airtable endpoints
async function makeAirtableRequest(method, endpoint, data = null) {
    const url = `https://api.airtable.com/v0/${SERVER_CONFIG.AIRTABLE_BASE_ID}/${SERVER_CONFIG.AIRTABLE_TABLE_NAME}${endpoint}`;
    
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${SERVER_CONFIG.AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Airtable API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Airtable request failed:', error);
        throw error;
    }
}

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
        // First check if user exists
        const email = fields.email;
        if (email) {
            const filterFormula = encodeURIComponent(`{email} = "${email}"`);
            const searchResult = await makeAirtableRequest('GET', `?filterByFormula=${filterFormula}`);
            
            if (searchResult.records && searchResult.records.length > 0) {
                // User exists, return existing record
                return res.json({ success: true, recordId: searchResult.records[0].id, existing: true });
            }
        }
        
        // Create new user record
        const result = await makeAirtableRequest('POST', '', {
            records: [{
                fields: {
                    ...fields,
                    sessionId,
                    timestamp: new Date().toISOString()
                }
            }]
        });
        
        res.json({ success: true, recordId: result.records[0].id });
    } catch (error) {
        console.error('Failed to submit to Airtable:', error);
        res.status(500).json({ error: 'Failed to submit data' });
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
        const result = await makeAirtableRequest('PATCH', '', {
            records: [{
                id: recordId,
                fields: {
                    ...fields,
                    lastUpdated: new Date().toISOString()
                }
            }]
        });
        
        res.json({ success: true, record: result.records[0] });
    } catch (error) {
        console.error('Failed to update Airtable record:', error);
        res.status(500).json({ error: 'Failed to update record' });
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