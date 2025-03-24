import { csvRowSchema, type CsvRow, type InsertGame } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Parse CSV file content into an array of row objects
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

      // Add the row to our list (we're using a flexible schema now)
      rows.push(row);
    }

    return rows;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    throw error;
  }
}

// Convert CSV rows to InsertGame objects - with more flexible mapping
export function convertToGames(rows: CsvRow[]): InsertGame[] {
  return rows.map(row => {
    // Try to identify key fields using various possible header names
    const homeTeam = row.homeTeam || row.home_team || row.HomeTeam || row["Home Team"] || "";
    const awayTeam = row.awayTeam || row.away_team || row.AwayTeam || row["Away Team"] || "";
    const gameTimeStr = row.gameTime || row.game_time || row.GameTime || row["Game Time"] || row.date || row.Date || "";
    const homeOdds = row.homeOdds || row.home_odds || row.HomeOdds || row["Home Odds"] || "";
    const awayOdds = row.awayOdds || row.away_odds || row.AwayOdds || row["Away Odds"] || "";
    const overUnderLine = row.overUnderLine || row.over_under_line || row.OverUnderLine || row["Over/Under Line"] || row["O/U Line"] || "";
    const overUnderOdds = row.overUnderOdds || row.over_under_odds || row.OverUnderOdds || row["Over/Under Odds"] || row["O/U Odds"] || "";
    
    // Parse date with error handling
    let gameTime: Date;
    try {
      gameTime = new Date(gameTimeStr);
      if (isNaN(gameTime.getTime())) {
        // If parsing fails, use current date
        gameTime = new Date();
      }
    } catch (e) {
      gameTime = new Date();
    }
    
    return {
      homeTeam,
      awayTeam,
      gameTime,
      homeOdds,
      awayOdds,
      overUnderLine,
      overUnderOdds
    };
  });
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
