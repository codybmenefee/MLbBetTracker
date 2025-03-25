import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGameSchema, 
  insertRecommendationSchema, 
  insertExportSchema, 
  csvRowSchema,
  Game
} from "@shared/schema";
import { exportRecommendationsToSheet } from "./google-sheets";
import { fetchMLBGames, refreshMLBGames } from "./odds-api";
import { ZodError } from "zod";

import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "missing_openai_api_key" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handler function
  const handleError = (err: unknown, res: Response) => {
    console.error("Error:", err);
    if (err instanceof ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: err.errors 
      });
    }
    return res.status(500).json({ 
      message: err instanceof Error ? err.message : "An unknown error occurred" 
    });
  };

  // Get all games
  app.get("/api/games", async (req: Request, res: Response) => {
    try {
      const games = await storage.getGames();
      res.json(games);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Upload games via CSV (parsed on the frontend)
  app.post("/api/games", async (req: Request, res: Response) => {
    try {
      const parsedGames = req.body;
      const validatedGames = [];

      // Validate each game in the array and ensure dates are properly formatted
      for (const game of parsedGames) {
        // Check if gameTime is a string and convert to Date
        if (typeof game.gameTime === 'string') {
          try {
            // Try to parse the date string
            const gameDate = new Date(game.gameTime);
            
            // Check if the date is valid
            if (!isNaN(gameDate.getTime())) {
              game.gameTime = gameDate;
            } else {
              // If invalid date string, use current date
              game.gameTime = new Date();
            }
          } catch (e) {
            // If date parsing fails, use current date
            game.gameTime = new Date();
          }
        }

        // Parse through schema for validation
        const validatedData = insertGameSchema.parse(game);
        validatedGames.push(validatedData);
      }

      const savedGames = await storage.createGames(validatedGames);
      res.status(201).json(savedGames);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get all recommendations
  app.get("/api/recommendations", async (req: Request, res: Response) => {
    try {
      const recommendations = await storage.getRecommendations();
      res.json(recommendations);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Generate recommendations from games
  app.post("/api/recommendations/generate", async (req: Request, res: Response) => {
    try {
      const games = await storage.getGames();

      if (games.length === 0) {
        return res.status(400).json({ message: "No games available to generate recommendations" });
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
        source: game.source || "LLM" // Include the source of the game data
      }));

      // Create prompt for OpenAI
      const prompt = `
You are a professional sports betting analyst. Given the following MLB games scheduled, 
please provide betting recommendations for all games.

The games data below has been provided from uploaded documents and third-party integrations, not generated by you.

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

      // Call OpenAI API with strict JSON output format
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { 
            role: "system", 
            content: "You are a sports betting analyst that provides recommendations in precise JSON format based on uploaded game data and third-party sources. The game data is not generated by you but comes from external sources. Never include explanations or any text outside of the JSON structure." 
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
        return res.status(500).json({ message: "Failed to generate recommendations from OpenAI" });
      }

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
        console.error("Error parsing OpenAI response:", errorMessage, content);
        return res.status(500).json({ message: "Invalid response format from OpenAI: " + errorMessage });
      }

      // Validate and save recommendations with source information
      const validatedRecommendations = [];
      for (const rec of recommendationsData.recommendations) {
        // Get the game name from the recommendation
        const gameStr = rec.game;
        
        // Look up the source from the original games
        // Find if this game matches any of our uploaded games
        let gameSource = "LLM";  // Default source
        
        // Extract team names from the recommendation game string (e.g. "Team A vs Team B")
        const teamsMatch = gameStr.match(/(.+?)\s+vs\.\s+(.+)$/i);
        if (teamsMatch) {
          const team1 = teamsMatch[1].trim();
          const team2 = teamsMatch[2].trim();
          
          // Check if any of our games match these teams (in either order)
          const matchingGame = gamesForPrompt.find(g => 
            (g.homeTeam === team1 && g.awayTeam === team2) || 
            (g.homeTeam === team2 && g.awayTeam === team1)
          );
          
          if (matchingGame && matchingGame.source) {
            gameSource = matchingGame.source;
          }
        }
        
        // Add source information for each field
        const recWithSources = {
          ...rec,
          gameSource: gameSource,     // Use the matched game source or default to LLM
          betTypeSource: "LLM",       // Everything else comes from the LLM for now
          oddsSource: "LLM",          // We could add ESPN or other sources in the future
          confidenceSource: "LLM",    // These sources will be displayed in the UI
          predictionSource: "LLM"     // to indicate data provenance
        };
        
        const validatedData = insertRecommendationSchema.parse(recWithSources);
        validatedRecommendations.push(validatedData);
      }

      // Create new recommendations (the createRecommendations method already clears existing ones)
      const savedRecommendations = await storage.createRecommendations(validatedRecommendations);
      res.status(201).json(savedRecommendations);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get all exports
  app.get("/api/exports", async (req: Request, res: Response) => {
    try {
      const exports = await storage.getExports();
      res.json(exports);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get latest export
  app.get("/api/exports/latest", async (req: Request, res: Response) => {
    try {
      const latestExport = await storage.getLatestExport();
      if (!latestExport) {
        return res.status(404).json({ message: "No exports found" });
      }
      res.json(latestExport);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create a new export to Google Sheets
  app.post("/api/exports", async (req: Request, res: Response) => {
    try {
      const exportRequest = req.body;
      const recommendations = await storage.getRecommendations();
      
      if (recommendations.length === 0) {
        // Return a proper 200 status but with a clear message
        return res.status(200).json({ message: "No recommendations to export" });
      }
      
      // Make sure we're using today's date in the sheet name
      const today = new Date().toISOString().split('T')[0];
      const sheetName = exportRequest.sheetName || `MLB Betting Recommendations ${today}`;
      
      // Log export details for debugging
      console.log(`Exporting ${recommendations.length} recommendations to sheet: ${exportRequest.destination}, tab: ${sheetName}`);
      
      // Call the Google Sheets export function
      const exportResult = await exportRecommendationsToSheet(
        recommendations,
        exportRequest.destination,
        sheetName
      );
      
      // Set the export status based on the result
      const exportStatus = exportResult.success ? "completed" : "failed";
      
      // Create the export record with the dynamic sheet name
      const exportData = {
        ...exportRequest,
        sheetName: sheetName, // Use provided name or the dynamic one
        status: exportStatus,
        exportedData: recommendations,
        errorMessage: exportResult.success ? null : exportResult.message
      };

      // Validate the export data
      const validatedExport = insertExportSchema.parse(exportData);
      const savedExport = await storage.createExport(validatedExport);
      
      // Add the message from the export function to the response
      const exportedResult = {
        ...savedExport,
        message: exportResult.message
      };

      // Return success regardless of export method to support both direct and server-side methods
      res.status(201).json(exportedResult);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get CSV template
  app.get("/api/template", (req: Request, res: Response) => {
    const csvTemplate = `homeTeam,awayTeam,gameTime,homeOdds,awayOdds,overUnderLine,overUnderOdds
New York Yankees,Boston Red Sox,2025-03-23 13:05,-150,+130,8.5,-110
Los Angeles Dodgers,San Francisco Giants,2025-03-23 16:10,-180,+160,8.5,-105
Chicago Cubs,St. Louis Cardinals,2025-03-23 20:15,+110,-130,9.0,-110`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=mlb_schedule_template.csv');
    res.send(csvTemplate);
  });

  // Middleware to check for The Odds API key
  const requireOddsApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = process.env.ODDS_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({ 
        message: "The Odds API key is required but not configured. Please add it to your environment variables." 
      });
    }
    
    next();
  };

  // Fetch MLB games from The Odds API
  app.get("/api/odds/games", requireOddsApiKey, async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.ODDS_API_KEY as string;
      const games = await fetchMLBGames(apiKey);
      
      res.json(games);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Refresh MLB games from The Odds API and store them
  app.post("/api/odds/refresh", requireOddsApiKey, async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.ODDS_API_KEY as string;
      
      // Clear existing games before storing new ones
      // First get existing games to show what's being replaced
      const existingGames = await storage.getGames();
      
      // Clear all existing games
      await storage.clearGames();
      
      // Store new games from The Odds API
      const storeGamesFunction = async (games: any[]) => {
        // Validate each game in the array and ensure dates are properly formatted
        const validatedGames = [];
        
        for (const game of games) {
          const validatedData = insertGameSchema.parse(game);
          validatedGames.push(validatedData);
        }
        
        return await storage.createGames(validatedGames);
      };
      
      const refreshedGames = await refreshMLBGames(apiKey, storeGamesFunction);
      
      res.json({
        message: `Successfully refreshed MLB games. Found ${refreshedGames.length} games.`,
        replacedGames: existingGames.length,
        games: refreshedGames
      });
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Fetch, store, and generate all in one call
  app.post("/api/odds/fetch-and-generate", requireOddsApiKey, async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.ODDS_API_KEY as string;
      
      // Store new games from The Odds API
      const storeGamesFunction = async (games: any[]) => {
        // Validate each game in the array and ensure dates are properly formatted
        const validatedGames = [];
        
        for (const game of games) {
          const validatedData = insertGameSchema.parse(game);
          validatedGames.push(validatedData);
        }
        
        return await storage.createGames(validatedGames);
      };
      
      // Fetch and store games
      const refreshedGames = await refreshMLBGames(apiKey, storeGamesFunction);
      
      if (refreshedGames.length === 0) {
        return res.status(400).json({ message: "No MLB games found from The Odds API." });
      }
      
      // Now generate recommendations based on these new games
      // We'll reuse the same code from the /api/recommendations/generate endpoint
      
      // Format games for OpenAI prompt
      const gamesForPrompt = refreshedGames.map((game: any) => ({
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

      // Call OpenAI API with strict JSON output format
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
        return res.status(500).json({ message: "Failed to generate recommendations from OpenAI" });
      }

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
        console.error("Error parsing OpenAI response:", errorMessage, content);
        return res.status(500).json({ message: "Invalid response format from OpenAI: " + errorMessage });
      }

      // Validate and save recommendations with source information
      const validatedRecommendations = [];
      for (const rec of recommendationsData.recommendations) {
        // Get the game name from the recommendation
        const gameStr = rec.game;
        
        // All games come from The Odds API in this case
        const recWithSources = {
          ...rec,
          gameSource: "The Odds API",
          betTypeSource: "LLM",
          oddsSource: "The Odds API",
          confidenceSource: "LLM",
          predictionSource: "LLM"
        };
        
        const validatedData = insertRecommendationSchema.parse(recWithSources);
        validatedRecommendations.push(validatedData);
      }

      // Create new recommendations
      const savedRecommendations = await storage.createRecommendations(validatedRecommendations);
      
      res.status(201).json({
        message: `Successfully fetched ${refreshedGames.length} games and generated ${savedRecommendations.length} recommendations.`,
        recommendations: savedRecommendations
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
