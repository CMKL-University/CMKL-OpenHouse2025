const express = require('express');
const cors = require('cors');
const path = require('path');
const Airtable = require('airtable');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Airtable
let base = null;
if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
    Airtable.configure({
        endpointUrl: 'https://api.airtable.com',
        apiKey: process.env.AIRTABLE_API_KEY
    });
    base = Airtable.base(process.env.AIRTABLE_BASE_ID || 'appBWW2jchcr1OW3Q');
}

// Rate limit helper function
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

// In-memory lock to prevent race conditions for email registration
const emailLocks = new Map();

async function withEmailLock(email, fn) {
    const normalizedEmail = email.toLowerCase();
    
    // Wait for any existing lock to release
    while (emailLocks.has(normalizedEmail)) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Acquire lock
    emailLocks.set(normalizedEmail, true);
    
    try {
        return await fn();
    } finally {
        // Always release lock
        emailLocks.delete(normalizedEmail);
    }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the root directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.get('/api/config', (req, res) => {
    try {
        // Send only non-sensitive configuration to frontend
        const config = {
            mission: process.env.MISSION || 'ENABLE',
            features: {
                dataSubmission: !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID && process.env.AIRTABLE_TABLE_NAME)
            },
            ui: {
                targetTimeout: 60000,
                messageDisplayTime: 3000
            }
        };
        
        res.json(config);
    } catch (error) {
        console.error('Error loading config:', error);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

// Secure Airtable submission endpoint
app.post('/api/airtable/submit', async (req, res) => {
    try {
        // Check if Airtable integration is configured
        if (!base || !process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
            return res.json({ 
                success: false, 
                message: 'Airtable integration not configured - running in demo mode' 
            });
        }

        const { fields } = req.body;
        
        if (!fields || !fields.email || !fields.lastname) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: email and lastname' 
            });
        }

        const tableName = process.env.AIRTABLE_TABLE_NAME || 'Table 1';
        const email = fields.email.toLowerCase(); // Normalize email to lowercase
        const lastname = fields.lastname;
        
        // Use email lock to prevent race conditions
        return await withEmailLock(email, async () => {
        
        const searchResult = await withRetry(async () => {
            return new Promise((resolve, reject) => {
                // Escape quotes and special characters in email for safe formula usage
                const escapedEmail = email.replace(/"/g, '""').replace(/'/g, "''");
                base(tableName).select({
                    filterByFormula: `LOWER({email}) = "${escapedEmail}"`
                }).firstPage((err, records) => {
                    if (err) reject(err);
                    else resolve(records);
                });
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
                    message: `This email is already registered with a different name. Please use a different email.`
                });
            } else {
                // Email exists with same lastname - return existing record with fields
                return res.json({ 
                    success: true, 
                    recordId: existingRecord.getId(), 
                    existing: true,
                    message: 'Welcome back! Using your existing account.',
                    fields: {
                        email: existingRecord.get('email') || fields.email,
                        lastname: existingRecord.get('lastname') || fields.lastname,
                        'key1 status': existingRecord.get('key1 status') || 'not_scanned',
                        'key2 status': existingRecord.get('key2 status') || 'not_scanned',
                        'key3 status': existingRecord.get('key3 status') || 'not_scanned'
                    }
                });
            }
        }

        // Email doesn't exist, create new record with retry logic
        const newRecords = await withRetry(async () => {
            return new Promise((resolve, reject) => {
                base(tableName).create([
                    {
                        "fields": {
                            "email": fields.email,
                            "lastname": fields.lastname,
                            "key1 status": fields['key1 status'] || 'not_scanned',
                            "key2 status": fields['key2 status'] || 'not_scanned',
                            "key3 status": fields['key3 status'] || 'not_scanned'
                        }
                    }
                ], function(err, records) {
                    if (err) reject(err);
                    else resolve(records);
                });
            });
        });
        
        res.json({ 
            success: true, 
            recordId: newRecords[0].getId(),
            message: 'User record created successfully',
            fields: {
                email: newRecords[0].get('email'),
                lastname: newRecords[0].get('lastname'),
                'key1 status': newRecords[0].get('key1 status') || 'not_scanned',
                'key2 status': newRecords[0].get('key2 status') || 'not_scanned',
                'key3 status': newRecords[0].get('key3 status') || 'not_scanned'
            }
        });
        }); // End of withEmailLock

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Update key status endpoint
app.post('/api/airtable/update-key', async (req, res) => {
    try {
        if (!base || !process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
            return res.json({ 
                success: false, 
                message: 'Airtable integration not configured' 
            });
        }

        const { recordId, keyField, status } = req.body;
        
        if (!recordId || !keyField || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: recordId, keyField, and status' 
            });
        }

        const tableName = process.env.AIRTABLE_TABLE_NAME || 'Table 1';
        
        const updatedRecords = await withRetry(async () => {
            return new Promise((resolve, reject) => {
                base(tableName).update([
                    {
                        "id": recordId,
                        "fields": {
                            [keyField]: status
                        }
                    }
                ], function(err, records) {
                    if (err) reject(err);
                    else resolve(records);
                });
            });
        });
        
        res.json({ 
            success: true, 
            message: 'Key status updated successfully',
            data: updatedRecords[0].fields
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 CMKL OpenHouse API server running on port ${PORT}`);
    console.log(`📱 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints available at: http://localhost:${PORT}/api/`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});