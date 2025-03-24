# Google Sheets Integration Guide

## Production Implementation with Google Sheets API

For a full production implementation that automatically publishes recommendations to Google Sheets without manual intervention, you'll need to set up the Google Sheets API. Here's how:

### 1. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Sheets API for your project
4. Create credentials:
   - For server-to-server: Create a Service Account and download the JSON key
   - For user authorization: Create an OAuth2 client ID and configure consent screen

### 2. Backend Integration Code

Install the required libraries:

```bash
npm install googleapis
```

Then implement the integration:

```typescript
import { google } from 'googleapis';
import { Recommendation } from '@shared/schema';

// Path to service account credentials file
const CREDENTIALS_PATH = './service-account-key.json';

/**
 * Authenticates with Google Sheets API using a service account
 */
async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

/**
 * Exports recommendations to a Google Sheet
 * @param recommendations Array of recommendations to export
 * @param spreadsheetId The ID of the Google Sheet
 * @param sheetName The name of the tab/sheet
 */
export async function exportRecommendationsToGoogleSheet(
  recommendations: Recommendation[],
  spreadsheetId: string,
  sheetName: string
): Promise<boolean> {
  try {
    // Get auth client
    const authClient = await getAuthClient();
    
    // Create sheets client
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    // Prepare headers and data
    const headers = ['Game', 'Bet Type', 'Odds', 'Confidence', 'Prediction', 'Generated At'];
    const rows = recommendations.map(rec => [
      rec.game,
      rec.betType,
      rec.odds,
      `${rec.confidence}%`,
      rec.prediction,
      new Date(rec.generatedAt).toLocaleString()
    ]);
    
    const values = [headers, ...rows];
    
    // First, check if the sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetExists = spreadsheet.data.sheets?.some(
      sheet => sheet.properties?.title === sheetName
    );
    
    // If sheet doesn't exist, create it
    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });
    }
    
    // Write data to the sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
    
    return true;
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return false;
  }
}
```

### 3. Environment Setup

Make sure to securely store your credentials and set up environment variables:

1. Store the service account key JSON file securely
2. Add environment variables for configuration:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

### 4. Security Considerations

- Keep your service account credentials secure
- Limit the service account's permissions to only what's needed
- For user-based auth, implement proper token storage and refresh

### 5. Production Deployment Steps

1. Set up Google Cloud Project with appropriate APIs enabled
2. Create and download service account credentials
3. Configure your backend with the credentials
4. Deploy your application with secure environment variables
5. Test the integration thoroughly
6. Monitor API usage and quota limits

## Option 2: Google Apps Script (Alternative Approach)

For a simpler but less flexible approach, you could create a Google Apps Script within the target spreadsheet:

1. Open your Google Sheet
2. Go to Extensions > Apps Script
3. Create a web app that accepts POST requests
4. Make your backend call this web app with the recommendation data

This approach is simpler but requires the script to be deployed separately from your main application.