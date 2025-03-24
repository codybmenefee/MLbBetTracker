import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the game schema for MLB games
export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  gameTime: timestamp("game_time").notNull(),
  homeOdds: text("home_odds").notNull(),
  awayOdds: text("away_odds").notNull(),
  overUnderLine: text("over_under_line").notNull(),
  overUnderOdds: text("over_under_odds").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
});

// Define the recommendations schema
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  game: text("game").notNull(),
  betType: text("bet_type").notNull(),
  odds: text("odds").notNull(),
  confidence: integer("confidence").notNull(),
  prediction: text("prediction").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// Define the exports schema to track Google Sheets exports
export const exports = pgTable("exports", {
  id: serial("id").primaryKey(),
  exportDate: timestamp("export_date").defaultNow().notNull(),
  destination: text("destination").notNull(),
  sheetName: text("sheet_name").notNull(),
  status: text("status").notNull(), // "pending", "completed", "failed"
  errorMessage: text("error_message"),
  exportedData: json("exported_data"),
});

// Create insert schemas
export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  uploadDate: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  generatedAt: true,
});

export const insertExportSchema = createInsertSchema(exports).omit({
  id: true,
  exportDate: true,
});

// Types
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exports.$inferSelect;

// CSV schema for validation - more flexible to accept any header format
export const csvRowSchema = z.record(z.string(), z.string());

export type CsvRow = z.infer<typeof csvRowSchema>;
