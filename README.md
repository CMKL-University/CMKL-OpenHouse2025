# CMKL Openhouse 2025 - AR Experience

A cyberpunk-themed AR web application with MindAR integration and Airtable backend for user tracking and key collection.

## Features

- 🎯 **AR Key Scanning** - Scan image targets to unlock keys
- 🤖 **Cyberpunk UI** - Matrix-style digital effects and animations  
- 📱 **Mobile Optimized** - Responsive design for all devices
- 🗃️ **User Tracking** - Airtable integration for user management
- ✨ **Progressive Web App** - Can be installed on mobile devices

## Setup Instructions

### 1. Environment Configuration

1. Copy the configuration template:
   ```bash
   cp config.example.js config.js
   ```

2. Edit `config.js` with your Airtable credentials:
   ```javascript
   const config = {
       AIRTABLE_API_KEY: 'your-actual-api-key',
       AIRTABLE_BASE_ID: 'your-actual-base-id', 
       AIRTABLE_TABLE_NAME: 'Table%201'
   };
   ```

### 2. Airtable Setup

1. Create an Airtable base with these fields:
   - `email` (Text)
   - `lastname` (Text) 
   - `key1 status` (Text)
   - `key2 status` (Text)
   - `key3 status` (Text)

2. Get your API token:
   - Go to https://airtable.com/create/tokens
   - Create a personal access token
   - Give it access to your base

3. Find your Base ID:
   - Go to https://airtable.com/api
   - Select your base
   - Copy the Base ID from the URL or documentation

### 3. Local Development
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

### 3. Access the Application
Open your browser and navigate to:
```
http://localhost:8000
```

## Usage

1. **Register**: Enter your first name and last name
2. **AR Experience**: Allow camera access when prompted
3. **Target Detection**: Point camera at your target image
4. **Collect Keys**: Click on floating objects to collect keys
5. **Save Data**: Click "Save Progress" to download your data as JSON

## Key Features Explained

### User Registration System
- Users must enter first name and last name
- Data is saved per user using localStorage
- Previous sessions are restored automatically

### AR Elements
- **Welcome Box**: Click for university information
- **Engineering Key** (Gold Sphere): Represents engineering programs
- **Science Key** (Red Cylinder): Represents science programs  
- **Innovation Key** (Purple Octahedron): Represents innovation focus

### Data Management
- All interactions are tracked and timestamped
- Keys collected are saved between sessions
- Complete user data exported as JSON file
- Includes session duration and interaction history

## File Structure
```
openhouse/
├── index.html          # Main application file
├── script.js          # JavaScript functionality
├── target.mind        # AR target file (you need to create this)
└── README.md          # This file
```

## Browser Requirements
- HTTPS or localhost (for camera access)
- Modern browser with WebGL support
- Camera permission required

## Troubleshooting

1. **Camera not working**: Ensure HTTPS or localhost usage
2. **AR not detecting**: Check target.mind file is properly generated
3. **No 3D content**: Verify target image is clearly visible and well-lit
4. **Registration issues**: Ensure both first and last names are entered

## Customization

### Adding More Keys
Edit the AR scene in `index.html` and add new clickable elements:

```html
<a-box
    position="2 0.5 0"
    color="#00FF00"
    class="clickable key"
    data-key="New Key Name">
</a-box>
```

### Adding Validation
You can add name validation in `script.js`:

```javascript
if (firstName.length < 2 || lastName.length < 2) {
    alert('Names must be at least 2 characters long');
    return;
}
```

## Technical Details
- Built with MindAR.js v1.2.5 and A-Frame v1.4.0
- Uses WebGL for 3D rendering
- LocalStorage for data persistence
- JSON export functionality for data backup