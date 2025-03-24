
import { google } from 'googleapis';
import { Recommendation } from '@shared/schema';

/**
 * Extracts the spreadsheet ID from a Google Sheets URL
 */
export function extractSpreadsheetId(url: string): string | null {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Exports recommendations to a Google Sheet
 */
export async function exportRecommendationsToSheet(
  recommendations: Recommendation[],
  destination: string,
  sheetName: string
): Promise<{success: boolean, message: string}> {
  try {
    const spreadsheetId = extractSpreadsheetId(destination);
    if (!spreadsheetId) {
      return {
        success: false,
        message: "Invalid Google Sheets URL. Could not extract spreadsheet ID."
      };
    }

    // Initialize the Sheets API client
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      credentials
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
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

    // Check if sheet exists
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    const sheetExists = spreadsheet.data.sheets?.some(
      sheet => sheet.properties?.title === sheetName
    );

    // Create sheet if it doesn't exist
    if (!sheetExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: sheetName }
            }
          }]
        }
      });
    }

    // Write data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    console.log(`Successfully exported ${recommendations.length} recommendations to Google Sheets`);
    
    return {
      success: true,
      message: `Successfully exported ${recommendations.length} recommendations to Google Sheets`
    };
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return {
      success: false, 
      message: `Failed to export to Google Sheets: ${error.message}`
    };
  }
}
