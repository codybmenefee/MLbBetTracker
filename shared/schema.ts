import { pgTable, text, serial, integer, boolean, timestamp, json, real, date } from "drizzle-orm/pg-core";
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
  source: text("source").default("LLM").notNull(),
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
  gameSource: text("game_source").default("LLM").notNull(),
  betTypeSource: text("bet_type_source").default("LLM").notNull(),
  oddsSource: text("odds_source").default("LLM").notNull(),
  confidenceSource: text("confidence_source").default("LLM").notNull(),
  predictionSource: text("prediction_source").default("LLM").notNull(),
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

// Define the bankroll settings schema
export const bankrollSettings = pgTable("bankroll_settings", {
  id: serial("id").primaryKey(),
  initialAmount: real("initial_amount").notNull(),
  currentAmount: real("current_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define the bet history schema
export const betHistory = pgTable("bet_history", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull(),
  date: date("bet_date").notNull(),
  game: text("game").notNull(),
  betType: text("bet_type").notNull(),
  odds: text("odds").notNull(),
  confidence: integer("confidence").notNull(),
  betAmount: real("bet_amount").notNull(),
  predictedResult: text("predicted_result").notNull(),
  actualResult: text("actual_result").default("pending").notNull(), // "win", "loss", "pending"
  profitLoss: real("profit_loss").default(0).notNull(),
  bankrollAfter: real("bankroll_after").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const insertBankrollSettingsSchema = createInsertSchema(bankrollSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBetHistorySchema = createInsertSchema(betHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Update schema for updating bet result
export const updateBetResultSchema = z.object({
  id: z.number(),
  actualResult: z.enum(["win", "loss", "pending"]),
  notes: z.string().optional(),
});

// Types
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;

export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exports.$inferSelect & {
  message?: string; // Additional field for client messages (not stored in database)
};

export type InsertBankrollSettings = z.infer<typeof insertBankrollSettingsSchema>;
export type BankrollSettings = typeof bankrollSettings.$inferSelect;

export type InsertBetHistory = z.infer<typeof insertBetHistorySchema>;
export type BetHistory = typeof betHistory.$inferSelect;

export type UpdateBetResult = z.infer<typeof updateBetResultSchema>;

// CSV schema for validation - more flexible to accept any header format
export const csvRowSchema = z.record(z.string(), z.string());

export type CsvRow = z.infer<typeof csvRowSchema>;
