# Quick Setup Guide

## Required Files Missing

Your application is looking for these files that need to be created:

### 1. Create Target Image File (`target.mind`)

**This is REQUIRED for AR to work!**

1. Go to: https://hiukim.github.io/mind-ar-js-doc/tools/compile
2. Upload an image (CMKL University logo, building, or any high-contrast image)
3. Wait for compilation to complete
4. Download the generated `.mind` file
5. Save it as `target.mind` in your project folder

### 2. Start Local Server

The application MUST run on a server (not file://) for camera access:

```bash
# Option 1: Python
python -m http.server 8000

# Option 2: Node.js
npx serve .

# Option 3: PHP  
php -S localhost:8000

# Option 4: Live Server (VS Code extension)
Right-click index.html → "Open with Live Server"
```

### 3. Access Application

Open browser to: `http://localhost:8000`

## Current Status

✅ **Working**: User registration, AR scene setup, key collection system
❌ **Missing**: `target.mind` file (AR won't work without this)
❌ **Missing**: Local server setup

## Quick Test

1. Create `target.mind` file (see step 1 above)
2. Start local server (see step 2 above)
3. Open `http://localhost:8000`
4. Enter first and last name
5. Allow camera access
6. Point camera at your target image

## Troubleshooting

**Error: "Extra bytes found at buffer"**
- This means `target.mind` is missing or corrupted
- Re-create the file using the MindAR compiler

**Error: "404 Not Found"**
- Missing `target.mind` file
- Not running on a local server

**Camera not working:**
- Must use `http://localhost` or `https://`
- Cannot use `file://` protocol