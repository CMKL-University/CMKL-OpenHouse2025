# CMKL OpenHouse 2025 - Backend API Documentation

## Overview

The CMKL OpenHouse 2025 backend provides secure API endpoints for user registration, key tracking, and Airtable integration. The system uses native Node.js HTTPS requests for reliable Airtable connectivity and enforces environment-based configuration.

## Architecture

```
CMKLOpenHouse2025/
├── api/
│   ├── server.js          # Main API server with native HTTPS Airtable integration
│   ├── package.json       # API dependencies
│   └── .env.example       # API environment template
├── server.js              # Legacy server (for local development only)
├── config.js              # Frontend configuration with auto-detection
├── vercel.json            # Vercel deployment configuration
└── .env                   # Environment variables
```

## API Server (`api/server.js`)

### Features
- **Native HTTPS Airtable Integration**: Uses Node.js HTTPS module for reliable API calls
- **Timeout Handling**: 15-second timeout with proper error handling
- **Rate Limiting**: Follows Airtable rate limits with exponential backoff
- **Email Locking**: Prevents race conditions during registration
- **Environment Validation**: Enforces required configuration on startup

### Key Components

#### Airtable Configuration
```javascript
const AIRTABLE_CONFIG = {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    tableName: process.env.AIRTABLE_TABLE_NAME || 'Table 1',
    baseUrl: 'https://api.airtable.com/v0'
};
```

#### Native HTTPS Request Handler
```javascript
async function airtableRequest(url, options = {}) {
    // Uses Node.js HTTPS module with 15-second timeout
    // Proper error handling for network issues
    // JSON response parsing with validation
}
```

#### Rate Limiting with Retry Logic
```javascript
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    // Handles Airtable rate limits (429 errors)
    // 30-second wait for rate limit errors
    // Exponential backoff for other errors
}
```

#### Email Locking System
```javascript
async function withEmailLock(email, fn) {
    // Prevents duplicate registrations during concurrent requests
    // In-memory lock with automatic cleanup
}
```

## API Endpoints

### Configuration Endpoint
**GET** `/api/config`

Returns frontend configuration without sensitive data.

**Response:**
```json
{
    "mission": "ENABLE",
    "features": {
        "dataSubmission": true
    },
    "ui": {
        "targetTimeout": 60000,
        "messageDisplayTime": 3000
    }
}
```

### User Registration
**POST** `/api/airtable/submit`

Registers a new user or returns existing user data.

**Request:**
```json
{
    "fields": {
        "email": "user@example.com",
        "lastname": "Smith"
    }
}
```

**Response (New User):**
```json
{
    "success": true,
    "recordId": "recXXXXXXXXXXXXXX",
    "message": "User record created successfully",
    "fields": {
        "email": "user@example.com",
        "lastname": "Smith",
        "key1 status": "not_scanned",
        "key2 status": "not_scanned",
        "key3 status": "not_scanned"
    }
}
```

**Response (Existing User):**
```json
{
    "success": true,
    "recordId": "recXXXXXXXXXXXXXX",
    "existing": true,
    "message": "Welcome back! Using your existing account.",
    "fields": {
        "email": "user@example.com",
        "lastname": "Smith",
        "key1 status": "scanned",
        "key2 status": "not_scanned",
        "key3 status": "not_scanned"
    }
}
```

**Error Response (Email Conflict):**
```json
{
    "success": false,
    "error": "EMAIL_ALREADY_USED",
    "message": "This email is already registered with a different name. Please use a different email."
}
```

### Key Status Update
**POST** `/api/airtable/update-key`

Updates the scan status of a specific key for a user.

**Request:**
```json
{
    "recordId": "recXXXXXXXXXXXXXX",
    "keyField": "key1 status",
    "status": "scanned"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Key status updated successfully",
    "data": {
        "email": "user@example.com",
        "lastname": "Smith",
        "key1 status": "scanned",
        "key2 status": "not_scanned",
        "key3 status": "not_scanned"
    }
}
```

### Health Check
**GET** `/api/health`

Returns server health status.

**Response:**
```json
{
    "status": "healthy",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "environment": "production"
}
```

## Environment Configuration

### Required Variables
Create `.env` file in the root directory:

```bash
# Mission Control (ENABLE/DISABLE)
MISSION=ENABLE

# Airtable Configuration
AIRTABLE_API_KEY=patXXXXXXXXXXXXX.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Table 1

# Server Configuration
PORT=3000
```

### Environment Validation
The server validates required environment variables on startup:
- Missing `AIRTABLE_API_KEY` → Server exits with error
- Missing `AIRTABLE_BASE_ID` → Server exits with error
- Missing `MISSION` → Uses `undefined` (no hardcoded fallbacks)

## Error Handling

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (missing required fields)
- **401**: Unauthorized (invalid API key)
- **409**: Conflict (email already used with different name)
- **422**: Unprocessable Entity (invalid data format)
- **429**: Too Many Requests (rate limit exceeded)
- **503**: Service Unavailable (Airtable not configured)
- **500**: Internal Server Error

### Error Response Format
```json
{
    "success": false,
    "error": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional debug info (development only)"
}
```

### Network Error Handling
- **ETIMEDOUT**: Connection timeout (15 seconds)
- **ENOTFOUND**: DNS resolution failure
- **Network errors**: Automatic retry with exponential backoff

## Deployment

### Vercel Configuration
**vercel.json:**
```json
{
    "version": 2,
    "builds": [
        {
            "src": "api/server.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/api/(.*)",
            "dest": "/api/server.js"
        }
    ],
    "env": {
        "NODE_ENV": "production"
    }
}
```

### Environment Variables on Vercel
Set these in your Vercel dashboard → Project Settings → Environment Variables:

- `MISSION=ENABLE`
- `AIRTABLE_API_KEY=your_api_key_here`
- `AIRTABLE_BASE_ID=your_base_id_here`
- `AIRTABLE_TABLE_NAME=Table 1`

### Frontend Configuration
The frontend automatically detects the environment:

```javascript
// config.js
const config = {
    API_BASE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api'  // Local development
        : '/api'                       // Production (Vercel)
};
```

## Local Development

### Setup
```bash
# Install dependencies
cd api
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your Airtable credentials
nano .env

# Start the server
npm run dev
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# Configuration
curl http://localhost:3000/api/config

# User registration
curl -X POST http://localhost:3000/api/airtable/submit \
  -H "Content-Type: application/json" \
  -d '{"fields":{"email":"test@example.com","lastname":"Test"}}'
```

## Airtable Schema

### Table Structure
**Table Name:** `Table 1` (configurable via `AIRTABLE_TABLE_NAME`)

| Field | Type | Description |
|-------|------|-------------|
| `email` | Single line text | User's email (primary key) |
| `lastname` | Single line text | User's last name |
| `key1 status` | Single select | Status: `not_scanned`, `scanned` |
| `key2 status` | Single select | Status: `not_scanned`, `scanned` |
| `key3 status` | Single select | Status: `not_scanned`, `scanned` |

### API Permissions
Your Airtable API key needs:
- **Read** access to search existing records
- **Write** access to create new records
- **Update** access to modify key status fields

## Security Features

### Data Protection
- **No sensitive data in frontend**: All API keys server-side only
- **Input validation**: Required fields validation
- **Email normalization**: Lowercase email storage
- **Race condition prevention**: Email locking during registration

### Rate Limiting
- **Airtable limits**: 5 requests/second per base
- **429 handling**: 30-second wait for rate limit errors
- **Retry logic**: Maximum 3 attempts with exponential backoff

### Error Information
- **Production**: Generic error messages
- **Development**: Detailed error information with stack traces

## Monitoring and Logging

### Server Logs
- **Startup**: Configuration validation and status
- **Requests**: User registration and key updates
- **Errors**: Network timeouts, authentication failures, rate limits
- **Performance**: Request timing and retry attempts

### Health Monitoring
Use `/api/health` endpoint for:
- **Load balancer health checks**
- **Uptime monitoring**
- **Deployment verification**

## Troubleshooting

### Common Issues

#### 403 Forbidden Error
- **Cause**: Invalid Airtable API key or insufficient permissions
- **Solution**: Verify API key and base permissions in Airtable

#### ETIMEDOUT Errors
- **Cause**: Network connectivity issues or Airtable downtime
- **Solution**: Check network connectivity, verify Airtable service status

#### Email Already Used Error
- **Cause**: User attempting to register with existing email but different name
- **Solution**: User should use different email or contact support

#### Configuration Errors on Startup
- **Cause**: Missing required environment variables
- **Solution**: Ensure all required `.env` variables are set

### Debug Steps
1. **Check environment variables**: Verify all required vars are set
2. **Test API key**: Use Airtable API directly to verify credentials
3. **Check network**: Ensure server can reach api.airtable.com
4. **Review logs**: Check server logs for specific error messages
5. **Verify table schema**: Ensure Airtable table matches expected structure

## Migration Notes

This backend was migrated from the Airtable JavaScript client library to native Node.js HTTPS requests to resolve timeout issues. The migration included:

- **Replaced**: `airtable` npm package → native `https` module
- **Enhanced**: Error handling and timeout management
- **Added**: Rate limiting and retry logic
- **Improved**: Email conflict detection and locking
- **Removed**: Offline mode fallbacks (now requires Airtable)

The API interface remains the same, ensuring frontend compatibility.