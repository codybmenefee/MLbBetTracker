import { 
  games, type Game, type InsertGame,
  recommendations, type Recommendation, type InsertRecommendation,
  exports, type Export, type InsertExport,
  bankrollSettings, type BankrollSettings, type InsertBankrollSettings,
  betHistory, type BetHistory, type InsertBetHistory,
  type UpdateBetResult
} from "@shared/schema";
import fs from 'fs';
import path from 'path';
import { log } from './vite';

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
  protected gamesData: Map<number, Game>;
  protected recommendationsData: Map<number, Recommendation>;
  protected exportsData: Map<number, Export>;
  protected bankrollSettingsData: BankrollSettings | undefined;
  protected betHistoryData: Map<number, BetHistory>;
  
  protected gameId: number;
  protected recommendationId: number;
  protected exportId: number;
  protected betHistoryId: number;

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

export class FileStorage extends MemStorage {
  private dataDir: string;
  private gamesFile: string;
  private recommendationsFile: string;
  private exportsFile: string;
  private bankrollFile: string;
  private betsFile: string;
  private countersFile: string;

  constructor(dataDir: string = './data') {
    super();
    this.dataDir = dataDir;
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      log(`Created data directory: ${this.dataDir}`, 'storage');
    }
    
    this.gamesFile = path.join(this.dataDir, 'games.json');
    this.recommendationsFile = path.join(this.dataDir, 'recommendations.json');
    this.exportsFile = path.join(this.dataDir, 'exports.json');
    this.bankrollFile = path.join(this.dataDir, 'bankroll.json');
    this.betsFile = path.join(this.dataDir, 'bets.json');
    this.countersFile = path.join(this.dataDir, 'counters.json');
    
    // Load data from files
    this.loadData();
  }
  
  private loadData() {
    try {
      this.loadGames();
      this.loadRecommendations();
      this.loadExports();
      this.loadBankroll();
      this.loadBets();
      this.loadCounters();
      log('All data loaded successfully', 'storage');
    } catch (error) {
      log(`Error loading data: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  private loadGames() {
    if (fs.existsSync(this.gamesFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.gamesFile, 'utf8'));
        this.gamesData = new Map();
        data.forEach((game: Game) => {
          // Convert string dates back to Date objects
          game.uploadDate = new Date(game.uploadDate);
          if (game.gameTime) game.gameTime = new Date(game.gameTime);
          this.gamesData.set(game.id, game);
        });
        log(`Loaded ${this.gamesData.size} games`, 'storage');
      } catch (error) {
        log(`Error loading games: ${error instanceof Error ? error.message : String(error)}`, 'storage');
      }
    }
  }
  
  private loadRecommendations() {
    if (fs.existsSync(this.recommendationsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.recommendationsFile, 'utf8'));
        this.recommendationsData = new Map();
        data.forEach((rec: Recommendation) => {
          // Convert string dates back to Date objects
          rec.generatedAt = new Date(rec.generatedAt);
          this.recommendationsData.set(rec.id, rec);
        });
        log(`Loaded ${this.recommendationsData.size} recommendations`, 'storage');
      } catch (error) {
        log(`Error loading recommendations: ${error instanceof Error ? error.message : String(error)}`, 'storage');
      }
    }
  }
  
  private loadExports() {
    if (fs.existsSync(this.exportsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.exportsFile, 'utf8'));
        this.exportsData = new Map();
        data.forEach((exp: Export) => {
          // Convert string dates back to Date objects
          exp.exportDate = new Date(exp.exportDate);
          this.exportsData.set(exp.id, exp);
        });
        log(`Loaded ${this.exportsData.size} exports`, 'storage');
      } catch (error) {
        log(`Error loading exports: ${error instanceof Error ? error.message : String(error)}`, 'storage');
      }
    }
  }
  
  private loadBankroll() {
    if (fs.existsSync(this.bankrollFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.bankrollFile, 'utf8'));
        if (data) {
          // Convert string dates back to Date objects
          data.createdAt = new Date(data.createdAt);
          data.updatedAt = new Date(data.updatedAt);
          this.bankrollSettingsData = data;
          log('Loaded bankroll settings', 'storage');
        }
      } catch (error) {
        log(`Error loading bankroll: ${error instanceof Error ? error.message : String(error)}`, 'storage');
      }
    }
  }
  
  private loadBets() {
    if (fs.existsSync(this.betsFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.betsFile, 'utf8'));
        this.betHistoryData = new Map();
        data.forEach((bet: BetHistory) => {
          // Convert string dates back to Date objects
          bet.createdAt = new Date(bet.createdAt);
          bet.updatedAt = new Date(bet.updatedAt);
          this.betHistoryData.set(bet.id, bet);
        });
        log(`Loaded ${this.betHistoryData.size} bets`, 'storage');
      } catch (error) {
        log(`Error loading bets: ${error instanceof Error ? error.message : String(error)}`, 'storage');
      }
    }
  }
  
  private loadCounters() {
    if (fs.existsSync(this.countersFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.countersFile, 'utf8'));
        this.gameId = data.gameId || 1;
        this.recommendationId = data.recommendationId || 1;
        this.exportId = data.exportId || 1;
        this.betHistoryId = data.betHistoryId || 1;
        log('Loaded counters', 'storage');
      } catch (error) {
        log(`Error loading counters: ${error instanceof Error ? error.message : String(error)}`, 'storage');
      }
    }
  }
  
  private saveGames() {
    try {
      const data = Array.from(this.gamesData.values());
      fs.writeFileSync(this.gamesFile, JSON.stringify(data, null, 2));
    } catch (error) {
      log(`Error saving games: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  private saveRecommendations() {
    try {
      const data = Array.from(this.recommendationsData.values());
      fs.writeFileSync(this.recommendationsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      log(`Error saving recommendations: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  private saveExports() {
    try {
      const data = Array.from(this.exportsData.values());
      fs.writeFileSync(this.exportsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      log(`Error saving exports: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  private saveBankroll() {
    try {
      if (this.bankrollSettingsData) {
        fs.writeFileSync(this.bankrollFile, JSON.stringify(this.bankrollSettingsData, null, 2));
      }
    } catch (error) {
      log(`Error saving bankroll: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  private saveBets() {
    try {
      const data = Array.from(this.betHistoryData.values());
      fs.writeFileSync(this.betsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      log(`Error saving bets: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  private saveCounters() {
    try {
      const data = {
        gameId: this.gameId,
        recommendationId: this.recommendationId,
        exportId: this.exportId,
        betHistoryId: this.betHistoryId
      };
      fs.writeFileSync(this.countersFile, JSON.stringify(data, null, 2));
    } catch (error) {
      log(`Error saving counters: ${error instanceof Error ? error.message : String(error)}`, 'storage');
    }
  }
  
  // Override MemStorage methods to persist data
  
  async createGame(game: InsertGame): Promise<Game> {
    const newGame = await super.createGame(game);
    this.saveGames();
    this.saveCounters();
    return newGame;
  }
  
  async clearGames(): Promise<void> {
    await super.clearGames();
    this.saveGames();
    this.saveCounters();
  }
  
  async createGames(gamesArray: InsertGame[]): Promise<Game[]> {
    const newGames = await super.createGames(gamesArray);
    this.saveGames();
    this.saveCounters();
    return newGames;
  }
  
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const newRecommendation = await super.createRecommendation(recommendation);
    this.saveRecommendations();
    this.saveCounters();
    return newRecommendation;
  }
  
  async clearRecommendations(): Promise<void> {
    await super.clearRecommendations();
    this.saveRecommendations();
    this.saveCounters();
  }
  
  async createRecommendations(recommendationsArray: InsertRecommendation[]): Promise<Recommendation[]> {
    const newRecommendations = await super.createRecommendations(recommendationsArray);
    this.saveRecommendations();
    this.saveCounters();
    return newRecommendations;
  }
  
  async createExport(exportData: InsertExport): Promise<Export> {
    const newExport = await super.createExport(exportData);
    this.saveExports();
    this.saveCounters();
    return newExport;
  }
  
  async setBankrollSettings(settings: InsertBankrollSettings): Promise<BankrollSettings> {
    const newSettings = await super.setBankrollSettings(settings);
    this.saveBankroll();
    return newSettings;
  }
  
  async updateBankrollAmount(newAmount: number): Promise<BankrollSettings> {
    const updatedSettings = await super.updateBankrollAmount(newAmount);
    this.saveBankroll();
    return updatedSettings;
  }
  
  async createBet(bet: InsertBetHistory): Promise<BetHistory> {
    const newBet = await super.createBet(bet);
    this.saveBets();
    this.saveCounters();
    return newBet;
  }
  
  async updateBetResult(update: UpdateBetResult): Promise<BetHistory> {
    const updatedBet = await super.updateBetResult(update);
    this.saveBets();
    this.saveBankroll();
    return updatedBet;
  }
}

// Use FileStorage instead of MemStorage for persistence
export const storage = new FileStorage();
