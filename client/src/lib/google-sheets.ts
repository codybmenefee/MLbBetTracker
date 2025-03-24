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
  if (!configStr) {
    throw new Error("Google Sheets configuration not found. Please configure it in Settings.");
  }

  const config = JSON.parse(configStr);
  
  // Validate Google Sheet URL
  if (!config.googleSheetUrl) {
    throw new Error("Google Sheet URL is missing. Please configure it in Settings.");
  }
  
  if (!config.googleSheetUrl.includes("docs.google.com/spreadsheets")) {
    throw new Error("Invalid Google Sheets URL. Please enter a valid Google Sheets URL in Settings.");
  }
  
  // Prepare the export request data
  const exportData: InsertExport = {
    destination: config.googleSheetUrl,
    sheetName: config.googleSheetName || "MLB Betting Recommendations",
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
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    throw new Error("Failed to fetch recommendations for export");
  }

  // Check if we have the Google Apps Script URL configured for direct export
  const appsScriptUrl = localStorage.getItem("googleAppsScriptUrl");
  let directExportResult = null;
  
  if (appsScriptUrl && isValidGoogleAppsScriptUrl(appsScriptUrl) && recommendations.length > 0) {
    try {
      // Attempt to export directly via Google Apps Script
      directExportResult = await exportToGoogleAppsScript(
        recommendations,
        appsScriptUrl,
        config.googleSheetName || "MLB Betting Recommendations"
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

  // Always call the API to create a new export record (even if direct export was attempted)
  // This ensures we maintain a history of exports in our system
  const response = await apiRequest<Export>({
    method: "POST",
    url: "/api/exports",
    body: exportData,
  });

  // Invalidate exports cache
  queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
  queryClient.invalidateQueries({ queryKey: ["/api/exports/latest"] });
  
  return response;
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