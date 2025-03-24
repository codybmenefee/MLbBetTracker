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
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      mode: "cors" // Note: Google Apps Script web apps support CORS
    });
    
    if (!response.ok) {
      throw new Error(`Error response: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Unknown error when exporting to Google Sheets");
    }
    
    return {
      success: true,
      message: result.message || `Successfully exported ${recommendations.length} recommendations to Google Sheets`
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
 */
export function isValidGoogleAppsScriptUrl(url: string): boolean {
  return /https:\/\/script\.google\.com\/macros\/[s|e]\/\w+\/exec/.test(url);
}