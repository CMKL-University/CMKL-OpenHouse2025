# Airtable Integration Setup

## 🗄️ Database Configuration

Your CMKL AR app now automatically stores data to Airtable using your provided token.

### Required Airtable Setup:

**⚠️ IMPORTANT**: You need to create an Airtable base and update the `baseId` in the code.

#### 1. Create Airtable Base
1. Go to [airtable.com](https://airtable.com)
2. Create a new base called "CMKL Openhouse 2025"
3. Copy the Base ID (starts with `app...`)
4. Update `script.js` line 4: Replace `appYourBaseId` with your actual Base ID

#### 2. Create Table Structure
Create a table named `CMKL_Openhouse_Data` with these fields:

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `Session_ID` | Single line text | Unique session identifier |
| `Start_Time` | Date | When user started the experience |
| `Last_Updated` | Date | Last data sync time |
| `Total_Keys_Collected` | Number | Count of keys collected |
| `Collected_Keys` | Long text | Comma-separated list of keys |
| `Targets_Found` | Long text | Comma-separated list of targets |
| `Session_Duration_Minutes` | Number | Session length in minutes |
| `Total_Interactions` | Number | Count of user interactions |
| `Game_Completed` | Checkbox | Whether user collected all keys |
| `Interactions_JSON` | Long text | Full interaction history |
| `Device_Info` | Long text | User agent string |
| `Timestamp` | Date | Record creation time |

## 📊 Data Stored

The app automatically saves:

### Session Data:
- **Unique Session ID**: Generated for each user session
- **Start/End Times**: Complete session timeline
- **Duration**: Session length in minutes

### Progress Data:
- **Keys Collected**: Which keys were found
- **Targets Found**: Which AR targets were detected
- **Game Completion**: Whether user finished the experience

### Interaction Data:
- **All Clicks**: Every interaction with AR objects
- **Target Detections**: When AR targets are found
- **Timestamps**: Precise timing of all events
- **Device Info**: Browser and device information

## 🔄 Sync Behavior

### Automatic Sync:
- **App Start**: Initial data creation (2 seconds after load)
- **Key Collection**: Immediate sync when key collected
- **Game Completion**: Instant sync when all keys found
- **Periodic**: Every 30 seconds for ongoing activity
- **Interactions**: Each click/interaction is logged

### Offline Handling:
- **Local Backup**: All data saved to localStorage first
- **Connection Issues**: Shows "Connection issue - data saved locally"
- **Retry Logic**: Will retry Airtable sync on next opportunity
- **No Data Loss**: Local storage ensures data persistence

## 🛠️ Configuration Steps

1. **Get your Base ID**:
   ```javascript
   // In script.js line 4, replace this:
   baseId: 'appYourBaseId'
   // With your actual Base ID like:
   baseId: 'appXXXXXXXXXXXXXX'
   ```

2. **Test the integration**:
   - Run the AR app
   - Check browser console for "✅ Data sent to Airtable successfully"
   - Verify records appear in your Airtable base

## 📈 Analytics Available

With this integration, you can analyze:
- **User Engagement**: Session durations and completion rates
- **Popular Targets**: Which AR targets are found most often
- **Interaction Patterns**: How users navigate the experience
- **Device Usage**: What devices/browsers are used
- **Time Analysis**: Peak usage times and session lengths

## 🔧 Troubleshooting

**No data appearing in Airtable?**
- Check Base ID is correct in script.js
- Ensure table name is exactly "CMKL_Openhouse_Data"
- Verify all field names match exactly (case-sensitive)
- Check browser console for error messages

**Getting API errors?**
- Confirm token has write permissions to the base
- Check if you're hitting Airtable API rate limits
- Verify base and table exist and are accessible

The system is designed to be robust - even if Airtable sync fails, all data remains safely stored in the user's browser and will retry on the next sync opportunity.