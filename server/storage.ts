import { 
  games, type Game, type InsertGame,
  recommendations, type Recommendation, type InsertRecommendation,
  exports, type Export, type InsertExport,
  bankrollSettings, type BankrollSettings, type InsertBankrollSettings,
  betHistory, type BetHistory, type InsertBetHistory,
  type UpdateBetResult
} from "@shared/schema";

export interface IStorage {
  // Game operations
  getGames(): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  clearGames(): Promise<void>;
  createGames(games: InsertGame[]): Promise<Game[]>;
  
  // Recommendation operations
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendationById(id: number): Promise<Recommendation | undefined>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  clearRecommendations(): Promise<void>;
  createRecommendations(recommendations: InsertRecommendation[]): Promise<Recommendation[]>;
  
  // Export operations
  getExports(): Promise<Export[]>;
  getLatestExport(): Promise<Export | undefined>;
  createExport(exportData: InsertExport): Promise<Export>;
  
  // Bankroll operations
  getBankrollSettings(): Promise<BankrollSettings | undefined>;
  setBankrollSettings(settings: InsertBankrollSettings): Promise<BankrollSettings>;
  updateBankrollAmount(newAmount: number): Promise<BankrollSettings>;
  
  // Bet history operations
  getBetHistory(): Promise<BetHistory[]>;
  getBetById(id: number): Promise<BetHistory | undefined>;
  createBet(bet: InsertBetHistory): Promise<BetHistory>;
  updateBetResult(update: UpdateBetResult): Promise<BetHistory>;
  getBetsByRecommendationId(recommendationId: number): Promise<BetHistory[]>;
}

export class MemStorage implements IStorage {
  private gamesData: Map<number, Game>;
  private recommendationsData: Map<number, Recommendation>;
  private exportsData: Map<number, Export>;
  private bankrollSettingsData: BankrollSettings | undefined;
  private betHistoryData: Map<number, BetHistory>;
  
  private gameId: number;
  private recommendationId: number;
  private exportId: number;
  private betHistoryId: number;

  constructor() {
    this.gamesData = new Map();
    this.recommendationsData = new Map();
    this.exportsData = new Map();
    this.betHistoryData = new Map();
    this.gameId = 1;
    this.recommendationId = 1;
    this.exportId = 1;
    this.betHistoryId = 1;
  }

  // Game operations
  async getGames(): Promise<Game[]> {
    return Array.from(this.gamesData.values());
  }

  async createGame(game: InsertGame): Promise<Game> {
    const id = this.gameId++;
    const newGame: Game = { 
      ...game, 
      id, 
      source: game.source || 'Manual Upload', // Ensure source is always defined
      uploadDate: new Date() 
    };
    this.gamesData.set(id, newGame);
    return newGame;
  }

  async clearGames(): Promise<void> {
    this.gamesData.clear();
    // Reset the ID counter to ensure clean numbering with each new batch
    this.gameId = 1;
  }

  async createGames(gamesArray: InsertGame[]): Promise<Game[]> {
    const createdGames: Game[] = [];
    for (const game of gamesArray) {
      const createdGame = await this.createGame(game);
      createdGames.push(createdGame);
    }
    return createdGames;
  }

  // Recommendation operations
  async getRecommendations(): Promise<Recommendation[]> {
    return Array.from(this.recommendationsData.values());
  }
  
  async getRecommendationById(id: number): Promise<Recommendation | undefined> {
    return this.recommendationsData.get(id);
  }

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.recommendationId++;
    // Create a new object with defaults for required fields
    const recWithDefaults = {
      // First copy all fields from the input recommendation
      ...recommendation,
      // Then ensure required fields have defaults
      gameSource: 'Manual Input',
      betTypeSource: 'LLM',
      oddsSource: 'LLM',
      confidenceSource: 'LLM',
      predictionSource: 'LLM'
    };
    
    // Now create the final Recommendation with the provided values plus defaults
    const newRecommendation: Recommendation = { 
      ...recWithDefaults,
      id,
      generatedAt: new Date() 
    };
    
    this.recommendationsData.set(id, newRecommendation);
    return newRecommendation;
  }

  async clearRecommendations(): Promise<void> {
    this.recommendationsData.clear();
    // Reset the ID counter to ensure clean numbering with each new batch
    this.recommendationId = 1;
  }

  async createRecommendations(recommendationsArray: InsertRecommendation[]): Promise<Recommendation[]> {
    // Clear existing recommendations
    await this.clearRecommendations();
    
    const createdRecommendations: Recommendation[] = [];
    for (const recommendation of recommendationsArray) {
      const createdRecommendation = await this.createRecommendation(recommendation);
      createdRecommendations.push(createdRecommendation);
    }
    return createdRecommendations;
  }

  // Export operations
  async getExports(): Promise<Export[]> {
    return Array.from(this.exportsData.values()).sort((a, b) => 
      b.exportDate.getTime() - a.exportDate.getTime()
    );
  }

  async getLatestExport(): Promise<Export | undefined> {
    const exports = await this.getExports();
    return exports.length > 0 ? exports[0] : undefined;
  }

  async createExport(exportData: InsertExport): Promise<Export> {
    const id = this.exportId++;
    const newExport: Export = { 
      ...exportData, 
      id, 
      exportDate: new Date(),
      errorMessage: exportData.errorMessage || null,
      exportedData: exportData.exportedData || null
    };
    this.exportsData.set(id, newExport);
    return newExport;
  }
  
  // Bankroll operations
  async getBankrollSettings(): Promise<BankrollSettings | undefined> {
    return this.bankrollSettingsData;
  }
  
  async setBankrollSettings(settings: InsertBankrollSettings): Promise<BankrollSettings> {
    const now = new Date();
    this.bankrollSettingsData = {
      id: 1,
      initialAmount: settings.initialAmount,
      currentAmount: settings.currentAmount,
      createdAt: now,
      updatedAt: now
    };
    return this.bankrollSettingsData;
  }
  
  async updateBankrollAmount(newAmount: number): Promise<BankrollSettings> {
    if (!this.bankrollSettingsData) {
      throw new Error("Bankroll settings not initialized");
    }
    
    this.bankrollSettingsData = {
      ...this.bankrollSettingsData,
      currentAmount: newAmount,
      updatedAt: new Date()
    };
    
    return this.bankrollSettingsData;
  }
  
  // Bet history operations
  async getBetHistory(): Promise<BetHistory[]> {
    return Array.from(this.betHistoryData.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getBetById(id: number): Promise<BetHistory | undefined> {
    return this.betHistoryData.get(id);
  }
  
  async createBet(bet: InsertBetHistory): Promise<BetHistory> {
    const id = this.betHistoryId++;
    const now = new Date();
    
    const newBet: BetHistory = {
      ...bet,
      id,
      createdAt: now,
      updatedAt: now,
      // Make sure these are set even if not provided
      notes: bet.notes || null,
      actualResult: bet.actualResult || "pending",
      profitLoss: bet.profitLoss || 0
    };
    
    this.betHistoryData.set(id, newBet);
    return newBet;
  }
  
  async updateBetResult(update: UpdateBetResult): Promise<BetHistory> {
    const bet = this.betHistoryData.get(update.id);
    if (!bet) {
      throw new Error(`Bet with ID ${update.id} not found`);
    }
    
    // Calculate profit/loss based on the result and odds
    let profitLoss = 0;
    if (update.actualResult === "win") {
      // Calculate profit based on American odds
      const odds = bet.odds;
      if (odds.startsWith("+")) {
        // Positive odds (e.g. +150): For every $100 bet, you win the odds value
        const oddsValue = parseInt(odds.substring(1));
        profitLoss = bet.betAmount * (oddsValue / 100);
      } else {
        // Negative odds (e.g. -110): You need to bet the absolute odds value to win $100
        const oddsValue = Math.abs(parseInt(odds));
        profitLoss = bet.betAmount * (100 / oddsValue);
      }
    } else if (update.actualResult === "loss") {
      profitLoss = -bet.betAmount;
    }
    
    // Get current bankroll
    const bankrollSettings = await this.getBankrollSettings();
    if (!bankrollSettings) {
      throw new Error("Bankroll settings not initialized");
    }
    
    // Calculate new bankroll
    const newBankrollAmount = bankrollSettings.currentAmount + profitLoss;
    
    // Update bankroll
    await this.updateBankrollAmount(newBankrollAmount);
    
    // Update and return the bet
    const updatedBet: BetHistory = {
      ...bet,
      actualResult: update.actualResult,
      profitLoss,
      bankrollAfter: newBankrollAmount,
      notes: update.notes || bet.notes,
      updatedAt: new Date()
    };
    
    this.betHistoryData.set(update.id, updatedBet);
    return updatedBet;
  }
  
  async getBetsByRecommendationId(recommendationId: number): Promise<BetHistory[]> {
    return Array.from(this.betHistoryData.values())
      .filter(bet => bet.recommendationId === recommendationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();
