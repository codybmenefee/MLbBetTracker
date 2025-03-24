import { Recommendation } from "@shared/schema";

/**
 * Creates a CSV formatted string from recommendations data
 * @param recommendations Array of recommendation objects
 * @returns CSV formatted string with headers
 */
export function formatRecommendationsAsCSV(recommendations: Recommendation[]): string {
  if (!recommendations || recommendations.length === 0) {
    return "";
  }

  // Define headers
  const headers = ["Game", "Bet Type", "Odds", "Confidence", "Prediction", "Generated At"];
  
  // Create rows for each recommendation
  const rows = recommendations.map(rec => {
    return [
      rec.game,
      rec.betType,
      rec.odds,
      `${rec.confidence}%`,
      rec.prediction,
      new Date(rec.generatedAt).toLocaleString()
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  return csvContent;
}

/**
 * Copies recommendations data to clipboard as CSV
 * @param recommendations Array of recommendation objects
 * @returns Promise resolving to true if successful
 */
export async function copyRecommendationsToClipboard(recommendations: Recommendation[]): Promise<boolean> {
  try {
    const csv = formatRecommendationsAsCSV(recommendations);
    
    if (!csv) {
      console.error("No data to copy to clipboard");
      return false;
    }
    
    // Copy to clipboard using Clipboard API
    await navigator.clipboard.writeText(csv);
    console.log("Recommendations copied to clipboard as CSV");
    return true;
  } catch (error) {
    console.error("Failed to copy recommendations to clipboard:", error);
    return false;
  }
}

/**
 * Creates a formatted table for Google Sheets and copies it to clipboard
 * @param recommendations Array of recommendation objects
 * @returns Promise resolving to true if successful
 */
export async function prepareDataForGoogleSheets(recommendations: Recommendation[]): Promise<boolean> {
  try {
    if (!recommendations || recommendations.length === 0) {
      console.error("No recommendations to export");
      return false;
    }
    
    // Format as tab-separated values which paste better into Google Sheets
    const headers = ["Game", "Bet Type", "Odds", "Confidence", "Prediction", "Generated At"];
    
    const rows = recommendations.map(rec => {
      return [
        rec.game,
        rec.betType,
        rec.odds,
        `${rec.confidence}%`,
        rec.prediction,
        new Date(rec.generatedAt).toLocaleString()
      ];
    });
    
    // Use tabs as separators for better Google Sheets pasting
    const tsvContent = [
      headers.join("\t"),
      ...rows.map(row => row.join("\t"))
    ].join("\n");
    
    await navigator.clipboard.writeText(tsvContent);
    console.log("Recommendations copied to clipboard in Google Sheets format");
    return true;
  } catch (error) {
    console.error("Failed to prepare data for Google Sheets:", error);
    return false;
  }
}