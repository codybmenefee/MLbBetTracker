import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import { Export, InsertExport, Recommendation } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { exportToGoogleAppsScript, isValidGoogleAppsScriptUrl } from "./google-apps-script";
import { toast } from "@/hooks/use-toast";

/**
 * Exports the current recommendations to a Google Sheet
 * Using the configuration stored in localStorage
 */
export async function exportToGoogleSheet(): Promise<Export> {
  // Get the Google Sheets configuration from localStorage
  const configStr = localStorage.getItem("googleSheetsConfig");
  let config = { googleSheetUrl: "" };
  
  // Check for Google Apps Script URL - we'll prioritize direct integration if available
  const appsScriptUrl = localStorage.getItem("googleAppsScriptUrl");
  const spreadsheetId = localStorage.getItem("googleSpreadsheetId");
  const hasDirectIntegration = appsScriptUrl && isValidGoogleAppsScriptUrl(appsScriptUrl);
  
  // If we have direct integration but no Google Sheets config, create a config with the actual sheet URL
  if (hasDirectIntegration && !configStr) {
    // Check if we have a spreadsheetId to construct the actual Google Sheets URL
    let sheetUrl = "";
    
    if (spreadsheetId) {
      // Construct an actual Google Sheets URL from the spreadsheetId
      sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    } else {
      // If no spreadsheetId is available, we'll use the script URL as a fallback
      // but mark it specially so we can handle it differently for redirection
      sheetUrl = appsScriptUrl.replace("/exec", "").concat("?source=direct-integration");
    }
    
    // Show a toast explaining what's happening
    toast({
      title: "Using Google Apps Script Integration",
      description: "Your data will be sent directly to your Google Sheet using the Apps Script integration.",
      duration: 5000,
    });
    
    // Store a record with either the actual sheet URL or a special URL
    config = { 
      googleSheetUrl: sheetUrl
    };
  } else if (!configStr) {
    throw new Error("Google Sheets configuration not found and no Apps Script integration is set up. Please configure in Settings.");
  } else {
    config = JSON.parse(configStr);
    
    // Basic validation
    if (!config.googleSheetUrl) {
      throw new Error("Google Sheet URL is missing. Please configure it in Settings.");
    }
    
    if (!config.googleSheetUrl.includes("docs.google.com/spreadsheets")) {
      throw new Error("Invalid Google Sheets URL. Please enter a valid Google Sheets URL in Settings.");
    }
  }
  
  // Get today's date in format 'YYYY-MM-DD'
  const today = new Date().toISOString().split('T')[0];
  
  // Always use today's date in the sheet name
  const sheetName = `MLB Betting Recommendations ${today}`;
  
  // Prepare the export request data
  const exportData: InsertExport = {
    destination: config.googleSheetUrl,
    sheetName: sheetName,
    status: "pending"
  };

  // Get recommendations to export
  let recommendations: Recommendation[] = [];
  try {
    const response = await apiRequest<Recommendation[]>({
      method: "GET",
      url: "/api/recommendations",
    });
    recommendations = response;
    
    // Check if we have any recommendations to export
    if (!recommendations || recommendations.length === 0) {
      toast({
        title: "No Recommendations",
        description: "There are no recommendations to export. Generate recommendations first.",
        variant: "destructive",
      });
      throw new Error("No recommendations to export");
    }
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch recommendations for export");
  }

  // We already checked for the Google Apps Script URL above, no need to fetch it again
  // Just reuse the hasDirectIntegration variable we already set
  let directExportResult = null;
  
  if (hasDirectIntegration && recommendations.length > 0) {
    try {
      // Attempt to export directly via Google Apps Script
      // Always use the dynamic sheet name with today's date
      directExportResult = await exportToGoogleAppsScript(
        recommendations,
        appsScriptUrl || "", // Ensure appsScriptUrl is never null
        sheetName,
        spreadsheetId || undefined // Ensure spreadsheetId is either string or undefined
      );
      
      if (directExportResult.success) {
        toast({
          title: "Direct Export Successful",
          description: directExportResult.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Direct Export Failed",
          description: directExportResult.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in direct export:", error);
      toast({
        title: "Direct Export Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  }

  // If direct export was successful via Google Apps Script, mark the export data as completed
  if (directExportResult && directExportResult.success) {
    exportData.status = "completed";
    // Use errorMessage property from InsertExport schema to store success message
    exportData.errorMessage = "Successfully exported via Google Apps Script. The data should be visible in your spreadsheet.";
    
    try {
      // Create an export record to track the successful export
      const response = await apiRequest<Export>({
        method: "POST",
        url: "/api/exports",
        body: exportData,
      });
  
      // Invalidate exports cache
      queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exports/latest"] });
      
      return response;
    } catch (error) {
      // If the API call fails but the direct export was successful,
      // create a fake successful export to return to the client
      console.warn("Export API call failed, but direct export was successful:", error);
      return {
        id: 0,
        destination: exportData.destination,
        sheetName: exportData.sheetName,
        status: "completed",
        exportDate: new Date(),  // Fixed: use Date object instead of string
        errorMessage: "Direct export was successful. Data should appear in your spreadsheet.",
        exportedData: null,
        message: "Direct export was successful. Data should appear in your spreadsheet." // For client display
      };
    }
  }
  
  // If no direct export or direct export failed, proceed with the normal export process
  try {
    const response = await apiRequest<Export>({
      method: "POST",
      url: "/api/exports",
      body: exportData,
    });
  
    // Invalidate exports cache
    queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
    queryClient.invalidateQueries({ queryKey: ["/api/exports/latest"] });
    
    return response;
  } catch (error) {
    // Check if server-side export failed but we had a successful direct export
    if (directExportResult && directExportResult.success) {
      return {
        id: 0,
        destination: exportData.destination,
        sheetName: exportData.sheetName,
        status: "completed",
        exportDate: new Date(),  // Fixed: use Date object instead of string
        message: "Direct export was successful. Data should appear in your spreadsheet."
      };
    }
    
    // Re-throw the error for regular failures
    throw error;
  }
}

/**
 * Gets the latest export record from the API
 */
export async function getLatestExport(): Promise<Export | null> {
  try {
    const response = await apiRequest<Export>({
      method: "GET",
      url: "/api/exports/latest",
      on401: "returnNull",
    });
    
    return response;
  } catch (error) {
    console.error("Error fetching latest export:", error);
    return null;
  }
}

/**
 * React query hook to get the latest export record
 */
export function useLatestExport() {
  return useQuery<Export>({
    queryKey: ["/api/exports/latest"],
    refetchInterval: 10000, // Refetch every 10 seconds to check for status updates
  });
}