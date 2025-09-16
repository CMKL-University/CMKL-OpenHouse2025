# CMKL OpenHouse 2025 - Complete Code Documentation

This document provides comprehensive documentation for every code file in the CMKL OpenHouse 2025 AR experience application.

## Table of Contents
1. [Server-Side Code](#server-side-code)
2. [Frontend JavaScript](#frontend-javascript)
3. [HTML Pages](#html-pages)
4. [Configuration Files](#configuration-files)
5. [Assets and Models](#assets-and-models)

---

## Server-Side Code

### server.js (Main Server File)

**Location**: Root directory
**Purpose**: Main Express.js server with dual deployment support (local dev + Vercel)
**Lines**: 1,015 total

#### Dependencies and Setup (Lines 1-35)
```javascript
const express = require('express');        // Web framework
const cors = require('cors');              // Cross-origin resource sharing
const path = require('path');              // File path utilities
const crypto = require('crypto');          // Cryptographic functions
const { google } = require('googleapis');  // Google Sheets API
require('dotenv').config();               // Environment variables
```

**Environment Configuration** (Lines 12-35):
- Loads sensitive config from environment variables
- Validates required Google Sheets credentials
- Exits with error if missing required variables
- Required vars: `GOOGLE_SHEETS_ID`, `GOOGLE_PROJECT_ID`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CLIENT_EMAIL`

#### Google Sheets Authentication (Lines 37-57)
**Service Account Setup**:
- Creates credentials object from environment variables
- Configures Google Auth with spreadsheet scope
- Handles authentication errors gracefully
- Falls back to offline mode if configuration fails

#### Security System (Lines 77-200)

**SQL Injection Detection Patterns** (Lines 78-113):
```javascript
const SQL_INJECTION_PATTERNS = [
    // Basic SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    // Common SQL injection techniques
    /(\'|\"|;|--|\/\*|\*\/)/,
    // XSS patterns
    /(<script|<iframe|<object|<embed|javascript:|vbscript:|onload=|onerror=)/i,
    // And 7 more sophisticated patterns...
];
```

**Advanced Threat Detection** (Lines 102-113):
- NoSQL injection patterns (`$where`, `$ne`, `$gt`, etc.)
- Command injection detection (`;`, `|`, `&&`, shell commands)
- Path traversal attacks (`../`, encoded variants)
- LDAP injection patterns

**Security Functions**:
- `detectSQLInjection(input)` (Lines 116-138): Tests input against all patterns
- `validateInputSecurity(fields)` (Lines 141-153): Validates object properties
- `securityMiddleware(req, res, next)` (Lines 156-200): Comprehensive request validation

**Security Middleware Features**:
- IP address tracking and logging
- URL parameter validation
- Query parameter validation
- Request body validation
- Nested object validation (e.g., `req.body.fields`)
- Automatic redirect to `/hacker-detected.html` on threats

#### Session Management System (Lines 202-355)

**Session Creation** (Lines 203-224):
```javascript
function generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex'); // 64-character hex string
}
```

**Session Data Structure**:
```javascript
const sessionData = {
    sessionId,           // Unique crypto-generated ID
    startTime,          // ISO timestamp
    collectedKeys: [],  // Array of collected key names
    targetsFound: [],   // Array of AR targets found
    interactions: [],   // Detailed interaction log
    requiredKeys: ['Engineering Access Key', 'Science Lab Key'],
    isCompleted: false,
    createdAt          // Creation timestamp
};
```

**Key API Endpoints**:
- `POST /api/session/create`: Creates new session with secure ID
- `GET /api/session/:sessionId/validate`: Checks session existence
- `POST /api/session/:sessionId/collect-key`: Records key collection
- `POST /api/session/:sessionId/interaction`: Logs user interactions
- `GET /api/session/:sessionId/progress`: Returns progress stats

#### Google Sheets Integration (Lines 357-507)

**Retry Logic with Exponential Backoff** (Lines 358-380):
```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (error.code === 429 || error.status === 429) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                // Wait: 1s, 2s, 4s for rate limits
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error; // Non-rate-limit errors fail immediately
        }
    }
}
```

**Database Schema** (Google Sheets columns):
- **Column A**: First Name
- **Column B**: Last Name
- **Column C**: Email (primary key)
- **Column D**: Check-in status
- **Column E**: Register Key status
- **Column F**: Project showcase Key status
- **Column G**: Afternoon session Key status
- **Column H**: Redeem Key status (TRUE/FALSE)
- **Column I**: Redeem CODE

**Core Database Functions**:

1. **`findUserByEmail(email)`** (Lines 383-426):
   - Searches entire sheet for matching email
   - Returns user record with row index
   - Case-insensitive email matching
   - Returns empty array if not found

2. **`createUserRecord(fields)`** (Lines 429-473):
   - Appends new user to sheet
   - Auto-sets check-in status to 'checked-in'
   - Returns created record with row index

3. **`updateUserRecord(rowIndex, fields)`** (Lines 477-507):
   - Updates specific row by index
   - Updates all columns A through I
   - Returns updated record data

#### User Management API (Lines 510-882)

**User Registration/Check-in** (Lines 511-611):
- `POST /api/harty/submit` (with security middleware)
- Validates required fields (email, lastname)
- Pre-registration only - blocks new users
- Auto-checks in existing users
- Handles name mismatches with detailed errors

**Key Validation Logic**:
```javascript
// Check if lastname matches existing record
if (existingLastname && existingLastname.toLowerCase() !== fields.lastname.toLowerCase()) {
    return res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_USED',
        message: `This email is already registered with a different name...`
    });
}
```

**Key Management** (Lines 718-825):
- `POST /api/harty/update-key` (with security middleware)
- Maps key fields to spreadsheet columns:
  - `key1 status` → Column E (Register Key)
  - `key2 status` → Column F (Project showcase Key)
  - `key3 status` → Column G (Afternoon session Key)
  - `key4 status` → Column D (Check-in)

**Automatic Redeem Key Logic** (Lines 692-715):
```javascript
async function checkAndUpdateRedeemKey(userRecord) {
    const key1Collected = userRecord.registerKey === 'scanned';
    const key2Collected = userRecord.projectShowcaseKey === 'scanned';
    const key3Collected = userRecord.afternoonSessionKey === 'scanned';

    if (key1Collected && key2Collected && key3Collected && userRecord.redeemKey !== 'TRUE') {
        // Auto-update Redeem Key to TRUE
        await sheets.spreadsheets.values.update({
            spreadsheetId: SERVER_CONFIG.GOOGLE_SHEETS_ID,
            range: `H${userRecord.rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [['TRUE']] }
        });
        return true;
    }
    return false;
}
```

**User Data Retrieval** (Lines 885-977):
- `GET /api/harty/user/:email` (with security middleware)
- Returns user data with key statuses
- Auto-updates redeem key if conditions met
- Maps database columns to frontend key statuses

#### Configuration and Analytics (Lines 979-999)

**Public Configuration** (Lines 980-987):
```javascript
app.get('/api/config', (req, res) => {
    res.json({
        mission: SERVER_CONFIG.MISSION,
        features: {
            dataSubmission: SERVER_CONFIG.MISSION === 'ENABLE'
        }
    });
});
```

**Admin Analytics** (Lines 990-999):
```javascript
app.get('/api/admin/analytics', (req, res) => {
    const analytics = {
        totalSessions: sessions.size,
        completedSessions: Array.from(sessions.values()).filter(s => s.isCompleted).length,
        totalInteractions: Array.from(sessions.values()).reduce((sum, s) => sum + s.interactions.length, 0)
    };
    res.json(analytics);
});
```

#### Deployment Configuration (Lines 1006-1015)

**Dual Deployment Support**:
```javascript
// For Vercel deployment
module.exports = app;

// For local development
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 CMKL OpenHouse secure server running on port ${PORT}`);
        console.log(`📱 Visit: http://localhost:${PORT}`);
    });
}
```

### api/server.js (Vercel Deployment)

**Purpose**: Identical copy of main server.js for Vercel serverless deployment
**Key Differences**:
- Static file serving paths adjusted for Vercel structure
- Same security, API, and database logic
- Configured for serverless function execution

---

## Frontend JavaScript

### config.js (Frontend Configuration)

**Location**: Root directory
**Purpose**: Secure client-side configuration with environment detection
**Lines**: 45 total

#### Environment Detection (Lines 4-8)
```javascript
const config = {
    API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api'
        : '/api',
    // ...
};
```

#### Secure Configuration Loading (Lines 23-39)
```javascript
async function loadSecureConfig() {
    try {
        const response = await fetch(`${config.API_BASE}/config?v=${Date.now()}`);
        if (response.ok) {
            const serverConfig = await response.json();
            config.mission = serverConfig.mission;
            config.features = { ...config.features, ...serverConfig.features };
        }
    } catch (error) {
        console.warn('Failed to load server configuration:', error);
        // No fallback - rely on server configuration only
    }
}
```

**Security Features**:
- No sensitive data in frontend
- Cache-busting with timestamp
- Server-side configuration only
- Graceful fallback handling

### script.js (Main Frontend Logic)

**Location**: Root directory
**Purpose**: Secure session management and API communication
**Key Features**:

#### Secure Session State (Lines 4-12)
```javascript
let clientState = {
    sessionId: null,        // Server-generated secure ID
    collectedKeysCount: 0,  // Count only, no sensitive data
    totalKeys: 2,           // Required keys count
    targetsFoundCount: 0,   // AR targets found
    isCompleted: false,     // Completion status
    isInitialized: false    // Initialization flag
};
```

#### Session Initialization (Lines 15-39)
```javascript
async function initializeSecureSession() {
    try {
        const response = await fetch(`${API_BASE}/session/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();
        clientState.sessionId = data.sessionId;
        clientState.totalKeys = data.requiredKeys.length;
        window.currentSessionId = data.sessionId; // Global access for forms

        return true;
    } catch (error) {
        showMessage('Failed to connect to server. Please refresh.', '#ff6b6b');
        return false;
    }
}
```

**Security Principles**:
- No sensitive data stored client-side
- Server-generated session IDs only
- Secure API communication
- Error handling without data exposure

### global-error-handler.js (Cross-Page Error Handling)

**Location**: Root directory
**Purpose**: Handles email validation errors across page navigation
**Lines**: 44 total

#### Error Storage and Retrieval (Lines 8-30)
```javascript
function handleStoredEmailValidationError() {
    const storedError = sessionStorage.getItem('emailValidationError');
    if (storedError) {
        sessionStorage.removeItem('emailValidationError');

        // Redirect to register.html for email errors
        const currentPath = window.location.pathname;
        if (!currentPath.endsWith('register.html')) {
            window.location.href = 'register.html';
            return;
        }

        // Show error after delay if on register page
        setTimeout(() => {
            if (typeof handleEmailValidationError === 'function') {
                handleEmailValidationError(storedError);
            } else {
                alert('Email Error: ' + storedError); // Fallback
            }
        }, 1000);
    }
}
```

#### Global Error Storage Function (Lines 33-35)
```javascript
window.storeEmailValidationError = function(errorMessage) {
    sessionStorage.setItem('emailValidationError', errorMessage);
};
```

**Features**:
- Cross-page error persistence
- Automatic page redirection
- Graceful fallback handling
- DOM ready state detection

### generate-config.js (Configuration Generator)

**Purpose**: Utility script for generating configuration files
**Usage**: Development and deployment configuration generation

---

## HTML Pages

### index.html (Main Landing Page)

**Location**: Root directory
**Purpose**: Main entry point with animated interface

#### Head Section (Lines 1-12)
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>CMKL Openhouse 2025 - Main</title>
<script src="https://cdn.jsdelivr.net/npm/motion@11.11.13/dist/motion.iife.js"></script>
<script src="config.js?v=20250904"></script>
```

#### Styling Features
- **Fonts**: Darker Grotesque (main), Druk Wide (headings)
- **Background**: Dark theme (#000616) with SVG background
- **Responsive Design**: Mobile-first approach
- **Animations**: Motion.js integration for smooth transitions

#### Key Interactive Elements
- Navigation buttons with hover effects
- Animated background elements
- Mobile-optimized touch interfaces
- Progressive loading with fallbacks

### scanner.html & scanner-auto.html (AR Scanner Pages)

**Purpose**: AR experience interfaces using A-Frame and MindAR

#### AR Dependencies (Lines 4-7)
```html
<script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/donmccurdy/aframe-extras@v7.0.0/dist/aframe-extras.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js"></script>
<script src="https://cdn.jsdelivr.net/npm/motion@11.11.13/dist/motion.iife.js"></script>
```

#### AR Scene Configuration
```html
<a-scene mindar-image="imageTargetSrc: model/registration.mind; maxTrack: 1; uiScanning: #scanning; uiLoading: #loading; uiError: #error"
         color-space="sRGB"
         renderer="colorManagement: true, physicallyCorrectLights"
         vr-mode-ui="enabled: false"
         device-orientation-permission-ui="enabled: false">
```

**AR Features**:
- Image target tracking with .mind files
- 3D model rendering (GLTF format)
- Real-time camera feed
- Touch interaction handling
- Error state management

#### Status Overlay System (Lines 16-31)
```css
.status-overlay {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 6, 22, 0.9);
    border-radius: 8px;
    padding: 10px 15px;
    backdrop-filter: blur(10px);
    z-index: 1000;
}
```

### register.html (User Registration)

**Purpose**: User registration and check-in interface

#### Form Structure
```html
<form id="registrationForm" class="registration-form">
    <input type="email" id="email" name="email" placeholder="Email" required>
    <input type="text" id="lastname" name="lastname" placeholder="Last Name" required>
    <button type="submit">Register / Check In</button>
</form>
```

#### Security Features
- Input validation on client and server
- HTTPS enforcement for production
- XSS protection via content security policy
- Secure form submission with CSRF protection

#### JavaScript Integration
- Real-time validation feedback
- Secure API communication
- Error handling with user-friendly messages
- Session management integration

### success.html (Success Confirmation)

**Purpose**: Confirmation page after successful operations
**Features**:
- Success message display
- Navigation back to main interface
- Session persistence
- Analytics tracking

### hacker-detected.html (Security Violation Page)

**Purpose**: Displayed when malicious input is detected
**Triggered by**: Security middleware in server.js (lines 156-200)
**Features**:
- Warning message display
- IP logging on server side
- No sensitive information exposure
- Return navigation options

### Event-Specific Pages

#### key2.html & key4.html
**Purpose**: Key-specific information and interactions
**Features**:
- Key collection interfaces
- AR model integration
- Progress tracking
- Session state management

#### page2.html & september20.html
**Purpose**: Event-specific content and schedules
**Features**:
- Event information display
- Navigation integration
- Responsive design
- Interactive elements

---

## Configuration Files

### package.json (Node.js Configuration)

**Location**: Root directory
**Purpose**: Project dependencies and scripts

#### Project Metadata (Lines 1-8)
```json
{
  "name": "cmkl-openhouse-secure",
  "version": "1.0.0",
  "description": "Secure CMKL OpenHouse 2025 AR Experience",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

#### Dependencies (Lines 10-16)
```json
"dependencies": {
  "airtable": "^0.12.2",      // Alternative data storage
  "cors": "^2.8.5",           // Cross-origin requests
  "dotenv": "^16.3.1",        // Environment variables
  "express": "^4.18.2",       // Web framework
  "googleapis": "^159.0.0",   // Google Sheets API
  "node-fetch": "^2.7.0"      // HTTP client
}
```

#### Development Dependencies (Lines 18-20)
```json
"devDependencies": {
  "nodemon": "^3.0.1"         // Auto-restart development server
}
```

### .env.example (Environment Template)

**Location**: Root directory
**Purpose**: Template for environment configuration

#### Configuration Structure (Lines 1-19)
```bash
# Mission control
MISSION=ENABLE

# Airtable Configuration (Legacy)
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=appBWW2jchcr1OW3Q
AIRTABLE_TABLE_NAME=Table 1

# Server Configuration
PORT=3000
```

**Note**: Actual implementation uses Google Sheets instead of Airtable

### vercel.json (Vercel Deployment Configuration)

**Location**: Root directory
**Purpose**: Vercel platform deployment settings

#### Function Configuration (Lines 2-6)
```json
"functions": {
  "api/server.js": {
    "maxDuration": 30    // 30-second timeout for serverless functions
  }
}
```

#### URL Rewrites (Lines 7-12)
```json
"rewrites": [
  {
    "source": "/api/(.*)",
    "destination": "/api/server.js"   // Route all API calls to serverless function
  }
]
```

#### CORS Headers for AR Models (Lines 13-52)
```json
"headers": [
  {
    "source": "/(.*).gltf",
    "headers": [
      { "key": "Content-Type", "value": "model/gltf+json" },
      { "key": "Access-Control-Allow-Origin", "value": "*" }
    ]
  },
  {
    "source": "/(.*).bin",
    "headers": [
      { "key": "Content-Type", "value": "application/octet-stream" },
      { "key": "Access-Control-Allow-Origin", "value": "*" }
    ]
  },
  {
    "source": "/(.*).mind",
    "headers": [
      { "key": "Content-Type", "value": "application/octet-stream" },
      { "key": "Access-Control-Allow-Origin", "value": "*" }
    ]
  }
]
```

**CORS Configuration Purpose**:
- Enables AR model loading from CDN
- Supports GLTF 3D models and binary assets
- Allows MindAR .mind tracking files
- Required for cross-origin AR functionality

---

## Assets and Models

### 3D Models Directory (/model/)

#### GLTF Models
- **key1.glb**: Primary AR key model (binary GLTF format)
- **key_1_3.gltf**: Alternative key model (JSON GLTF format)
- **magic_key/**: Complex key model with textures
  - `scene.gltf`: Main model file
  - `scene.bin`: Binary geometry data
  - `textures/`: PBR texture maps
    - `Material.001_baseColor.jpeg`: Diffuse color map
    - `Material.001_emissive.jpeg`: Emission map
    - `Material.001_metallicRoughness.png`: Material properties
    - `Material.001_normal.jpeg`: Normal map for surface detail

#### AR Tracking Files
- **registration.mind**: MindAR image tracking data
  - Binary format containing feature points
  - Used for AR target recognition
  - Optimized for mobile performance

#### 3D Scene Files
- **low_poly_cityscape.spline**: Spline 3D scene file
- **sep20/**: Event-specific 3D assets
  - `Tent.blend`: Blender scene file
  - `tent_v1.obj/.mtl`: OBJ model with materials

### SVG Graphics Directory (/svg/)

#### UI Graphics
- **Group 25-33.svg**: UI component graphics
- **key1.svg, key2.svg, key3.svg**: Key icon graphics
- **unknow.svg**: Unknown/placeholder graphic
- **background.svg**: Main background graphic

**SVG Advantages**:
- Vector scalability for all screen sizes
- Small file sizes for fast loading
- CSS animation compatibility
- Retina display optimization

### CSS Styling

#### Font Integration
```css
@import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Druk+Wide:wght@400;700&display=swap');
```

#### Color Scheme
- **Primary Background**: #000616 (Dark navy)
- **Primary Text**: #6be4f0 (Cyan blue)
- **AR UI**: #00ff41 (Matrix green)
- **Accent Colors**: Various gradients and overlays

#### Responsive Design Patterns
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #000616 url('svg/background.svg') no-repeat center center fixed;
    background-size: cover;
    font-family: 'Darker Grotesque', sans-serif;
    height: 100vh;
    overflow: hidden;
}
```

---

## Security Implementation Details

### Input Validation Pipeline

1. **Client-Side Validation**: Basic format checking
2. **Security Middleware**: Comprehensive pattern detection
3. **API Validation**: Business logic validation
4. **Database Validation**: Final data integrity checks

### Threat Detection Patterns

#### SQL Injection Prevention
```javascript
// Detects: SELECT, INSERT, UPDATE, DELETE, etc.
/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i

// Detects: Quotes, semicolons, SQL comments
/(\'|\"|;|--|\/\*|\*\/)/

// Detects: Union-based attacks
/(UNION\s+(ALL\s+)?SELECT)/i
```

#### XSS Prevention
```javascript
// Detects: Script tags, iframes, event handlers
/(<script|<iframe|<object|<embed|javascript:|vbscript:|onload=|onerror=)/i
```

#### NoSQL Injection Prevention
```javascript
// Detects: MongoDB operators
/(\$where|\$ne|\$gt|\$lt|\$regex)/i
```

#### Command Injection Prevention
```javascript
// Detects: Shell commands and operators
/(;|\||\&\&|ls\s|cat\s|pwd|whoami|id\s)/
```

### Session Security

#### Secure ID Generation
```javascript
function generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex'); // 256-bit entropy
}
```

#### Session Storage
- Server-side only (Express sessions Map)
- No client-side sensitive data
- Automatic cleanup on server restart
- Crypto-based session identification

---

## API Communication Patterns

### Request/Response Flow

1. **Client Request**: Secure HTTPS with validation
2. **Security Middleware**: Input validation and threat detection
3. **Business Logic**: Core application functionality
4. **Database Operation**: Google Sheets API with retry logic
5. **Response**: Minimal data exposure with error handling

### Error Handling Strategy

#### Client-Side Errors
- User-friendly messages
- No sensitive information exposure
- Graceful degradation
- Retry mechanisms for network issues

#### Server-Side Errors
- Detailed logging with IP tracking
- Generic error responses to clients
- Security incident recording
- Automatic threat response (redirect to hacker-detected.html)

---

## Performance Optimizations

### Frontend Optimizations
- CDN-based library loading
- Lazy loading for AR models
- Cache-busting for configuration
- Minified production assets

### Backend Optimizations
- Google Sheets API rate limiting
- Exponential backoff retry logic
- In-memory session storage
- Efficient database queries

### AR Performance
- Optimized .mind tracking files
- Compressed GLTF models
- Progressive model loading
- Mobile-optimized rendering

---

This comprehensive documentation covers every aspect of the CMKL OpenHouse 2025 codebase, from low-level security patterns to high-level architecture decisions. Each code file and its functionality has been thoroughly documented with specific line references and implementation details.