import { apiRequest } from "./queryClient";
import type { Export } from "@shared/schema";

// Export recommendations to Google Sheets via the backend
export async function exportToGoogleSheet(): Promise<Export> {
  try {
    const response = await apiRequest(
      "POST", 
      "/api/exports", 
      { 
        // The backend will handle creating a valid Google Sheet URL
        // In a real implementation, this might include OAuth token or other authentication
        sheetUrl: `https://docs.google.com/spreadsheets/d/${Date.now()}`
      }
    );
    return await response.json();
  } catch (error) {
    console.error("Error exporting to Google Sheets:", error);
    throw error;
  }
}

// Get the latest export from the backend
export async function getLatestExport(): Promise<Export | null> {
  try {
    const response = await apiRequest("GET", "/api/exports/latest", undefined);
    return await response.json();
  } catch (error) {
    if (error instanceof Response && error.status === 404) {
      return null;
    }
    console.error("Error getting latest export:", error);
    throw error;
  }
}
