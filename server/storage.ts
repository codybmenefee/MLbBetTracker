import { 
  games, type Game, type InsertGame,
  recommendations, type Recommendation, type InsertRecommendation,
  exports, type Export, type InsertExport
} from "@shared/schema";

export interface IStorage {
  // Game operations
  getGames(): Promise<Game[]>;
  createGame(game: InsertGame): Promise<Game>;
  clearGames(): Promise<void>;
  createGames(games: InsertGame[]): Promise<Game[]>;
  
  // Recommendation operations
  getRecommendations(): Promise<Recommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  clearRecommendations(): Promise<void>;
  createRecommendations(recommendations: InsertRecommendation[]): Promise<Recommendation[]>;
  
  // Export operations
  getExports(): Promise<Export[]>;
  getLatestExport(): Promise<Export | undefined>;
  createExport(exportData: InsertExport): Promise<Export>;
}

export class MemStorage implements IStorage {
  private gamesData: Map<number, Game>;
  private recommendationsData: Map<number, Recommendation>;
  private exportsData: Map<number, Export>;
  private gameId: number;
  private recommendationId: number;
  private exportId: number;

  constructor() {
    this.gamesData = new Map();
    this.recommendationsData = new Map();
    this.exportsData = new Map();
    this.gameId = 1;
    this.recommendationId = 1;
    this.exportId = 1;
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

  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.recommendationId++;
    const newRecommendation: Recommendation = { 
      ...recommendation, 
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
}

export const storage = new MemStorage();
