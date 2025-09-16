# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- Start server: `node server.js` (runs on port 3000)
- For root directory server: `node server.js`
- For API subdirectory: `cd api && node server.js`
- Install dependencies: `npm install`
- Development with auto-restart: `npm run dev` (uses nodemon)

**Testing & Building:**
- No specific test commands configured - manual testing required
- No build process - serves static files directly

**Note:** The project has dual deployment architecture - root server.js for local development and api/server.js for Vercel deployment.

## Architecture Overview

This is a secure CMKL OpenHouse 2025 AR experience web application with the following key components:

### Core Structure
- **Dual Server Setup**:
  - Root `server.js` for local development
  - `api/server.js` for Vercel serverless deployment
  - Both use identical code with conditional module exports (server.js:1006-1014)
- **Static File Serving**: HTML, CSS, JS, and AR models served directly
- **Frontend Configuration**: Client-side config loaded securely from server endpoints

### Security Architecture
- **Comprehensive Input Validation**: Multi-layer security with SQL injection, XSS, NoSQL injection, command injection, path traversal, and LDAP injection detection patterns (server.js:78-113)
- **Security Middleware**: Applied to all sensitive endpoints with IP tracking and automatic redirect to `/hacker-detected.html` on malicious input (server.js:156-200)
- **Attack Detection**: Real-time threat monitoring with detailed logging
- **Session Security**: Crypto-based 64-character secure session IDs using `crypto.randomBytes(32)` (server.js:73-75)
- **Pre-registration Only**: System blocks new user registration, only pre-registered users allowed (server.js:579-587)

### Data Integration & Storage
- **Google Sheets API**: Primary data storage using service account authentication with rate limiting
- **Exponential Backoff**: Automatic retry logic for API rate limits with delays up to 8 seconds (server.js:358-380)
- **Environment-based Config**: All sensitive configuration loaded from environment variables
- **Spreadsheet Schema**: 9-column layout (A=First Name, B=Last Name, C=Email, D=Check-in, E=Register Key, F=Project showcase Key, G=Afternoon session Key, H=Redeem Key, I=CODE) (server.js:393)

### Key Systems
1. **AR Session Management**: Secure game sessions with key collection tracking, completion detection, and interaction logging
2. **User Registration & Check-in**: Pre-registered users only with automatic check-in functionality
3. **Four-Key Collection System**:
   - Key 1: Register Key (Column E)
   - Key 2: Project showcase Key (Column F)
   - Key 3: Afternoon session Key (Column G)
   - Key 4: Check-in Key (Column D)
4. **Automatic Redeem Unlock**: When keys 1, 2, and 3 are collected, automatically enables redeem functionality (server.js:692-715)
5. **Analytics & Monitoring**: Admin endpoint for session analytics and user interaction tracking

### API Endpoints
**Session Management:**
- `POST /api/session/create` - Create new AR game session
- `GET /api/session/:sessionId/validate` - Validate session existence
- `POST /api/session/:sessionId/collect-key` - Collect AR key
- `POST /api/session/:sessionId/interaction` - Record user interaction
- `GET /api/session/:sessionId/progress` - Get session progress

**User Data Operations:**
- `POST /api/harty/submit` - User registration/check-in (with security middleware)
- `POST /api/harty/update` - Update user record (with security middleware)
- `POST /api/harty/update-key` - Update specific key status (with security middleware)
- `POST /api/harty/save-redeem-code` - Save redeem code to user record (with security middleware)
- `GET /api/harty/user/:email` - Get user data and key statuses (with security middleware)

**Configuration & Analytics:**
- `GET /api/config` - Public configuration (safe values only)
- `GET /api/admin/analytics` - Analytics (needs authentication in production)

### Frontend Architecture
**Core Pages:**
- `index.html` - Main landing page with motion animations
- `scanner.html`/`scanner-auto.html` - AR scanner interfaces using A-Frame and MindAR
- `register.html` - User registration form
- `hacker-detected.html` - Security violation page
- `success.html` - Success confirmation
- `key2.html`, `key4.html` - Key-specific pages
- `page2.html`, `september20.html` - Event-specific pages

**JavaScript Architecture:**
- `config.js` - Secure frontend configuration with auto-environment detection
- `script.js` - Main frontend logic with secure session management
- `global-error-handler.js` - Cross-page email validation error handling
- `generate-config.js` - Configuration generation utility

**AR & 3D Models:**
- A-Frame + MindAR integration for AR experiences
- GLTF models in `/model/` directory including keys and 3D assets
- `.mind` files for AR target tracking
- Proper CORS headers configured for model serving (vercel.json:13-52)

### Environment Configuration
**Required Environment Variables:**
- `MISSION=ENABLE` - Enables data submission and key operations
- `GOOGLE_SHEETS_ID` - Target Google Sheets spreadsheet ID
- `GOOGLE_PROJECT_ID` - Google Cloud service account project ID
- `GOOGLE_PRIVATE_KEY` - Service account private key (newlines properly escaped)
- `GOOGLE_CLIENT_EMAIL` - Service account email address
- `GOOGLE_CLIENT_ID` - Service account client ID

**Configuration File:**
- Copy `.env.example` to `.env` and configure with actual values
- Server validates all required variables on startup (server.js:22-35)

### Deployment Architecture
**Local Development:**
- Use root `server.js` with `node server.js` or `npm run dev`
- Serves static files from root directory
- Full Google Sheets integration with environment variables

**Vercel Production:**
- Uses `api/server.js` as serverless function
- Configured via `vercel.json` with proper redirects and headers
- Static assets served directly by Vercel CDN
- Supports AR model files with correct MIME types

**Dependencies:**
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `googleapis` - Google Sheets API integration
- `dotenv` - Environment variable loading
- `airtable` - Alternative data storage (legacy)
- `node-fetch` - HTTP client

### Security Policies
The application enforces strict security policies:
- Only pre-registered users can access the system
- All user input validated against injection attacks
- Automatic attack detection with IP logging
- Secure session management with crypto-based IDs
- Rate limiting with exponential backoff
- No sensitive data exposed to frontend
- Environment-based configuration only