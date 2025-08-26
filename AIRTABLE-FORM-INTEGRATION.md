# Airtable Form Integration

## 📋 Form Submission System

Your CMKL AR app now submits data directly to your Airtable form instead of using the API.

### Form URL Used:
```
https://airtable.com/appBWW2jchcr1OW3Q/pag4VotahS4XFvc1t/form
```

## 🔄 How It Works:

### **When Data is Submitted:**
1. **Key Collection**: Every time a user collects a key
2. **Game Completion**: When user collects both keys
3. **Form Submission**: Creates hidden form with all data
4. **New Tab**: Opens Airtable form in new tab with pre-filled data

### **Data Submitted to Form:**
```javascript
{
  Session_ID: "cmkl_1703123456789_abc123def",
  Start_Time: "2023-12-21T10:30:00Z", 
  Last_Updated: "2023-12-21T10:35:30Z",
  Total_Keys_Collected: 2,
  Collected_Keys: "Engineering Access Key, Science Lab Key",
  Targets_Found: "engineering, science",
  Session_Duration_Minutes: 5.5,
  Total_Interactions: 8,
  Game_Completed: "Yes",
  Interactions_JSON: "[{...all interactions...}]",
  Device_Info: "Mozilla/5.0...",
  Timestamp: "2023-12-21T10:35:30Z"
}
```

## ⚠️ Important Setup Notes:

### **Form Fields Required:**
You need to create these fields in your Airtable form to match the data being sent:

1. **Session_ID** (Single line text)
2. **Start_Time** (Date)
3. **Last_Updated** (Date)
4. **Total_Keys_Collected** (Number)
5. **Collected_Keys** (Long text)
6. **Targets_Found** (Long text)
7. **Session_Duration_Minutes** (Number)
8. **Total_Interactions** (Number)
9. **Game_Completed** (Single select: Yes/No)
10. **Interactions_JSON** (Long text)
11. **Device_Info** (Long text)
12. **Timestamp** (Date)

### **Form Field Names:**
The field names in your Airtable form must match exactly with the names used in the code. If they don't match, the data won't populate correctly.

## 🎯 Submission Triggers:

### **Every Key Collection:**
- User clicks "Collect Engineering Key" → Form submission
- User clicks "Collect Science Lab Key" → Form submission
- Each submission opens a new tab with the form

### **Game Completion:**
- When both keys are collected → Final form submission
- Contains complete session data

## 📱 User Experience:

1. **Seamless Collection**: User collects keys normally
2. **Form Opens**: New tab opens with Airtable form
3. **Pre-filled Data**: All fields automatically populated  
4. **User Can Review**: User can see their data in the form
5. **Submit**: User clicks submit in the Airtable form
6. **Data Recorded**: Data saved to your Airtable base

## 🔧 Advantages of Form Method:

✅ **No API Key Needed**: No tokens or authentication required
✅ **Visual Confirmation**: Users can see their data being submitted  
✅ **Airtable Validation**: Built-in form validation from Airtable
✅ **Easy Setup**: Just create form fields, no API configuration
✅ **User Control**: Users can review data before final submission

## 🎨 Customization Options:

### **To Modify Form Fields:**
1. Update the `formData` object in `submitToAirtableForm()`
2. Add/remove fields as needed
3. Ensure Airtable form has matching field names

### **To Change When Forms Submit:**
- Currently submits on every key collection
- Modify `collectKeyFromButton()` to change timing
- Remove `submitDataToForm()` calls to submit less frequently

The form integration provides a more transparent way for users to see exactly what data is being collected and gives them control over the final submission!