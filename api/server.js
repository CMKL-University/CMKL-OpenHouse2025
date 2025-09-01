const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
            mission: process.env.MISSION || 'DISABLE',
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
        if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_TABLE_NAME) {
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

        // Make request to Airtable API (server-side only)
        const fetch = (await import('node-fetch')).default;
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}`;
        
        const response = await fetch(airtableUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    'email': fields.email,
                    'lastname': fields.lastname,
                    'key1 status': fields['key1 status'] || 'not_scanned',
                    'key2 status': fields['key2 status'] || 'not_scanned',
                    'key3 status': fields['key3 status'] || 'not_scanned'
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            res.json({ 
                success: true, 
                recordId: data.id,
                message: 'User record created successfully'
            });
        } else {
            const errorText = await response.text();
            console.error('Airtable API error:', errorText);
            res.status(response.status).json({ 
                success: false, 
                error: 'Failed to create user record in Airtable' 
            });
        }

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
        if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID || !process.env.AIRTABLE_TABLE_NAME) {
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

        const fetch = (await import('node-fetch')).default;
        const airtableUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}/${recordId}`;
        
        const response = await fetch(airtableUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    [keyField]: status
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            res.json({ 
                success: true, 
                message: 'Key status updated successfully',
                data: data.fields
            });
        } else {
            const errorText = await response.text();
            console.error('Airtable API error:', errorText);
            res.status(response.status).json({ 
                success: false, 
                error: 'Failed to update key status' 
            });
        }

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