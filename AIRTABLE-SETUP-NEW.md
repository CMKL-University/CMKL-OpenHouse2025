# Airtable Integration Setup Guide

This guide will help you set up the Airtable integration for the CMKL OpenHouse 2025 project using the official Airtable.js library.

## Prerequisites

1. An Airtable account
2. A base with the required table structure
3. A personal access token

## Step 1: Create Your Airtable Base

1. Go to [Airtable](https://airtable.com) and create a new base
2. Create a table named "Table 1" (or use the table ID `tbldt9OCRtf4xb7rV`)
3. Add the following fields:

| Field Name | Field ID | Type | Description |
|------------|----------|------|-------------|
| email | fldnxGYIGSvS0Uk5G | Text | Single line of text |
| lastname | fldDzaSpEuhzVfK4y | Text | Single line of text |
| key1 status | fldXjT430LRru4nBz | Text | Single line of text |
| key2 status | fldLniKShb3vSFmFw | Text | Single line of text |
| key3 status | fldjQuyOwffAxwj9x | Text | Single line of text |

## Step 2: Get Your Credentials

1. **Base ID**: Found in your Airtable URL
   - Example: `https://airtable.com/appBWW2jchcr1OW3Q/...`
   - Base ID: `appBWW2jchcr1OW3Q`

2. **Personal Access Token**: 
   - Go to [https://airtable.com/create/tokens](https://airtable.com/create/tokens)
   - Create a new personal access token
   - Give it the necessary scopes: `data.records:read` and `data.records:write`
   - Add your base to the token

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Update the values:

```env
MISSION=ENABLE
AIRTABLE_API_KEY=your_personal_access_token_here
AIRTABLE_BASE_ID=appBWW2jchcr1OW3Q
AIRTABLE_TABLE_NAME=Table 1
```

## Features

### Email Validation
The application now includes robust email validation:
- **Duplicate Email Detection**: Prevents registration with an email that's already used
- **Name Verification**: If an email exists, the system checks if the lastname matches
- **User-Friendly Errors**: Clear error messages when email conflicts occur
- **Visual Feedback**: Input fields highlight in red when validation fails


### User Experience Flow
1. User enters email and lastname
2. System checks if email already exists in Airtable
3. If email exists with same lastname → Welcome back (existing user)
4. If email exists with different lastname → Error popup with clear message
5. If email doesn't exist → Create new record

### Cross-Page Error Handling
The application includes a global error handling system:
- **Cross-Page Persistence**: Email validation errors are stored in sessionStorage
- **Automatic Redirection**: If an error occurs on any page, user is redirected to index.html
- **Visual Feedback**: Terminal-style error popup with input field highlighting
- **Form Reset**: Email and lastname fields are cleared after error

### Testing Email Validation
1. Create a user with email "test@example.com" and lastname "Smith"
2. Try to create another user with "test@example.com" and lastname "Jones"
3. Expected result: Error popup saying "This email is already registered with a different name..."

## API Usage

The application now uses the official Airtable.js library which provides:

- Built-in retry logic
- Better error handling
- Type safety
- Automatic pagination

### Example API Calls

**Create Record:**
```javascript
base('Table 1').create([
  {
    "fields": {
      "email": "test@example.com",
      "lastname": "Doe",
      "key1 status": "not_scanned",
      "key2 status": "not_scanned",
      "key3 status": "not_scanned"
    }
  }
], function(err, records) {
  if (err) { console.error(err); return; }
  console.log('Created record:', records[0].getId());
});
```

**Update Record:**
```javascript
base('Table 1').update([
  {
    "id": "recXXXXXXXXXXXXXX",
    "fields": {
      "key1 status": "scanned"
    }
  }
], function(err, records) {
  if (err) { console.error(err); return; }
  console.log('Updated record:', records[0].get('email'));
});
```

**Error Response (Email Already Used):**
```json
{
  "success": false,
  "error": "EMAIL_ALREADY_USED",
  "message": "This email is already registered with a different name. Please use a different email or contact support if this is your email."
}
```

**Success Response (Existing User):**
```json
{
  "success": true,
  "recordId": "recXXXXXXXXXXXXXX",
  "existing": true,
  "message": "Welcome back! Using your existing account."
}
```

**List Records:**
```javascript
base('Table 1').select({
    filterByFormula: "NOT({email} = '')",
    maxRecords: 100
}).eachPage(function page(records, fetchNextPage) {
    records.forEach(function(record) {
        console.log('Retrieved', record.get('email'));
    });
    fetchNextPage();
}, function done(err) {
    if (err) { console.error(err); return; }
});
```

## Rate Limits

The Airtable API has the following limits:
- 5 requests per second per base
- 429 status code when exceeded
- 30 second wait required after hitting limit

The official Airtable.js library includes built-in retry logic to handle these limits automatically.

## Error Handling

The application includes fallback to offline mode if Airtable is unavailable, ensuring the AR experience continues to work even without data storage.

## Testing

To test your Airtable integration:

1. Start the server: `npm start`
2. Check the console for any Airtable configuration errors
3. Test the `/api/airtable/submit` endpoint
4. Verify records are created in your Airtable base

## Troubleshooting

- **401 Unauthorized**: Check your API key and token permissions
- **403 Forbidden**: Verify the token has access to your base
- **404 Not Found**: Check the base ID and table name
- **422 Invalid Request**: Verify field names match your table schema
- **429 Rate Limited**: The library will automatically retry after 30 seconds
