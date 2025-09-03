#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read .env file
const envPath = path.join(__dirname, '.env');
const env = {};

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
            env[key.trim()] = value.trim();
        }
    });
}

// Generate config.js
const configContent = `// Auto-generated configuration from .env
// DO NOT COMMIT THIS FILE

const config = {
    MISSION: 'ENABLE', // ENABLE or DISABLE
    AIRTABLE_API_KEY: '${env.AIRTABLE_API_KEY || 'your-api-key-here'}',
    AIRTABLE_BASE_ID: '${env.AIRTABLE_BASE_ID || 'your-base-id-here'}',
    AIRTABLE_TABLE_NAME: '${env.AIRTABLE_TABLE_NAME || 'Table%201'}'
};

window.APP_CONFIG = config;
`;

fs.writeFileSync(path.join(__dirname, 'config.js'), configContent);
console.log('✅ config.js generated from .env file');