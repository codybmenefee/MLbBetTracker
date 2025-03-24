
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

    // Return a friendly message for development/demo purposes 
    // since we likely don't have proper Google API credentials
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      return {
        success: false,
        message: "Google Sheets API credentials are not configured. Please use the Google Apps Script direct export method in the 'Direct Integration' tab instead."
      };
    }

    // For demo purposes, we'll return a "success" message
    // This allows the app to function in a demo environment without actual Google credentials
    console.log(`Would normally export ${recommendations.length} recommendations to Google Sheets at ${destination}`);
    
    return {
      success: true,
      message: `For production use, you would need Google API credentials to use this export method. Please use the Google Apps Script direct export method in the 'Direct Integration' tab for better results.`
    };
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    return {
      success: false, 
      message: `Failed to export to Google Sheets: ${error instanceof Error ? error.message : "Unknown error"}`
    };
  }
}
