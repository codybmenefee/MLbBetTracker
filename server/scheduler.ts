import { refreshMLBGames } from './odds-api';
import { IStorage } from './storage';
import { insertGameSchema, InsertGame, insertRecommendationSchema } from '@shared/schema';
import OpenAI from 'openai';

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let scheduledRefreshTimeout: NodeJS.Timeout | null = null;
let lastScheduledTime: string | null = null;

/**
 * Scheduler service to manage automatic daily refreshes of game data and recommendations
 */
export class Scheduler {
  private storage: IStorage;
  private refreshTime: string = '07:00'; // Default to 7:00 AM (in 24-hour format)
  private timeZone: string = 'America/New_York'; // Default to EST/EDT
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Initialize the scheduler with settings from storage or environment
   */
  async initialize() {
    // Load saved settings if available
    const savedRefreshTime = process.env.REFRESH_TIME || '07:00';
    this.setRefreshTime(savedRefreshTime);
    
    console.log(`[Scheduler] Initialized with refresh time: ${this.refreshTime} ${this.timeZone}`);
    this.scheduleNextRefresh();
  }
  
  /**
   * Set the daily refresh time
   * @param time Time in 24-hour format (HH:MM)
   */
  setRefreshTime(time: string) {
    // Validate time format
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      console.error(`[Scheduler] Invalid time format: ${time}. Using default instead.`);
      return;
    }
    
    this.refreshTime = time;
    console.log(`[Scheduler] Refresh time updated to: ${this.refreshTime} ${this.timeZone}`);
    
    // Update the schedule with the new time
    this.scheduleNextRefresh();
    
    // Return true to indicate success
    return true;
  }
  
  /**
   * Get the current refresh time
   */
  getRefreshTime() {
    return {
      time: this.refreshTime,
      timeZone: this.timeZone
    };
  }
  
  /**
   * Schedule the next refresh based on the configured time
   */
  scheduleNextRefresh() {
    // Clear any existing scheduled refresh
    if (scheduledRefreshTimeout) {
      clearTimeout(scheduledRefreshTimeout);
      scheduledRefreshTimeout = null;
    }
    
    // Get current time and scheduled time
    const now = new Date();
    const [hours, minutes] = this.refreshTime.split(':').map(Number);
    
    // Create a date object for today with the scheduled time
    const scheduledTime = new Date(now);
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the scheduled time has passed for today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // Calculate the delay until the next refresh
    const delay = scheduledTime.getTime() - now.getTime();
    
    // Schedule the refresh
    scheduledRefreshTimeout = setTimeout(() => this.performRefresh(), delay);
    lastScheduledTime = scheduledTime.toISOString();
    
    console.log(`[Scheduler] Next refresh scheduled for: ${scheduledTime.toLocaleString('en-US', { timeZone: this.timeZone })}`);
    
    return scheduledTime;
  }
  
  /**
   * Perform the refresh operation (fetch games and generate recommendations)
   */
  async performRefresh() {
    console.log(`[Scheduler] Starting automatic refresh at ${new Date().toLocaleString('en-US', { timeZone: this.timeZone })}`);
    
    try {
      // Check for API key
      const apiKey = process.env.ODDS_API_KEY;
      if (!apiKey) {
        console.error('[Scheduler] Missing ODDS_API_KEY. Cannot perform refresh.');
        return;
      }
      
      // Clear existing games
      await this.storage.clearGames();
      
      // Fetch and store new games
      const storeGamesFunction = async (games: any[]) => {
        // Validate each game in the array
        const validatedGames = [];
        
        for (const game of games) {
          try {
            const validatedData = insertGameSchema.parse(game);
            validatedGames.push(validatedData);
          } catch (error) {
            console.error('[Scheduler] Game validation error:', error);
          }
        }
        
        return await this.storage.createGames(validatedGames);
      };
      
      // Fetch games from The Odds API
      const refreshedGames = await refreshMLBGames(apiKey, storeGamesFunction);
      
      console.log(`[Scheduler] Fetched ${refreshedGames.length} games`);
      
      if (refreshedGames.length === 0) {
        console.log('[Scheduler] No games found. Skipping recommendation generation.');
        return;
      }
      
      // Generate recommendations based on the new games
      await this.generateRecommendations(refreshedGames);
      
    } catch (error) {
      console.error('[Scheduler] Error during automatic refresh:', error);
    } finally {
      // Schedule the next refresh
      this.scheduleNextRefresh();
    }
  }
  
  /**
   * Generate recommendations from games data
   */
  private async generateRecommendations(games: InsertGame[]) {
    try {
      // Check for OpenAI API key
      if (!process.env.OPENAI_API_KEY) {
        console.error('[Scheduler] Missing OPENAI_API_KEY. Cannot generate recommendations.');
        return;
      }
      
      // Format games for OpenAI prompt
      const gamesForPrompt = games.map(game => ({
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameTime: game.gameTime,
        homeOdds: game.homeOdds,
        awayOdds: game.awayOdds,
        overUnderLine: game.overUnderLine,
        overUnderOdds: game.overUnderOdds,
        source: game.source || "The Odds API"
      }));
      
      // Create prompt for OpenAI
      const prompt = `
You are a professional sports betting analyst. Given the following MLB games scheduled, 
please provide betting recommendations for all games.

The games data below has been provided from The Odds API live integration, not generated by you.

Games data:
${JSON.stringify(gamesForPrompt, null, 2)}

For each recommendation, provide:
1. Game (as "Team A vs. Team B")
2. Bet Type (Moneyline, Over/Under, Run Line with value)
3. Odds (in American format)
4. Confidence (as a percentage from 1-100%)
5. Prediction (simple outcome like "Team A Win", "Over", "Team B Cover")

Return your recommendations in exactly this JSON format, with no deviations:
{
  "recommendations": [
    {
      "game": "Team A vs. Team B",
      "betType": "Moneyline",
      "odds": "+150",
      "confidence": 75,
      "prediction": "Team A Win"
    },
    ... (more recommendations)
  ]
}

CRITICAL REQUIREMENTS:
- You MUST respond with valid JSON only. No explanations or text outside the JSON.
- Your response must follow the exact format shown above.
- "recommendations" must be an array with one object for EACH game in the data provided.
- Each recommendation must have exactly these fields: game, betType, odds, confidence, prediction.
- "confidence" must be an integer between 1-100.
- "odds" must include the +/- sign (e.g., "+150" or "-180").
- Do not deviate from this format in any way.
`;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are a sports betting analyst that provides recommendations in precise JSON format based on live game data from The Odds API. The game data is not generated by you but comes from external sources. Never include explanations or any text outside of the JSON structure." 
          },
          { 
            role: "user", 
            content: prompt 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });
      
      const content = response.choices[0].message.content;
      
      if (!content) {
        console.error('[Scheduler] Failed to generate recommendations from OpenAI');
        return;
      }
      
      // Parse and validate the recommendations
      let recommendationsData;
      try {
        recommendationsData = JSON.parse(content);
        
        if (!recommendationsData.recommendations || !Array.isArray(recommendationsData.recommendations) || recommendationsData.recommendations.length === 0) {
          throw new Error("Invalid response format: missing or empty recommendations array");
        }
        
        // Validate each recommendation structure
        for (const rec of recommendationsData.recommendations) {
          if (!rec.game || !rec.betType || !rec.odds || rec.confidence === undefined || !rec.prediction) {
            throw new Error("Invalid recommendation format: missing required fields");
          }
          
          if (typeof rec.confidence !== 'number' || rec.confidence < 1 || rec.confidence > 100) {
            throw new Error("Invalid confidence value: must be a number between 1-100");
          }
          
          if (typeof rec.odds !== 'string' || !/^[+-]/.test(rec.odds)) {
            throw new Error("Invalid odds format: must be a string with +/- prefix");
          }
        }
      } catch (err: any) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[Scheduler] Error parsing OpenAI response:", errorMessage, content);
        return;
      }
      
      // Clear existing recommendations
      await this.storage.clearRecommendations();
      
      // Store new recommendations
      const insertRecommendations = recommendationsData.recommendations.map((rec: any) => ({
        game: rec.game,
        betType: rec.betType,
        odds: rec.odds,
        confidence: rec.confidence,
        prediction: rec.prediction,
        gameSource: "The Odds API",
        betTypeSource: "LLM",
        oddsSource: "The Odds API",
        confidenceSource: "LLM",
        predictionSource: "LLM"
      }));
      
      // Parse and validate each recommendation
      const validatedRecommendations = [];
      for (const rec of insertRecommendations) {
        try {
          const validatedRec = insertRecommendationSchema.parse(rec);
          validatedRecommendations.push(validatedRec);
        } catch (error) {
          console.error('[Scheduler] Recommendation validation error:', error);
        }
      }
      
      // Store the validated recommendations
      const storedRecommendations = await this.storage.createRecommendations(validatedRecommendations);
      
      console.log(`[Scheduler] Generated and stored ${storedRecommendations.length} recommendations`);
      
    } catch (error) {
      console.error('[Scheduler] Error generating recommendations:', error);
    }
  }
  
  /**
   * Manually trigger a refresh (for use with API endpoints)
   */
  async manualRefresh() {
    console.log('[Scheduler] Manual refresh triggered');
    return this.performRefresh();
  }
  
  /**
   * Get the next scheduled refresh time
   */
  getNextScheduledRefresh() {
    return lastScheduledTime ? new Date(lastScheduledTime) : null;
  }
}

export const scheduler = new Scheduler(null as unknown as IStorage); // Will be initialized with storage in server/index.ts