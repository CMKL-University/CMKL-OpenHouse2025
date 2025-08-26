// Configuration template file
// Copy this file to 'config.js' and fill in your actual values

const config = {
    AIRTABLE_API_KEY: 'your-airtable-api-key-here',
    AIRTABLE_BASE_ID: 'your-base-id-here', 
    AIRTABLE_TABLE_NAME: 'Table%201' // URL encoded table name
};

// Instructions:
// 1. Copy this file to 'config.js'
// 2. Replace the placeholder values with your actual Airtable credentials
// 3. Get your API key from: https://airtable.com/create/tokens
// 4. Find your Base ID in the Airtable API documentation for your base

window.APP_CONFIG = config;