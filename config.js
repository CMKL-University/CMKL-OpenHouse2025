// Secure frontend configuration - NO SENSITIVE DATA
// All API keys and sensitive config moved to backend

const config = {
    // API endpoints
    API_BASE: window.location.origin + '/api',
    
    // Feature flags (loaded from server)
    features: {
        dataSubmission: false // Will be loaded from server
    },
    
    // UI configuration
    ui: {
        targetTimeout: 60000, // 1 minute
        messageDisplayTime: 3000 // 3 seconds
    }
};

// Load secure configuration from server
async function loadSecureConfig() {
    try {
        const response = await fetch(`${config.API_BASE}/config`);
        if (response.ok) {
            const serverConfig = await response.json();
            config.mission = serverConfig.mission;
            config.features = { ...config.features, ...serverConfig.features };
        }
    } catch (error) {
        console.warn('Failed to load server configuration:', error);
    }
}

// Initialize configuration on page load
document.addEventListener('DOMContentLoaded', loadSecureConfig);

window.APP_CONFIG = config;
