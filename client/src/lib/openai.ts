import { apiRequest } from "./queryClient";
import type { Recommendation } from "@shared/schema";

// Generate recommendations using backend API
export async function generateRecommendations(): Promise<Recommendation[]> {
  try {
    const response = await apiRequest(
      "POST", 
      "/api/recommendations/generate", 
      {}
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating recommendations:", error);
    throw error;
  }
}
