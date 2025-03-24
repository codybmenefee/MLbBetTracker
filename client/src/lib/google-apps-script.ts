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
  sheetName: string = ""  // Empty default to force using dynamic date in the Apps Script
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
 * Interactive helper to guide users through setting up the Google Apps Script
 */
export function showGoogleAppsScriptSetupGuide() {
  toast({
    title: "Google Sheets Integration Guide",
    description: "We'll walk you through setting up direct export to Google Sheets step-by-step.",
    duration: 6000,
  });
  
  setTimeout(() => {
    toast({
      title: "Step 1: Create Apps Script",
      description: "Open your Google Sheet and go to Extensions > Apps Script in the top menu.",
      duration: 6000,
    });
  }, 1000);
  
  setTimeout(() => {
    toast({
      title: "Step 2: Copy the Code",
      description: "Use the Copy Code button on the Settings page to copy the Apps Script code.",
      duration: 6000,
    });
  }, 7000);
  
  setTimeout(() => {
    toast({
      title: "Step 3: Replace Editor Content",
      description: "In the Apps Script editor, replace any existing code with the copied code and click Save (disk icon).",
      duration: 6000,
    });
  }, 13000);
  
  setTimeout(() => {
    toast({
      title: "Step 4: Deploy as Web App",
      description: "Click Deploy > New deployment. Select Web app type, set 'Execute as: Me' and 'Anyone has access'.",
      duration: 7000,
    });
  }, 19000);
  
  setTimeout(() => {
    toast({
      title: "Step 5: Authorize and Copy URL",
      description: "Click Deploy, authorize when prompted, then copy the Web app URL (ends with /exec).",
      duration: 7000,
    });
  }, 26000);
  
  setTimeout(() => {
    toast({
      title: "Step 6: Save in Settings",
      description: "Paste the URL in the form below and click Save Settings to complete the setup.",
      duration: 7000,
    });
  }, 33000);
  
  setTimeout(() => {
    toast({
      title: "Success!",
      description: "Once configured, you can export directly to Google Sheets with one click from the recommendations screen.",
      duration: 7000,
    });
  }, 40000);
}

/**
 * Checks if a URL is a valid Google Apps Script web app URL
 * 
 * A valid Apps Script web app URL should be in the format:
 * https://script.google.com/macros/s/SCRIPT_ID/exec
 */
export function isValidGoogleAppsScriptUrl(url: string): boolean {
  if (!url) return false;
  
  // More flexible format check - should ideally end with /exec but we'll be forgiving
  // The standard format ends with /exec
  const isStrictFormat = /https:\/\/script\.google\.com\/macros\/[s|e]\/[\w-]+\/exec$/.test(url);
  
  if (isStrictFormat) {
    return true; // Perfect URL format, no warnings needed
  }
  
  // If it's not in the perfect format, try to validate a more general format
  const match = url.match(/https:\/\/script\.google\.com\/macros\/[s|e]\/[\w-]+/);
  
  if (match) {
    const baseUrl = match[0]; 
    
    // If URL ends with something other than /exec (like /edit, /dev, etc.)
    if (/\/\w+$/.test(url) && !url.endsWith('/exec')) {
      console.warn("Google Apps Script URL doesn't end with '/exec'. Auto-correction will be applied when exporting.");
      
      // If the URL appears to be a library URL (ends with /2, /1, etc.)
      if (/\/\d+$/.test(url)) {
        console.warn("This appears to be a Google Script library URL, not a deployed web app URL, but we'll try to use it.");
      }
      
      // Allow non-standard URLs to prevent excessive validation errors
      return true;
    }
    
    // If the URL is missing the /exec entirely
    else if (baseUrl === url) {
      console.warn("Google Apps Script URL is missing '/exec' at the end. Auto-correction will be applied when exporting.");
      return true;
    }
    
    // Any other URL that matches the base pattern is also acceptable
    return true;
  }
  
  console.error("Invalid Google Apps Script URL format. The URL should be from a deployed Google Apps Script web app.");
  return false;
}