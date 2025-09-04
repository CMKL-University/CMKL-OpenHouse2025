Introduction
The CMKL Openhouse 2025 API provides an easy way to integrate your CMKL Openhouse 2025 data in Airtable with any external system. The API closely follows REST semantics, uses JSON to encode objects, and relies on standard HTTP codes to signal operation outcomes.

The API documentation below is specifically generated for your base. We recommend that you use the graphical Airtable interface to add a few records of example data for each table. These records will be displayed in the documentation examples generated below.

To view documentation for all available endpoints, as well as documentation that has not been generated specific to your base, please visit here.

The ID of this base is appBWW2jchcr1OW3Q.

Please note: if you make changes to a field (column) name or type, the API interface for those fields will change correspondingly. Therefore, please make sure to update your API implementation accordingly whenever you make changes to your Airtable schema from the graphical interface.

Official API client:

JavaScript: airtable.js (Node.js + browser)
Community-built API clients:

Ruby: airrecord
.NET: airtable.net
Python 3: pyairtable
Python 2/3: airtable.py
Metadata
This API gives you the ability to list all of your bases, tables, fields, and views. For more, see the API reference documentation for List bases and Get base schema.

Rate Limits
The API is limited to 5 requests per second per base. If you exceed this rate, you will receive a 429 status code and will need to wait 30 seconds before subsequent requests will succeed.

The official JavaScript client has built-in retry logic.

If you anticipate a higher read volume, we recommend using a caching proxy. This rate limit is the same for all plans and increased limits are not currently available.

Authentication
Airtable uses simple token-based authentication. For personal development, we recommend using personal access tokens, which can be created at /create/tokens. To learn more about other authentication methods like OAuth, please visit our developer documentation.

Using Airtable.js in the browser is strongly discouraged, since that will expose your API key to everyone who has access to that web page.

To configure Airtable.js either store your secret API token (e.g. personal access token) in the AIRTABLE_API_KEY environment variable or pass it directly to the client library. Note that environment variables are not available when using Airtable.js in the browser.

All API requests must be authenticated and made over HTTPS.

 
Example using environment variable
# Shell:
$ export AIRTABLE_API_KEY=YOUR_SECRET_API_TOKEN

# Node:
const base = require('airtable').base('appBWW2jchcr1OW3Q');
Example using custom configuration
var Airtable = require('airtable');
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: 'YOUR_SECRET_API_TOKEN'
});
var base = Airtable.base('appBWW2jchcr1OW3Q');
Table 1 Table
The id for Table 1 is tbldt9OCRtf4xb7rV. Table ids and table names can be used interchangeably in API requests. Using table ids means table name changes do not require modifications to your API request.

Fields
Each record in the Table 1 table contains the following fields:

Field names and field ids can be used interchangeably. Using field ids means field name changes do not require modifications to your API request. We recommend using field ids over field names where possible, to reduce modifications to your API request if the user changes the field name later.

Field NameField IDTypeDescription
emailfldnxGYIGSvS0Uk5GText
string
A single line of text.
 
Example values
"test@example.com"

"e@gmail.com"

"qwrfqw@gqw33g"

"2@eag.com"

"qwr@aegeghrw"

lastnamefldDzaSpEuhzVfK4yText
string
A single line of text.
 
Example values
"lastnamie"

"sss"

"lastnamie"

"weegb"

"hgrwhawrhwra"

key1 statusfldXjT430LRru4nBzText
string
A single line of text.
 
Example values
"not_scanned"

"not_scanned"

"not_scanned"

"not_scanned"

"not_scanned"

key2 statusfldLniKShb3vSFmFwText
string
A single line of text.
 
Example values
"not_scanned"

"not_scanned"

"not_scanned"

"not_scanned"

"not_scanned"

key3 statusfldjQuyOwffAxwj9xText
string
A single line of text.
 
Example values
"not_scanned"

"not_scanned"

"not_scanned"

"not_scanned"

"not_scanned"

List Table 1 records
To list records in Table 1, use the select method.

select returns a query object. To fetch the records matching that query, use the eachPage or firstPage method of the query object.

Returned records do not include any fields with "empty" values, e.g. "", [], or false.

Note: Airtable's API only accepts request with a URL shorter than 16,000 characters. Encoded formulas may cause your requests to exceed this limit. To fix this issue you can instead make a POST request to /v0/{baseId}/{tableIdOrName}/listRecords while passing the parameters within the body of the request instead of the query parameters. See our support article on this for more information.

You can use the following parameters to filter, sort, and format the results:

fields
array of strings
optional
Only data for fields whose names are in this list will be included in the result. If you don't need every field, you can use this parameter to reduce the amount of data transferred.

For example, to only return data from email and lastname, pass in:

fields: ["email", "lastname"]
You can also perform the same action with field ids (they can be found in the fields section):

fields: ["fldnxGYIGSvS0Uk5G", "fldDzaSpEuhzVfK4y"]
filterByFormula
string
optional
A formula used to filter records. The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response. We recommend testing your formula in the Formula field UI before using it in your API request.

If combined with the view parameter, only records in that view which satisfy the formula will be returned.

The formula must be encoded first before passing it as a value. You can use this tool to not only encode the formula but also create the entire url you need. For example, to only include records where email isn't empty, pass in NOT({email} = '') as a parameter like this:

filterByFormula: "NOT({email} = '')"

Note: Airtable's API only accepts request with a URL shorter than 16,000 characters. Encoded formulas may cause your requests to exceed this limit. To fix this issue you can instead make a POST request to /v0/{baseId}/{tableIdOrName}/listRecords while passing the parameters within the body of the request instead of the query parameters. See our support article on this for more information.

maxRecords
number
optional
The maximum total number of records that will be returned in your requests. If this value is larger than pageSize (which is 100 by default), you may have to load multiple pages to reach this total. See the Pagination section below for more.pageSize
number
optional
The number of records returned in each request. Must be less than or equal to 100. Default is 100. See the Pagination section below for more.sort
array of objects
optional
A list of sort objects that specifies how the records will be ordered. Each sort object must have a field key specifying the name of the field to sort on, and an optional direction key that is either "asc" or "desc". The default direction is "asc".

The sort parameter overrides the sorting of the view specified in the view parameter. If neither the sort nor the view parameter is included, the order of records is arbitrary.

For example, to sort records by email in descending order, send these two query parameters:

sort%5B0%5D%5Bfield%5D=email
sort%5B0%5D%5Bdirection%5D=desc
For example, to sort records by email in descending order, pass in:

[{field: "email", direction: "desc"}]
view
string
optional
The name or ID of a view in the Table 1 table. If set, only the records in that view will be returned. The records will be sorted according to the order of the view unless the sort parameter is included, which overrides that order. Fields hidden in this view will be returned in the results. To only return a subset of fields, use the fields parameter.cellFormat
string
optional
The format that should be used for cell values. Supported values are:

json: cells will be formatted as JSON, depending on the field type.

string: cells will be formatted as user-facing strings, regardless of the field type. The timeZone and userLocale parameters are required when using string as the cellFormat.

Note: You should not rely on the format of these strings, as it is subject to change.
The default is json.

timeZone
string
optional
The time zone that should be used to format dates when using string as the cellFormat. This parameter is required when using string as the cellFormat.

userLocale
string
optional
The user locale that should be used to format dates when using string as the cellFormat. This parameter is required when using string as the cellFormat.

returnFieldsByFieldId
boolean
optional
An optional boolean value that lets you return field objects where the key is the field id.

This defaults to false, which returns field objects where the key is the field name.

recordMetadata
array of strings
optional
An optional field that, if includes commentCount, adds a commentCount read only property on each record returned.

Pagination
The server returns one page of records at a time. Each page will contain pageSize records, which is 100 by default.

To fetch the next page of records, call fetchNextPage.

Pagination will stop when you've reached the end of your table. If the maxRecords parameter is passed, pagination will stop once you've reached this maximum.

 
Code
var Airtable = require('airtable');
var base = new Airtable({apiKey: 'YOUR_SECRET_API_TOKEN'}).base('appBWW2jchcr1OW3Q');

base('Table 1').select({
    // Selecting the first 3 records in Grid view:
    maxRecords: 3,
    view: "Grid view"
}).eachPage(function page(records, fetchNextPage) {
    // This function (`page`) will get called for each page of records.

    records.forEach(function(record) {
        console.log('Retrieved', record.get('email'));
    });

    // To fetch the next page of records, call `fetchNextPage`.
    // If there are more records, `page` will get called again.
    // If there are no more records, `done` will get called.
    fetchNextPage();

}, function done(err) {
    if (err) { console.error(err); return; }
});
Output
Retrieved test@example.com
Retrieved e@gmail.com
Retrieved qwrfqw@gqw33g
Fetch first page
// If you only want the first page of records, you can
// use `firstPage` instead of `eachPage`.
base('Table 1').select({
    view: 'Grid view'
}).firstPage(function(err, records) {
    if (err) { console.error(err); return; }
    records.forEach(function(record) {
        console.log('Retrieved', record.get('email'));
    });
});
Fetch additional record metadata
// If you want to fetch the number of comments for each record,
// include the `recordMetadata` param.
base('Table 1').select({
    recordMetadata: ['commentCount']
}).firstPage(function(err, records) {
    if (err) { console.error(err); return; }
    records.forEach(function(record) {
        console.log('Retrieved a record with', record.commentCount, 'comments');
    });
});
 
Iteration may timeout due to client inactivity or server restarts. In that case, the client will receive a 422 response with error message LIST_RECORDS_ITERATOR_NOT_AVAILABLE. It may then restart iteration from the beginning.

 
Retrieve a Table 1 record
To retrieve an existing record in Table 1 table, use the find method.

Any "empty" fields (e.g. "", [], or false) in the record will not be returned.

 
Code
var Airtable = require('airtable');
var base = new Airtable({apiKey: 'YOUR_SECRET_API_TOKEN'}).base('appBWW2jchcr1OW3Q');

base('Table 1').find('recelXWvTzXOmCntp', function(err, record) {
    if (err) { console.error(err); return; }
    console.log('Retrieved', record.id);
});
Output
Retrieved recelXWvTzXOmCntp
Create Table 1 records
To create new records, use the create method. Note that table names and table ids can be used interchangeably. Using table ids means table name changes do not require modifications to your API request.

The first argument should be an array of up to 10 record objects. Each of these objects should have one key whose value is an inner object containing your record's cell values, keyed by either field name or field id.

Returns an array of record objects created if the call succeeded, including record IDs which will uniquely identify the records within CMKL Openhouse 2025.

The Airtable API will perform best-effort automatic data conversion from string values if the typecast parameter is passed in (click to show example). Automatic conversion is disabled by default to ensure data integrity, but it may be helpful for integrating with 3rd party data sources.

You can also include a single record object at the top level. Click here to show an example.

 
Code
var Airtable = require('airtable');
var base = new Airtable({apiKey: 'YOUR_SECRET_API_TOKEN'}).base('appBWW2jchcr1OW3Q');

base('Table 1').create([
  {
    "fields": {
      "email": "test@example.com",
      "lastname": "lastnamie",
      "key1 status": "not_scanned",
      "key2 status": "not_scanned",
      "key3 status": "not_scanned"
    }
  },
  {
    "fields": {
      "email": "e@gmail.com",
      "lastname": "sss",
      "key1 status": "not_scanned",
      "key2 status": "not_scanned",
      "key3 status": "not_scanned"
    }
  }
], function(err, records) {
  if (err) {
    console.error(err);
    return;
  }
  records.forEach(function (record) {
    console.log(record.getId());
  });
});
Output
recelXWvTzXOmCntp
recLBQ3YtJtxxvVlE
Update Table 1 records
To update Table 1 records, use the update or replace method. An update will only update the fields you include. Fields not included will be unchanged. A replace will perform a destructive update and clear all unincluded cell values. A replace call on Table 1 records will always fail. The example at the right uses the non-destructive update method. Click here to show a destructive replace call.
The first argument should be an array of up to 10 record objects. Each of these objects should have an id property representing the record ID and a fields property which contains all of your record's cell values by field name or field id for all of your record's cell values by field name.
Automatic data conversion for update actions can be enabled via typecast parameter. See create record for details.

You can also include a single record object at the top level. Click here to show an example.

 
Code
var Airtable = require('airtable');
var base = new Airtable({apiKey: 'YOUR_SECRET_API_TOKEN'}).base('appBWW2jchcr1OW3Q');

base('Table 1').update([
  {
    "id": "recelXWvTzXOmCntp",
    "fields": {
      "email": "test@example.com",
      "lastname": "lastnamie",
      "key1 status": "not_scanned",
      "key2 status": "not_scanned",
      "key3 status": "not_scanned"
    }
  },
  {
    "id": "recLBQ3YtJtxxvVlE",
    "fields": {
      "email": "e@gmail.com",
      "lastname": "sss",
      "key1 status": "not_scanned",
      "key2 status": "not_scanned",
      "key3 status": "not_scanned"
    }
  },
  {
    "id": "receFyDX37qOPNuQo",
    "fields": {
      "email": "qwrfqw@gqw33g",
      "lastname": "lastnamie",
      "key1 status": "not_scanned",
      "key2 status": "not_scanned",
      "key3 status": "not_scanned"
    }
  }
], function(err, records) {
  if (err) {
    console.error(err);
    return;
  }
  records.forEach(function(record) {
    console.log(record.get('email'));
  });
});
Output
"test@example.com"
"e@gmail.com"
"qwrfqw@gqw33g"
Delete Table 1 records
To delete Table 1 records, use the destroy method. Note that table names and table ids can be used interchangeably. Using table ids means table name changes do not require modifications to your API request.

The first parameter to destroy is an array of up to 10 record IDs to delete.

You can also set the first parameter to a record ID to delete a single record. Click here to show an example.

 
Code
var Airtable = require('airtable');
var base = new Airtable({apiKey: 'YOUR_SECRET_API_TOKEN'}).base('appBWW2jchcr1OW3Q');

base('Table 1').destroy(['recelXWvTzXOmCntp', 'recLBQ3YtJtxxvVlE'], function(err, deletedRecords) {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Deleted', deletedRecords.length, 'records');
});
Output
Deleted 2 records
Errors
The CMKL Openhouse 2025 API follows HTTP status code semantics. 2xx codes signify success, 4xx mostly represent user error, 5xx generally correspond to a server error. The error messages will return a JSON-encoded body that contains error and message fields. Those will provide specific error condition and human-readable message to identify what caused the error.

Success code
200OKRequest completed successfully.
User error codes
These errors generally indicate a problem on the client side. If you are getting one of these, check your code and the request details.

400Bad RequestThe request encoding is invalid; the request can't be parsed as a valid JSON.
401UnauthorizedAccessing a protected resource without authorization or with invalid credentials.
402Payment RequiredThe account associated with the API key making requests hits a quota that can be increased by upgrading the Airtable account plan.
403ForbiddenAccessing a protected resource with API credentials that don't have access to that resource.
404Not FoundRoute or resource is not found. This error is returned when the request hits an undefined route, or if the resource doesn't exist (e.g. has been deleted).
413Request Entity Too LargeThe request exceeded the maximum allowed payload size. You shouldn't encounter this under normal use.
422Invalid RequestThe request data is invalid. This includes most of the base-specific validations. You will receive a detailed error message and code pointing to the exact issue.
429Too Many RequestsThe API is limited to 5 requests per second per base. You will receive a 429 status code and a message "Rate limit exceeded. Please try again later" and will need to wait 30 seconds before subsequent requests will succeed. To learn more about rate limits, please visit our Rate Limits guide.
Server error codes
These errors generally represent an error on our side. In the event of a 5xx error code, detailed information about the error will be automatically recorded, and Airtable's developers will be notified.

500Internal Server ErrorThe server encountered an unexpected condition.
502Bad GatewayAirtable's servers are restarting or an unexpected outage is in progress. You should generally not receive this error, and requests are safe to retry.
503Service UnavailableThe server could not process your request in time. The server could be temporarily unavailable, or it could have timed out processing your request. You should retry the request with backoffs.