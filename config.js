// Configuration for local development
// Note: During deployment, this file will be replaced with secrets from GitHub Actions

window.APP_CONFIG = {
    MISSION: 'ENABLE', // Local development default
    AIRTABLE_API_KEY: '', // Will be populated during deployment
    AIRTABLE_BASE_ID: '', // Will be populated during deployment  
    AIRTABLE_TABLE_NAME: '', // Will be populated during deployment
    
    // UI configuration
    ui: {
        targetTimeout: 60000, // 1 minute
        messageDisplayTime: 3000 // 3 seconds
    },
    
    // Feature flags
    features: {
        dataSubmission: false // Disabled for local dev without API keys
    }
};
