import { BankrollSettings, BetHistory } from "@shared/schema";

/**
 * Formats bankroll settings as CSV
 * @param bankrollSettings Bankroll settings object
 * @returns CSV formatted string with headers
 */
export function formatBankrollAsCSV(bankrollSettings: BankrollSettings): string {
  const headers = ["Initial Amount", "Current Amount", "Created At", "Updated At"];
  
  const row = [
    bankrollSettings.initialAmount.toString(),
    bankrollSettings.currentAmount.toString(),
    new Date(bankrollSettings.createdAt).toLocaleString(),
    new Date(bankrollSettings.updatedAt).toLocaleString()
  ];
  
  return [
    headers.join(","),
    row.join(",")
  ].join("\n");
}

/**
 * Formats bet history as CSV
 * @param bets Array of bet history objects
 * @returns CSV formatted string with headers
 */
export function formatBetsHistoryAsCSV(bets: BetHistory[]): string {
  if (!bets || bets.length === 0) {
    return "";
  }
  
  const headers = [
    "ID",
    "Date",
    "Game",
    "Bet Type",
    "Odds",
    "Confidence",
    "Bet Amount",
    "Predicted Result",
    "Actual Result",
    "Profit/Loss",
    "Bankroll After",
    "Notes",
    "Created At",
    "Updated At"
  ];
  
  const rows = bets.map(bet => [
    bet.id.toString(),
    bet.date.toString(),
    bet.game,
    bet.betType,
    bet.odds,
    bet.confidence.toString(),
    bet.betAmount.toString(),
    bet.predictedResult,
    bet.actualResult,
    bet.profitLoss.toString(),
    bet.bankrollAfter.toString(),
    bet.notes || "",
    new Date(bet.createdAt).toLocaleString(),
    new Date(bet.updatedAt).toLocaleString()
  ].join(","));
  
  return [
    headers.join(","),
    ...rows
  ].join("\n");
}

/**
 * Creates a combined CSV export of bankroll and bet history
 * @param bankrollSettings Bankroll settings object
 * @param bets Array of bet history objects
 * @returns CSV formatted string with both sets of data
 */
export function formatBankrollAndBetsAsCSV(bankrollSettings: BankrollSettings, bets: BetHistory[]): string {
  const bankrollCSV = formatBankrollAsCSV(bankrollSettings);
  const betsCSV = formatBetsHistoryAsCSV(bets);
  
  // Return combined with a separator in between
  return `BANKROLL INFORMATION\n${bankrollCSV}\n\nBETTING HISTORY\n${betsCSV}`;
}

/**
 * Downloads data as a CSV file
 * @param data The CSV data to download
 * @param filename Name of the file to download
 */
export function downloadCSV(data: string, filename: string): void {
  // Create a blob from the data
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a link element
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  
  // Append the link, click it, and remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Release the URL object
  URL.revokeObjectURL(url);
}

/**
 * Exports bankroll and betting data to a CSV file
 * @param bankrollSettings Bankroll settings object
 * @param bets Array of bet history objects
 */
export function exportBankrollAndBetsToCSV(bankrollSettings: BankrollSettings, bets: BetHistory[]): void {
  if (!bankrollSettings) {
    console.error("No bankroll settings to export");
    return;
  }
  
  const csvData = formatBankrollAndBetsAsCSV(bankrollSettings, bets || []);
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(csvData, `mlb-betting-data-${date}.csv`);
}