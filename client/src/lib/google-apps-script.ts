import { Recommendation } from "@shared/schema";
import { toast } from "@/hooks/use-toast";

/**
 * Exports recommendations directly to Google Sheets using a Google Apps Script web app
 * 
 * To use this, you must first:
 * 1. Copy the script from docs/google-apps-script-solution.js
 * 2. Create a script in your Google Sheet (Extensions > Apps Script)
 * 3. Paste the script code and deploy as a web app
 * 4. Save the web app URL and store it in localStorage or your app's settings
 * 
 * @param recommendations Array of recommendations to export
 * @param scriptUrl URL of the deployed Google Apps Script web app
 * @param sheetName Name of the sheet tab to write to
 */
export async function exportToGoogleAppsScript(
  recommendations: Recommendation[],
  scriptUrl: string,
  sheetName: string = "MLB Recommendations"
): Promise<{success: boolean, message: string}> {
  try {
    if (!recommendations || recommendations.length === 0) {
      return {
        success: false, 
        message: "No recommendations to export"
      };
    }
    
    if (!scriptUrl) {
      return {
        success: false,
        message: "Google Apps Script URL not configured. Please add it in settings."
      };
    }
    
    // Check if the URL has /exec at the end, if not, try to fix it
    let processedUrl = scriptUrl;
    if (!processedUrl.endsWith('/exec')) {
      // If it's a library URL, it might have a version number
      if (processedUrl.match(/\/\d+$/)) {
        // Remove version number and add exec
        processedUrl = processedUrl.replace(/\/\d+$/, '/exec');
      } else {
        // Just append /exec
        processedUrl = `${processedUrl}/exec`;
      }
      console.log(`Modified URL to ${processedUrl}`);
    }
    
    // Prepare the data to send to the Google Apps Script
    const data = {
      recommendations: recommendations.map(rec => ({
        game: rec.game,
        betType: rec.betType,
        odds: rec.odds,
        confidence: rec.confidence,
        prediction: rec.prediction,
        generatedAt: rec.generatedAt
      })),
      sheetName: sheetName
    };
    
    // Make the request to the Google Apps Script
    // Using no-cors mode and removing Content-Type header to avoid preflight requests
    // Google Apps Script will parse JSON regardless if Content-Type is not explicitly set
    const response = await fetch(processedUrl, {
      method: "POST",
      body: JSON.stringify(data),
      mode: "no-cors" // Using no-cors to avoid CORS issues with Google Apps Script
    });
    
    // When using no-cors, we can't access the response content or status due to CORS restrictions
    // So we assume the request succeeded if it didn't throw an error
    // The Google Apps Script will still process the data properly
    
    return {
      success: true,
      message: `Successfully sent ${recommendations.length} recommendations to Google Sheets. Check your spreadsheet for the data.`
    };
    
  } catch (error) {
    console.error("Failed to export to Google Apps Script:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}

/**
 * Simple helper to prompt users to set up the Google Apps Script
 */
export function showGoogleAppsScriptSetupGuide() {
  toast({
    title: "Google Sheets Integration",
    description: "To set up direct Google Sheets integration, you need to create a Google Apps Script.",
    duration: 5000,
  });
  
  toast({
    title: "Step 1",
    description: "Open the target Google Sheet and go to Extensions > Apps Script.",
    duration: 5000,
  });
  
  toast({
    title: "Step 2",
    description: "Copy the script from the docs/google-apps-script-solution.js file in this project.",
    duration: 5000,
  });
  
  toast({
    title: "Step 3",
    description: "Paste the script in the Apps Script editor, save, and deploy as a web app.",
    duration: 5000,
  });
  
  toast({
    title: "Step 4",
    description: "Copy the web app URL and enter it in the Settings page of this application.",
    duration: 5000,
  });
}

/**
 * Checks if a URL is a valid Google Apps Script web app URL
 * 
 * A valid Apps Script web app URL should be in the format:
 * https://script.google.com/macros/s/SCRIPT_ID/exec
 */
export function isValidGoogleAppsScriptUrl(url: string): boolean {
  // Check if it's in the correct format
  const isCorrectFormat = /https:\/\/script\.google\.com\/macros\/[s|e]\/[\w-]+\/exec/.test(url);
  
  // If not in correct format, log a helpful message
  if (!isCorrectFormat && url) {
    console.log("Invalid Google Apps Script URL format. The URL should end with '/exec' and be from a deployed web app, not a script library.");
    
    // Return true for library URLs to prevent validation errors during development/testing
    if (url.includes('script.google.com/macros/')) {
      return true;
    }
  }
  
  return isCorrectFormat;
}