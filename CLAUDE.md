# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- Start server: `node server.js` (runs on port 3000)
- For root directory server: `node server.js`
- For API subdirectory: `cd api && node server.js`

**Note:** The project has dual deployment architecture - root server.js for local development and api/server.js for Vercel deployment.

## Architecture Overview

This is a secure CMKL OpenHouse 2025 AR experience web application with the following key components:

### Core Structure
- **Dual Server Setup**: 
  - Root `server.js` for local development 
  - `api/server.js` for Vercel serverless deployment
  - Both use identical code with conditional module exports

### Security Features
- **Input Validation**: Comprehensive SQL injection, XSS, and malicious pattern detection
- **Security Middleware**: Applied to all sensitive endpoints
- **Attack Detection**: Redirects to `/hacker-detected.html` on malicious input
- **Session Security**: Crypto-based secure session IDs

### Data Integration
- **Google Sheets API**: Primary data storage using service account authentication
- **Environment Variables**: All sensitive configuration in `.env`
- **Rate Limiting**: Exponential backoff retry logic for API calls

### Key Systems
1. **Session Management**: AR game sessions with key collection tracking
2. **User Registration**: Pre-registered users only, with check-in functionality  
3. **Key Tracking**: Four types of keys (Register, Project showcase, Afternoon session, Check-in)
4. **Analytics**: Admin endpoint for session analytics

### API Endpoints
- `/api/session/*` - Session management for AR game
- `/api/harty/*` - User data operations (submit, update, user lookup)
- `/api/config` - Public configuration
- `/api/admin/analytics` - Analytics (needs authentication in production)

### Frontend Pages
- `index.html` - Main landing page
- `scanner.html`/`scanner-auto.html` - AR scanner interfaces
- `register.html` - User registration
- `hacker-detected.html` - Security violation page
- `success.html` - Success confirmation
- Various event-specific pages

### Environment Requirements
Required environment variables:
- `MISSION=ENABLE` (enables data submission)
- `GOOGLE_SHEETS_ID` - Target spreadsheet ID
- `GOOGLE_PROJECT_ID` - Google service account project
- `GOOGLE_PRIVATE_KEY` - Service account private key  
- `GOOGLE_CLIENT_EMAIL` - Service account email
- `GOOGLE_CLIENT_ID` - Service account client ID

### Deployment
- **Local**: Use root `server.js` 
- **Vercel**: Uses `api/server.js` with serverless functions
- **Static Assets**: HTML, JS, CSS served directly
- **Dependencies**: Express, CORS, googleapis, crypto

The application enforces strict security policies and only allows pre-registered users to access the system.