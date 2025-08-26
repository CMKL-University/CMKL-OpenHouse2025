// Simple key collection system - no external submissions

// User data management
let userData = {
    collectedKeys: [],
    startTime: new Date().toISOString(),
    interactions: [],
    targetsFound: [],
    requiredKeys: ['Engineering Access Key', 'Science Lab Key'],
    sessionId: generateSessionId()
};

// Generate unique session ID
function generateSessionId() {
    return 'cmkl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Auto-initialize app
function initializeApp() {
    // Clear all saved data on app initialization (fresh start each time)
    clearAllSavedData();
    
    // Initialize AR interactions
    initializeARInteractions();
    
    console.log('CMKL AR Experience initialized (fresh session):', userData);
}

// Clear all saved data (called on every page load/refresh)
function clearAllSavedData() {
    // Clear localStorage completely
    localStorage.removeItem('cmkl_openhouse_data');
    
    // Reset userData to initial state
    userData = {
        collectedKeys: [],
        startTime: new Date().toISOString(),
        interactions: [],
        targetsFound: [],
        requiredKeys: ['Engineering Access Key', 'Science Lab Key'],
        sessionId: generateSessionId()
    };
    
    // Reset UI elements
    resetUI();
    
    console.log('All data cleared - fresh session started');
}

// Reset UI to initial state
function resetUI() {
    // Reset keys display
    const keysList = document.getElementById('keys-list');
    if (keysList) {
        keysList.innerHTML = '<p style="color: #ccc; font-size: 10px;">Find targets to collect keys!</p>';
    }
    
    // Reset target counter
    const targetsFoundSpan = document.getElementById('targets-found');
    if (targetsFoundSpan) {
        targetsFoundSpan.textContent = '0';
    }
    
    // Show all collect buttons (in case any were hidden)
    const collectButtons = document.querySelectorAll('.collect-button');
    collectButtons.forEach(button => {
        button.style.display = 'none'; // Start hidden, show when target detected
        button.classList.remove('show');
        button.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
        
        // Reset button text
        const targetType = button.getAttribute('data-target');
        if (targetType === 'engineering') {
            button.innerHTML = '🏗️ Collect Engineering Key';
        } else if (targetType === 'science') {
            button.innerHTML = '🔬 Collect Science Lab Key';
        }
    });
    
    // Hide target detection indicator
    const indicator = document.getElementById('target-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Initialize AR interactions
function initializeARInteractions() {
    // Wait for A-Frame to be ready
    const scene = document.querySelector('a-scene');
    
    if (scene.hasLoaded) {
        setupClickHandlers();
    } else {
        scene.addEventListener('loaded', setupClickHandlers);
    }
}

// Setup click handlers for AR objects and buttons
function setupClickHandlers() {
    // Setup collect button handlers
    const collectButtons = document.querySelectorAll('.collect-button');
    collectButtons.forEach(button => {
        button.addEventListener('click', function() {
            collectKeyFromButton(this);
        });
    });
    
    // Building model interactions
    const engineeringBuilding = document.getElementById('engineering-building');
    if (engineeringBuilding) {
        engineeringBuilding.addEventListener('click', function() {
            showBuildingMessage('engineering');
        });
    }
    
    const scienceLab = document.getElementById('science-lab');
    if (scienceLab) {
        scienceLab.addEventListener('click', function() {
            showBuildingMessage('science');
        });
    }
    
    // Info box interactions
    const engineeringInfo = document.getElementById('engineering-info');
    if (engineeringInfo) {
        engineeringInfo.addEventListener('click', function() {
            showInfoMessage('engineering');
        });
    }
    
    const scienceInfo = document.getElementById('science-info');
    if (scienceInfo) {
        scienceInfo.addEventListener('click', function() {
            showInfoMessage('science');
        });
    }
}

// Collect a key from button press
function collectKeyFromButton(buttonElement) {
    const keyName = buttonElement.getAttribute('data-key');
    const targetType = buttonElement.getAttribute('data-target');
    
    if (!userData.collectedKeys.includes(keyName)) {
        userData.collectedKeys.push(keyName);
        
        // Track which target was found
        if (!userData.targetsFound.includes(targetType)) {
            userData.targetsFound.push(targetType);
        }
        
        // Record interaction
        userData.interactions.push({
            type: 'key_collected',
            keyName: keyName,
            targetType: targetType,
            method: 'button_press',
            timestamp: new Date().toISOString()
        });
        
        // Hide the collect button
        buttonElement.classList.remove('show');
        
        // Visual feedback - animate button
        buttonElement.style.background = '#4CAF50';
        buttonElement.innerHTML = '✅ Collected!';
        
        setTimeout(() => {
            buttonElement.style.display = 'none';
        }, 2000);
        
        // Update UI
        updateKeysDisplay();
        updateTargetStatus();
        
        // Check if all required keys collected
        checkGameCompletion();
        
        // Save locally only
        autoSaveData();
        
        // Show success message
        showMessage(`🎉 Collected: ${keyName}!`, '#4CAF50');
        
        console.log('Key collected via button:', keyName, 'from target:', targetType);
    }
}

// Update keys display
function updateKeysDisplay() {
    const keysList = document.getElementById('keys-list');
    keysList.innerHTML = '';
    
    userData.collectedKeys.forEach(keyName => {
        const keyDiv = document.createElement('div');
        keyDiv.className = 'key-item';
        keyDiv.textContent = keyName;
        keysList.appendChild(keyDiv);
    });
    
    if (userData.collectedKeys.length === 0) {
        keysList.innerHTML = '<p style="color: #ccc; font-size: 10px;">Find targets to collect keys!</p>';
    }
    
    // Show progress
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'color: #FFD700; font-size: 10px; margin-top: 5px;';
    progressDiv.textContent = `Progress: ${userData.collectedKeys.length}/${userData.requiredKeys.length}`;
    keysList.appendChild(progressDiv);
}

// Update target status
function updateTargetStatus() {
    const targetsFoundSpan = document.getElementById('targets-found');
    if (targetsFoundSpan) {
        targetsFoundSpan.textContent = userData.targetsFound.length;
    }
}

// Check game completion
function checkGameCompletion() {
    const hasAllKeys = userData.requiredKeys.every(key => userData.collectedKeys.includes(key));
    
    if (hasAllKeys) {
        setTimeout(() => {
            showMessage('🎉 Congratulations! You found all CMKL facilities and collected both keys! Welcome to CMKL University Openhouse 2025!', '#4CAF50');
            
            // Record completion
            userData.interactions.push({
                type: 'game_completed',
                completionTime: new Date().toISOString(),
                timeTaken: new Date() - new Date(userData.startTime)
            });
            
            // Save locally only
            autoSaveData();
        }, 1500);
    }
}

// Show building message
function showBuildingMessage(buildingType) {
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
    
    // Record interaction
    userData.interactions.push({
        type: 'building_clicked',
        buildingType: buildingType,
        message: randomMessage,
        timestamp: new Date().toISOString()
    });
}

// Show info message
function showInfoMessage(infoType) {
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
    
    // Record interaction
    userData.interactions.push({
        type: 'info_clicked',
        infoType: infoType,
        message: randomMessage,
        timestamp: new Date().toISOString()
    });
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

// Simple local data saving - no external submissions
function autoSaveData() {
    const dataToSave = {
        ...userData,
        lastSaved: new Date().toISOString(),
        totalKeys: userData.collectedKeys.length,
        sessionDuration: new Date() - new Date(userData.startTime),
        targetsFound: userData.targetsFound,
        requiredKeys: userData.requiredKeys
    };
    
    // Save to localStorage only
    localStorage.setItem('cmkl_openhouse_data', JSON.stringify(dataToSave));
    console.log('💾 Data saved locally:', dataToSave);
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
    
    console.log(`🎯 TARGET FOUND: ${targetName} (Index: ${targetIndex})`);
    
    // Show target detection indicator
    const indicator = document.getElementById('target-indicator');
    indicator.innerHTML = `🎯 ${targetName} detected!`;
    indicator.style.display = 'block';
    
    setTimeout(() => {
        indicator.style.display = 'none';
    }, 3000);
    
    // First, hide ALL buttons to prevent wrong button showing
    const allButtons = document.querySelectorAll('.collect-button');
    allButtons.forEach(btn => {
        btn.classList.remove('show');
        btn.style.display = 'none';
        if (btn.hideTimeout) {
            clearTimeout(btn.hideTimeout);
        }
    });
    
    // Show appropriate collect button if key not already collected
    const keyName = targetIndex === 0 ? 'Engineering Access Key' : 'Science Lab Key';
    const buttonId = targetIndex === 0 ? 'collect-engineering-btn' : 'collect-science-btn';
    
    console.log(`🎯 Target ${targetIndex} → Key: ${keyName} → Button: ${buttonId}`);
    console.log(`Already collected keys:`, userData.collectedKeys);
    
    if (!userData.collectedKeys.includes(keyName)) {
        const correctButton = document.getElementById(buttonId);
        console.log(`Button element found:`, correctButton);
        
        if (correctButton) {
            correctButton.classList.add('show');
            correctButton.style.display = 'block'; // Force show
            console.log(`✅ CORRECT BUTTON NOW VISIBLE: ${buttonId}`);
            
            // Hide button after 60 seconds if not clicked
            correctButton.hideTimeout = setTimeout(() => {
                if (correctButton.classList.contains('show') && !userData.collectedKeys.includes(keyName)) {
                    correctButton.classList.remove('show');
                    correctButton.style.display = 'none';
                    showMessage('⏰ Collect button timed out - scan target again to collect key', '#FF9800');
                }
            }, 60000); // 1 minute
        } else {
            console.error(`❌ Button not found: ${buttonId}`);
        }
    } else {
        console.log(`Key already collected: ${keyName}`);
    }
    
    // Record target detection
    userData.interactions.push({
        type: 'target_detected',
        targetIndex: targetIndex,
        targetName: targetName,
        targetType: targetType,
        timestamp: new Date().toISOString()
    });
}

// Handle AR target lost
function handleTargetLost(targetIndex) {
    const targetNames = ['Engineering Building', 'Science Laboratory'];
    const targetName = targetNames[targetIndex] || 'Unknown Target';
    
    console.log(`Target ${targetIndex} (${targetName}) lost`);
    
    // Keep button visible even when target is lost - user might want to collect
    // Button will only disappear after timeout or when key is collected
}

// Debug function - removed auto-showing buttons

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('CMKL University Multi-Target AR Experience loaded - Fresh Session');
    initializeApp();
    
    // Buttons will only show when targets are detected
    
    // Auto-save data locally every 30 seconds
    setInterval(autoSaveData, 30000);
    
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