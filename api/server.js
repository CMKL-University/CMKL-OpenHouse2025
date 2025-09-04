const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { URL } = require('url');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Airtable direct API access
const AIRTABLE_CONFIG = {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Table 1',
    baseUrl: 'https://api.airtable.com/v0'
};

// Helper function for Airtable API calls with proper timeout handling using Node.js https
async function airtableRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'CMKL-OpenHouse-API/1.0',
                ...options.headers
            },
            timeout: 15000 // 15 second timeout
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const jsonData = JSON.parse(data);
                        resolve(jsonData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        // Write request body if provided
        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

// Rate limit helper function - following Airtable documentation
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            console.log(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
            
            // Check if it's a rate limit error (429)
            if (error.statusCode === 429 || (error.error && error.error.indexOf('Rate limit') !== -1)) {
                if (attempt === maxRetries) {
                    throw new Error('Rate limit exceeded after maximum retries');
                }
                
                // Airtable documentation says wait 30 seconds for rate limits
                const delay = 30000; // 30 seconds
                console.log(`Rate limited. Waiting ${delay/1000} seconds before retry (attempt ${attempt}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            // For other errors, use exponential backoff
            if (attempt === maxRetries) {
                throw error; // Last attempt, give up
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
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
        // Ensure Airtable is properly configured before enabling data submission
        const airtableConfigured = !!(AIRTABLE_CONFIG.apiKey && AIRTABLE_CONFIG.baseId);
        
        // Send only non-sensitive configuration to frontend
        const config = {
            mission: process.env.MISSION || 'ENABLE',
            features: {
                dataSubmission: airtableConfigured
            },
            ui: {
                targetTimeout: 60000,
                messageDisplayTime: 3000
            }
        };
        
        console.log(`Config requested - Airtable integration: ${airtableConfigured ? 'ENABLED' : 'DISABLED'}`);
        res.json(config);
    } catch (error) {
        console.error('Error loading config:', error);
        res.status(500).json({ error: 'Failed to load configuration' });
    }
});

// Secure Airtable submission endpoint
app.post('/api/airtable/submit', async (req, res) => {
    try {
        // Check if Airtable integration is configured - REQUIRED
        if (!AIRTABLE_CONFIG.apiKey || !AIRTABLE_CONFIG.baseId) {
            return res.status(503).json({ 
                success: false, 
                error: 'Configuration error',
                message: 'Airtable integration is required but not configured. Please contact administrator.' 
            });
        }

        const { fields } = req.body;
        
        if (!fields || !fields.email || !fields.lastname) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: email and lastname' 
            });
        }

        const email = fields.email.toLowerCase(); // Normalize email to lowercase
        const lastname = fields.lastname;
        
        // Use email lock to prevent race conditions
        return await withEmailLock(email, async () => {
        
        // Search for existing record using direct API
        const escapedEmail = email.replace(/"/g, '""');
        const searchUrl = `${AIRTABLE_CONFIG.baseUrl}/${AIRTABLE_CONFIG.baseId}/${encodeURIComponent(AIRTABLE_CONFIG.tableName)}?filterByFormula={email}="${escapedEmail}"&maxRecords=1`;
        
        const searchResult = await withRetry(async () => {
            console.log(`Searching for existing records for ${email}`);
            return await airtableRequest(searchUrl);
        });
        
        if (searchResult && searchResult.records && searchResult.records.length > 0) {
            const existingRecord = searchResult.records[0];
            const existingLastname = existingRecord.fields.lastname;
            
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
                console.log(`Found existing record for ${email}`);
                return res.json({ 
                    success: true, 
                    recordId: existingRecord.id, 
                    existing: true,
                    message: 'Welcome back! Using your existing account.',
                    fields: {
                        email: existingRecord.fields.email || fields.email,
                        lastname: existingRecord.fields.lastname || fields.lastname,
                        'key1 status': existingRecord.fields['key1 status'] || 'not_scanned',
                        'key2 status': existingRecord.fields['key2 status'] || 'not_scanned',
                        'key3 status': existingRecord.fields['key3 status'] || 'not_scanned'
                    }
                });
            }
        }

        // Email doesn't exist, create new record with direct API
        console.log(`Creating new record for ${email}`);
        const createUrl = `${AIRTABLE_CONFIG.baseUrl}/${AIRTABLE_CONFIG.baseId}/${encodeURIComponent(AIRTABLE_CONFIG.tableName)}`;
        
        const createResult = await withRetry(async () => {
            return await airtableRequest(createUrl, {
                method: 'POST',
                body: JSON.stringify({
                    records: [{
                        fields: {
                            email: fields.email,
                            lastname: fields.lastname,
                            'key1 status': 'not_scanned',
                            'key2 status': 'not_scanned',
                            'key3 status': 'not_scanned'
                        }
                    }]
                })
            });
        });
        
        const newRecord = createResult.records[0];
        console.log('Created record:', newRecord.id);
        
        res.json({ 
            success: true, 
            recordId: newRecord.id,
            message: 'User record created successfully',
            fields: {
                email: newRecord.fields.email,
                lastname: newRecord.fields.lastname,
                'key1 status': newRecord.fields['key1 status'] || 'not_scanned',
                'key2 status': newRecord.fields['key2 status'] || 'not_scanned',
                'key3 status': newRecord.fields['key3 status'] || 'not_scanned'
            }
        });
        }); // End of withEmailLock

    } catch (error) {
        console.error('Server error in /api/airtable/submit:', error);
        
        // Handle specific error types
        if (error.statusCode === 401) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication failed - check Airtable API key',
                message: 'Invalid API credentials'
            });
        }
        
        if (error.statusCode === 429) {
            return res.status(429).json({ 
                success: false, 
                error: 'Rate limit exceeded',
                message: 'Too many requests. Please wait 30 seconds and try again.'
            });
        }
        
        if (error.statusCode === 422) {
            return res.status(422).json({ 
                success: false, 
                error: 'Invalid request data',
                message: 'The data provided is invalid. Please check your input.'
            });
        }
        
        // For network/timeout errors
        if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || 
            error.type === 'system' || error.message === 'Request timeout') {
            console.error('Network/timeout error details:', error);
            return res.status(503).json({ 
                success: false, 
                error: 'Network error',
                message: 'Connection to Airtable timed out. Please try again in a few moments.'
            });
        }
        
        // Generic server error
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: 'An unexpected error occurred. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Update key status endpoint
app.post('/api/airtable/update-key', async (req, res) => {
    try {
        if (!AIRTABLE_CONFIG.apiKey || !AIRTABLE_CONFIG.baseId) {
            return res.status(503).json({ 
                success: false, 
                error: 'Configuration error',
                message: 'Airtable integration is required but not configured. Please contact administrator.' 
            });
        }

        const { recordId, keyField, status } = req.body;
        
        if (!recordId || !keyField || !status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: recordId, keyField, and status' 
            });
        }

        const updateUrl = `${AIRTABLE_CONFIG.baseUrl}/${AIRTABLE_CONFIG.baseId}/${encodeURIComponent(AIRTABLE_CONFIG.tableName)}`;
        
        const updateResult = await withRetry(async () => {
            return await airtableRequest(updateUrl, {
                method: 'PATCH',
                body: JSON.stringify({
                    records: [{
                        id: recordId,
                        fields: {
                            [keyField]: status
                        }
                    }]
                })
            });
        });
        
        res.json({ 
            success: true, 
            message: 'Key status updated successfully',
            data: updateResult.records[0].fields
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

// Validate Airtable configuration at startup
if (!AIRTABLE_CONFIG.apiKey || !AIRTABLE_CONFIG.baseId) {
    console.error('❌ FATAL ERROR: Airtable integration is required but not configured!');
    console.error('   Missing environment variables:');
    if (!AIRTABLE_CONFIG.apiKey) console.error('   - AIRTABLE_API_KEY');
    if (!AIRTABLE_CONFIG.baseId) console.error('   - AIRTABLE_BASE_ID');
    console.error('   Please configure these in your .env file before starting the server.');
    process.exit(1);
}

app.listen(PORT, () => {
    console.log(`🚀 CMKL OpenHouse API server running on port ${PORT}`);
    console.log(`📱 Frontend available at: http://localhost:${PORT}`);
    console.log(`🔧 API endpoints available at: http://localhost:${PORT}/api/`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✅ Airtable integration: ENABLED`);
    console.log(`📊 Base ID: ${AIRTABLE_CONFIG.baseId}`);
    console.log(`📋 Table: ${AIRTABLE_CONFIG.tableName}`);
});