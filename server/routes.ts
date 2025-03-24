import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertGameSchema, 
  insertRecommendationSchema, 
  insertExportSchema, 
  csvRowSchema 
} from "@shared/schema";
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

      // Validate each game in the array
      for (const game of parsedGames) {
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
      }));

      // Create prompt for OpenAI
      const prompt = `
You are a professional sports betting analyst. Given the following MLB games scheduled, 
please provide the top 5 betting recommendations.

Games data:
${JSON.stringify(gamesForPrompt, null, 2)}

For each recommendation, provide:
1. Game (as "Team A vs. Team B")
2. Bet Type (Moneyline, Over/Under, Run Line with value)
3. Odds (in American format)
4. Confidence (as a percentage from 1-100%)
5. Prediction (simple outcome like "Team A Win", "Over", "Team B Cover")

Return your recommendations as a JSON array with exactly 5 objects, each with the fields:
- game (string)
- betType (string)
- odds (string)
- confidence (number between 1-100)
- prediction (string)

Important: 
- Only respond with valid JSON. Do not include any explanations.
- For confidence levels, only use integer values.
- For odds, include the +/- sign.
- Only recommend up to 5 games.
`;

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      
      if (!content) {
        return res.status(500).json({ message: "Failed to generate recommendations from OpenAI" });
      }

      const recommendationsData = JSON.parse(content);
      
      if (!Array.isArray(recommendationsData.recommendations)) {
        return res.status(500).json({ message: "Invalid response format from OpenAI" });
      }

      // Validate and save recommendations
      const validatedRecommendations = [];
      for (const rec of recommendationsData.recommendations) {
        const validatedData = insertRecommendationSchema.parse(rec);
        validatedRecommendations.push(validatedData);
      }

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

  // Create a new export (simulating Google Sheets export)
  app.post("/api/exports", async (req: Request, res: Response) => {
    try {
      const { sheetUrl } = req.body;
      const recommendations = await storage.getRecommendations();
      
      if (recommendations.length === 0) {
        return res.status(400).json({ message: "No recommendations to export" });
      }

      const exportData = {
        sheetUrl: sheetUrl || `https://docs.google.com/spreadsheets/d/${Date.now()}`,
        exportedData: recommendations
      };

      const validatedExport = insertExportSchema.parse(exportData);
      const savedExport = await storage.createExport(validatedExport);

      res.status(201).json(savedExport);
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

  const httpServer = createServer(app);
  return httpServer;
}
