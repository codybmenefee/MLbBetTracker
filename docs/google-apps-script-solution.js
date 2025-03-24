/**
 * MLB Betting Recommendations - Google Apps Script
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Save and deploy as a web app (Publish > Deploy as web app)
 *    - Execute as: Me
 *    - Who has access: Anyone (or specific users/domain)
 * 5. Copy the web app URL for use in your application
 * 6. Also copy your Spreadsheet ID from the URL: docs.google.com/spreadsheets/d/<ID>/edit
 *    You'll need this ID for the integration to work properly in production environments
 */

// Process HTTP POST requests from your app
function doPost(e) {
  try {
    // Parse the JSON data sent from your application
    const data = JSON.parse(e.postData.contents);
    const recommendations = data.recommendations;
    const spreadsheetId = data.spreadsheetId; // Get the spreadsheet ID from the request
    
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No valid recommendations data provided"
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get the spreadsheet by ID if provided, otherwise use active spreadsheet
    let ss;
    if (spreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(spreadsheetId);
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: `Could not open spreadsheet with ID ${spreadsheetId}: ${error.toString()}`
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      // Fallback to active spreadsheet if no ID provided
      try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
        if (!ss) {
          throw new Error("No active spreadsheet found and no spreadsheet ID provided");
        }
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: `No spreadsheet available: ${error.toString()}`
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Use today's date for the sheet name if not provided
    const today = new Date().toISOString().split('T')[0];
    const sheetName = data.sheetName || `MLB Betting Recommendations ${today}`;
    
    // Try to get the sheet if it exists, otherwise create it
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Clear previous content and format the sheet
    sheet.clear();
    
    // Set up headers
    const headers = ["Game", "Bet Type", "Odds", "Confidence", "Prediction", "Generated At", "Date Exported"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#4285F4")
      .setFontColor("white")
      .setFontWeight("bold");
    
    // Prepare data rows
    const rows = recommendations.map(rec => [
      rec.game,
      rec.betType,
      rec.odds,
      `${rec.confidence}%`,
      rec.prediction,
      new Date(rec.generatedAt).toLocaleString(),
      new Date().toLocaleString()
    ]);
    
    // Write data to sheet
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    // Auto-size columns for better readability
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Add alternating row colors
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        if (i % 2 === 1) {
          sheet.getRange(i + 2, 1, 1, headers.length).setBackground("#f3f3f3");
        }
      }
    }
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: `Successfully exported ${rows.length} recommendations to sheet "${sheetName}"`,
      updatedAt: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

// Process HTTP GET requests - shows a helpful info page when users visit the script URL
function doGet() {
  // Get the active spreadsheet URL and ID to help users
  let spreadsheetUrl = "";
  let spreadsheetId = "";
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheetUrl = ss.getUrl();
    spreadsheetId = ss.getId();
  } catch (e) {
    spreadsheetUrl = "Unable to determine spreadsheet URL. Make sure you're running this script from your Google Sheet.";
    spreadsheetId = "Unable to determine spreadsheet ID.";
  }
  
  // Create a simple HTML page with instructions and the spreadsheet link
  const htmlOutput = HtmlService.createHtmlOutput(`
    <html>
      <head>
        <title>MLB Betting Recommendations - Google Apps Script</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #4285F4; }
          .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          a { color: #4285F4; }
          code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
          .copy-button { background-color: #4285F4; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px; }
          .id-box { background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; border: 1px solid #ddd; }
        </style>
        <script>
          function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
              alert('Spreadsheet ID copied to clipboard!');
            }, function() {
              alert('Failed to copy. Please select and copy the ID manually.');
            });
          }
        </script>
      </head>
      <body>
        <h1>MLB Betting Recommendations - Google Apps Script</h1>
        
        <div class="success">
          <strong>✓ Success!</strong> Your Google Apps Script is properly deployed and ready to receive data from the MLB Betting Recommendations application.
        </div>
        
        <div class="info">
          <strong>Your Google Spreadsheet:</strong><br>
          <a href="${spreadsheetUrl}" target="_blank">${spreadsheetUrl}</a>
        </div>
        
        <div class="warning">
          <strong>IMPORTANT: Spreadsheet ID Required</strong>
          <p>To use this script in production, you must provide your Spreadsheet ID in the Settings of the MLB Betting app.</p>
          <p>Your Spreadsheet ID is:</p>
          <div class="id-box" id="spreadsheetId">${spreadsheetId}</div>
          <button class="copy-button" onclick="copyToClipboard('${spreadsheetId}')">Copy ID</button>
          <p>Add this ID to the <strong>Spreadsheet ID</strong> field in your app's Settings page, along with the Apps Script URL.</p>
        </div>
        
        <h2>How this works:</h2>
        <p>
          This script is connected to your MLB Betting Recommendations application. When you click "Export to Google Sheets" 
          in the application, your betting recommendations will be sent directly to this script, which will then create or update 
          a sheet in your Google Spreadsheet with the latest data.
        </p>
        
        <h2>Important Notes:</h2>
        <ul>
          <li>This page appears when you visit the script URL directly in your browser</li>
          <li>The actual data transfer happens through POST requests from the application</li>
          <li>A new sheet tab will be created for each day's recommendations (format: <code>MLB Betting Recommendations YYYY-MM-DD</code>)</li>
          <li>If you encounter any issues, you can check the Execution Log in the Apps Script editor</li>
          <li><strong>The Spreadsheet ID is required</strong> for the integration to work properly in production</li>
        </ul>
        
        <p>Return to your MLB Betting Recommendations application to continue.</p>
      </body>
    </html>
  `);
  
  return htmlOutput;
}

/**
 * Test function - can be run directly from the Apps Script editor
 * to test the functionality with sample data
 */
function testWithSampleData() {
  // Use today's date for the test sheet name
  const today = new Date().toISOString().split('T')[0];
  
  // Try to get the current spreadsheet ID
  let currentSpreadsheetId = "";
  try {
    currentSpreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (e) {
    Logger.log("Could not get active spreadsheet ID, using test ID instead");
    currentSpreadsheetId = "REPLACE_WITH_YOUR_SPREADSHEET_ID"; // Users should replace this with their actual ID
  }
  
  const sampleData = {
    recommendations: [
      {
        game: "New York Yankees vs Boston Red Sox",
        betType: "Moneyline",
        odds: "-150",
        confidence: 75,
        prediction: "Yankees Win",
        generatedAt: new Date().toISOString()
      },
      {
        game: "Los Angeles Dodgers vs San Francisco Giants",
        betType: "Run Line (-1.5)",
        odds: "+120",
        confidence: 65,
        prediction: "Dodgers Cover",
        generatedAt: new Date().toISOString()
      }
    ],
    spreadsheetId: currentSpreadsheetId, // Include the spreadsheet ID
    sheetName: `MLB Betting Recommendations ${today}`
  };
  
  // Simulate a POST request
  const mockE = {
    postData: {
      contents: JSON.stringify(sampleData)
    }
  };
  
  // Process the mock request
  const result = doPost(mockE);
  
  // Log the result
  Logger.log(result.getContent());
}