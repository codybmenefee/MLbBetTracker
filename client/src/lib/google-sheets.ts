import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";
import { Export, InsertExport } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

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
  
  // Prepare the export request data
  const exportData: InsertExport = {
    destination: config.googleSheetUrl,
    sheetName: config.googleSheetName || "MLB Betting Recommendations",
    status: "pending"
  };

  // Call the API to create a new export
  const response = await apiRequest<Export>({
    method: "POST",
    url: "/api/exports",
    body: exportData,
  });

  // Invalidate exports cache
  queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
  
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