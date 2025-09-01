// Secure frontend script - no sensitive data exposed
const API_BASE = window.location.origin + '/api';

// Minimal client-side data - no sensitive information
let clientState = {
    sessionId: null,
    collectedKeysCount: 0,
    totalKeys: 2,
    targetsFoundCount: 0,
    isCompleted: false,
    isInitialized: false
};

// Initialize secure session
async function initializeSecureSession() {
    try {
        const response = await fetch(`${API_BASE}/session/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to create session');
        
        const data = await response.json();
        clientState.sessionId = data.sessionId;
        clientState.totalKeys = data.requiredKeys.length;
        clientState.isInitialized = true;
        
        // Make session ID globally available for HTML forms
        window.currentSessionId = data.sessionId;
        
        console.log('✅ Secure session initialized');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        showMessage('Failed to connect to server. Please refresh.', '#ff6b6b');
        return false;
    }
}

// Auto-initialize app
async function initializeApp() {
    // Clear any local storage
    localStorage.clear();
    
    // Reset UI
    resetUI();
    
    // Initialize secure session
    const success = await initializeSecureSession();
    
    if (success) {
        // Initialize AR interactions
        initializeARInteractions();
        console.log('🔒 Secure CMKL AR Experience initialized');
    }
}

// Reset UI to initial state
function resetUI() {
    const keysList = document.getElementById('keys-list');
    if (keysList) {
        keysList.innerHTML = '<p style="color: #ccc; font-size: 10px;">Find targets to collect keys!</p>';
    }
    
    const targetsFoundSpan = document.getElementById('targets-found');
    if (targetsFoundSpan) {
        targetsFoundSpan.textContent = '0';
    }
    
    // Reset collect buttons
    const collectButtons = document.querySelectorAll('.collect-button');
    collectButtons.forEach(button => {
        button.style.display = 'none';
        button.classList.remove('show');
        button.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
        
        const targetType = button.getAttribute('data-target');
        if (targetType === 'engineering') {
            button.innerHTML = '🏗️ Collect Engineering Key';
        } else if (targetType === 'science') {
            button.innerHTML = '🔬 Collect Science Lab Key';
        }
    });
    
    const indicator = document.getElementById('target-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Initialize AR interactions
function initializeARInteractions() {
    const scene = document.querySelector('a-scene');
    
    if (scene.hasLoaded) {
        setupClickHandlers();
    } else {
        scene.addEventListener('loaded', setupClickHandlers);
    }
}

// Setup click handlers
function setupClickHandlers() {
    const collectButtons = document.querySelectorAll('.collect-button');
    collectButtons.forEach(button => {
        button.addEventListener('click', function() {
            collectKeySecurely(this);
        });
    });
    
    // Building interactions
    const engineeringBuilding = document.getElementById('engineering-building');
    if (engineeringBuilding) {
        engineeringBuilding.addEventListener('click', () => handleBuildingClick('engineering'));
    }
    
    const scienceLab = document.getElementById('science-lab');
    if (scienceLab) {
        scienceLab.addEventListener('click', () => handleBuildingClick('science'));
    }
    
    // Info box interactions
    const engineeringInfo = document.getElementById('engineering-info');
    if (engineeringInfo) {
        engineeringInfo.addEventListener('click', () => handleInfoClick('engineering'));
    }
    
    const scienceInfo = document.getElementById('science-info');
    if (scienceInfo) {
        scienceInfo.addEventListener('click', () => handleInfoClick('science'));
    }
}

// Secure key collection
async function collectKeySecurely(buttonElement) {
    if (!clientState.sessionId) {
        showMessage('Session not initialized. Please refresh.', '#ff6b6b');
        return;
    }
    
    const keyName = buttonElement.getAttribute('data-key');
    const targetType = buttonElement.getAttribute('data-target');
    
    try {
        const response = await fetch(`${API_BASE}/session/${clientState.sessionId}/collect-key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                keyName,
                targetType,
                method: 'button_press'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            if (error.error === 'Key already collected') {
                showMessage('Key already collected!', '#FF9800');
                return;
            }
            throw new Error(error.error || 'Failed to collect key');
        }
        
        const result = await response.json();
        
        // Update client state with minimal data
        clientState.collectedKeysCount = result.totalCollected;
        clientState.isCompleted = result.isCompleted;
        
        // Hide button with animation
        buttonElement.classList.remove('show');
        buttonElement.style.background = '#4CAF50';
        buttonElement.innerHTML = '✅ Collected!';
        
        setTimeout(() => {
            buttonElement.style.display = 'none';
        }, 2000);
        
        // Update UI
        updateKeysDisplay();
        updateTargetStatus();
        
        // Show success message
        showMessage(result.message, '#4CAF50');
        
        console.log('🔒 Key collected securely');
        
    } catch (error) {
        console.error('❌ Failed to collect key:', error);
        showMessage('Failed to collect key. Please try again.', '#ff6b6b');
    }
}

// Update keys display (minimal info only)
function updateKeysDisplay() {
    const keysList = document.getElementById('keys-list');
    keysList.innerHTML = '';
    
    // Show only progress, not actual keys
    for (let i = 0; i < clientState.collectedKeysCount; i++) {
        const keyDiv = document.createElement('div');
        keyDiv.className = 'key-item';
        keyDiv.textContent = `🔑 Key ${i + 1}`;
        keysList.appendChild(keyDiv);
    }
    
    if (clientState.collectedKeysCount === 0) {
        keysList.innerHTML = '<p style="color: #ccc; font-size: 10px;">Find targets to collect keys!</p>';
    }
    
    // Show progress
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'color: #FFD700; font-size: 10px; margin-top: 5px;';
    progressDiv.textContent = `Progress: ${clientState.collectedKeysCount}/${clientState.totalKeys}`;
    keysList.appendChild(progressDiv);
}

// Update target status
function updateTargetStatus() {
    const targetsFoundSpan = document.getElementById('targets-found');
    if (targetsFoundSpan) {
        targetsFoundSpan.textContent = clientState.targetsFoundCount;
    }
}


// Handle building clicks securely
async function handleBuildingClick(buildingType) {
    const messages = {
        engineering: [
            "🏗️ Welcome to CMKL Engineering!",
            "Our Engineering programs focus on innovation!",
            "State-of-the-art facilities await you!",
            "Build the future with CMKL Engineering!"
        ],
        science: [
            "🔬 Discover CMKL Science Labs!",
            "Advanced research facilities!",
            "Cutting-edge scientific equipment!",
            "Explore the world of science at CMKL!"
        ]
    };
    
    const buildingMessages = messages[buildingType] || [];
    const randomMessage = buildingMessages[Math.floor(Math.random() * buildingMessages.length)];
    showMessage(randomMessage, buildingType === 'engineering' ? '#FF9800' : '#2196F3');
    
    // Record interaction securely on server
    recordInteractionSecurely('building_clicked', { buildingType });
}

// Handle info clicks securely
async function handleInfoClick(infoType) {
    const messages = {
        engineering: [
            "📐 Engineering Building - Where innovation begins!",
            "🏗️ Modern labs and workshops available!",
            "💡 Join our engineering community!"
        ],
        science: [
            "🧪 Science Laboratory - Discover and explore!",
            "🔬 Advanced research opportunities!",
            "⚗️ Hands-on scientific learning!"
        ]
    };
    
    const infoMessages = messages[infoType] || [];
    const randomMessage = infoMessages[Math.floor(Math.random() * infoMessages.length)];
    showMessage(randomMessage, '#9C27B0');
    
    // Record interaction securely on server
    recordInteractionSecurely('info_clicked', { infoType });
}

// Record interaction securely
async function recordInteractionSecurely(type, data) {
    if (!clientState.sessionId) return;
    
    try {
        await fetch(`${API_BASE}/session/${clientState.sessionId}/interaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });
    } catch (error) {
        console.error('Failed to record interaction:', error);
        // Don't show error to user for analytics failures
    }
}

// Show temporary message
function showMessage(text, color = '#333') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${color};
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        z-index: 1000;
        font-size: 18px;
        text-align: center;
        animation: fadeIn 0.5s ease-in;
        max-width: 80%;
        word-wrap: break-word;
    `;
    messageDiv.textContent = text;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
            if (document.body.contains(messageDiv)) {
                document.body.removeChild(messageDiv);
            }
        }, 500);
    }, 3000);
}


// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
`;
document.head.appendChild(style);

// Handle AR target detection
function handleTargetFound(targetIndex) {
    const targetNames = ['Engineering Building', 'Science Laboratory'];
    const targetTypes = ['engineering', 'science'];
    const targetName = targetNames[targetIndex] || 'Unknown Target';
    const targetType = targetTypes[targetIndex];
    
    console.log(`🎯 TARGET FOUND: ${targetName}`);
    
    // Show target detection indicator
    const indicator = document.getElementById('target-indicator');
    indicator.innerHTML = `🎯 ${targetName} detected!`;
    indicator.style.display = 'block';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 3000);
    
    // Show appropriate collect button
    const keyName = targetIndex === 0 ? 'Engineering Access Key' : 'Science Lab Key';
    const buttonId = targetIndex === 0 ? 'collect-engineering-btn' : 'collect-science-btn';
    
    // Hide all buttons first
    const allButtons = document.querySelectorAll('.collect-button');
    allButtons.forEach(btn => {
        btn.classList.remove('show');
        btn.style.display = 'none';
        if (btn.hideTimeout) clearTimeout(btn.hideTimeout);
    });
    
    // Show correct button (server will validate if key already collected)
    const correctButton = document.getElementById(buttonId);
    if (correctButton) {
        correctButton.classList.add('show');
        correctButton.style.display = 'block';
        
        // Auto-hide after timeout
        correctButton.hideTimeout = setTimeout(() => {
            if (correctButton.classList.contains('show')) {
                correctButton.classList.remove('show');
                correctButton.style.display = 'none';
                showMessage('⏰ Collect button timed out - scan target again', '#FF9800');
            }
        }, 60000);
    }
    
    // Record interaction securely
    recordInteractionSecurely('target_detected', {
        targetIndex,
        targetName,
        targetType
    });
    
    // Update local state
    if (!clientState.targetsFound) clientState.targetsFound = [];
    if (!clientState.targetsFound.includes(targetType)) {
        clientState.targetsFound.push(targetType);
        clientState.targetsFoundCount = clientState.targetsFound.length;
        updateTargetStatus();
    }
}

// Handle AR target lost
function handleTargetLost(targetIndex) {
    const targetNames = ['Engineering Building', 'Science Laboratory'];
    const targetName = targetNames[targetIndex] || 'Unknown Target';
    
    console.log(`Target ${targetIndex} (${targetName}) lost`);
    // Keep button visible - user might still want to collect
}

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔒 CMKL Secure AR Experience loading...');
    await initializeApp();
    
    // Set up target detection handlers
    setTimeout(() => {
        const targets = document.querySelectorAll('[mindar-image-target]');
        targets.forEach((target, index) => {
            target.addEventListener('targetFound', () => handleTargetFound(index));
            target.addEventListener('targetLost', () => handleTargetLost(index));
        });
    }, 2000);
});

// Error handling for AR
window.addEventListener('error', function(e) {
    console.error('Error:', e.error);
    showMessage('An error occurred. Please refresh and try again.', '#ff6b6b');
});