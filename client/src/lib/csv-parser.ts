import { csvRowSchema, type CsvRow, type InsertGame } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Parse CSV file content into an array of valid game objects
export function parseCSV(csvContent: string): CsvRow[] {
  try {
    // Split CSV content into lines
    const lines = csvContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error("CSV file is empty");
    }

    // Extract headers (first line)
    const headers = lines[0].split(',').map(header => header.trim());

    // Parse data rows
    const rows: CsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(value => value.trim());
      
      // Skip if the row doesn't have the right number of columns
      if (values.length !== headers.length) {
        continue;
      }

      // Create an object from headers and values
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate the row using zod schema
      const validatedRow = csvRowSchema.parse(row);
      rows.push(validatedRow);
    }

    return rows;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    throw error;
  }
}

// Convert CSV rows to InsertGame objects
export function convertToGames(rows: CsvRow[]): InsertGame[] {
  return rows.map(row => ({
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    gameTime: new Date(row.gameTime),
    homeOdds: row.homeOdds,
    awayOdds: row.awayOdds,
    overUnderLine: row.overUnderLine,
    overUnderOdds: row.overUnderOdds
  }));
}

// Upload games to the backend
export async function uploadGames(games: InsertGame[]): Promise<void> {
  try {
    await apiRequest("POST", "/api/games", games);
  } catch (error) {
    console.error("Error uploading games:", error);
    throw error;
  }
}

// Download CSV template
export function downloadTemplate(): void {
  window.open("/api/template", "_blank");
}
