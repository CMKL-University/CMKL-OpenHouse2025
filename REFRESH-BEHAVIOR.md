# Refresh/Reload Behavior

## 🔄 Complete Reset on Every Page Load

Your CMKL AR app now **completely resets** every time the page is refreshed or reloaded.

### What Gets Reset:

#### 📱 **User Data**
- ✅ All collected keys cleared
- ✅ Target detection history reset
- ✅ All interactions cleared
- ✅ Session timer restarted
- ✅ New unique session ID generated

#### 💾 **Local Storage**
- ✅ `cmkl_openhouse_data` - Removed
- ✅ `airtable_record_id` - Removed  
- ✅ All cached progress - Cleared

#### 🖥️ **UI Elements**
- ✅ Keys display: "Find targets to collect keys!"
- ✅ Target counter: "Targets found: 0/2"
- ✅ Progress counter: "Progress: 0/2"
- ✅ All collect buttons hidden
- ✅ Button text reset to original state
- ✅ Target indicators hidden

#### 🗄️ **Airtable Behavior**
- ✅ **New Record Created**: Each refresh creates a fresh Airtable record
- ✅ **Unique Session ID**: Every session gets a new identifier
- ✅ **Clean Data**: No carryover from previous sessions

### Fresh Session Flow:

```
1. Page Loads/Refreshes
   ↓
2. Clear All localStorage
   ↓  
3. Reset userData Object
   ↓
4. Reset All UI Elements
   ↓
5. Generate New Session ID
   ↓
6. Create New Airtable Record
   ↓
7. Ready for New Experience
```

### Benefits:

- **📊 Analytics**: Each page load = new unique session in Airtable
- **🧪 Testing**: Easy to test the full experience repeatedly  
- **👥 Multiple Users**: Perfect for events with many participants
- **🔄 Consistency**: Every user gets the same fresh start
- **📈 Data Quality**: Clean session boundaries for analysis

### For Event Usage:

This is perfect for openhouse events where:
- **Different visitors** use the same device
- **Demonstration purposes** require clean resets
- **Data collection** needs clear session boundaries
- **Testing/troubleshooting** requires fresh starts

Every refresh gives you a completely clean slate - just like a new user experiencing the AR for the first time!