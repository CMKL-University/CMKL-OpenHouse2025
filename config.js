// Secure frontend configuration - NO SENSITIVE DATA
// All API keys and sensitive config moved to backend

const config = {
    // API endpoints
    API_BASE: 'http://localhost:3000/api',
    
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
            config.MISSION = serverConfig.mission; // Also set uppercase version for compatibility
            config.features = { ...config.features, ...serverConfig.features };
            console.log('Server config loaded:', serverConfig);
        }
    } catch (error) {
        console.warn('Failed to load server configuration:', error);
        // No fallback - rely on server configuration only
    }
}

// Initialize configuration on page load
document.addEventListener('DOMContentLoaded', loadSecureConfig);

window.APP_CONFIG = config;
