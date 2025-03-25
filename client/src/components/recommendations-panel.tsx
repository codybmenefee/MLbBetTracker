import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateRecommendations } from "@/lib/openai";
import { exportToGoogleSheet } from "@/lib/google-sheets";
import { prepareDataForGoogleSheets } from "@/lib/clipboard-export";
import { ArrowUpRight, InfoIcon, Clipboard, ClipboardCheck, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Recommendation } from "@shared/schema";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, ChevronUp } from "lucide-react";

// Schema for bet placement form
const betFormSchema = z.object({
  recommendationId: z.coerce.number(),
  date: z.string().min(1, "Date is required"),
  game: z.string().min(1, "Game is required"),
  betType: z.string().min(1, "Bet type is required"),
  odds: z.string().min(1, "Odds are required"),
  confidence: z.coerce.number().min(1).max(100, "Confidence must be between 1-100"),
  betAmount: z.coerce.number().positive("Bet amount must be positive"),
  predictedResult: z.string().min(1, "Predicted result is required"),
  notes: z.string().optional(),
});

type BetFormValues = z.infer<typeof betFormSchema>;

export default function RecommendationsPanel() {
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [activeBetRecommendationId, setActiveBetRecommendationId] = useState<number | null>(null);
  const [expandedRecommendationId, setExpandedRecommendationId] = useState<number | null>(null);

  const { data: recommendations, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });
  
  // Get bets to check which recommendations already have bets placed
  const { data: existingBets = [] } = useQuery<any[]>({
    queryKey: ["/api/bets"],
  });
  
  // Get current date in the format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  
  // Check if a recommendation already has a bet placed
  const hasBetPlaced = (recommendationId: number): boolean => {
    return existingBets.some((bet) => bet.recommendationId === recommendationId);
  };
  
  // Bet form
  const betForm = useForm<BetFormValues>({
    resolver: zodResolver(betFormSchema),
    defaultValues: {
      date: today,
      betAmount: 10,
      notes: '',
    }
  });
  
  // Add bet mutation
  const addBetMutation = useMutation({
    mutationFn: async (data: BetFormValues) => {
      return apiRequest({
        url: "/api/bets",
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
      setActiveBetRecommendationId(null);
      toast({
        title: "Bet placed",
        description: "Your bet has been successfully placed.",
      });
      betForm.reset({
        date: today,
        betAmount: 10,
        notes: '',
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to place bet: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle opening bet form for a specific recommendation
  const handleOpenBetForm = (recommendation: Recommendation) => {
    setActiveBetRecommendationId(recommendation.id);
    
    // Prefill form with recommendation data
    betForm.reset({
      recommendationId: recommendation.id,
      date: today,
      game: recommendation.game,
      betType: recommendation.betType,
      odds: recommendation.odds,
      confidence: recommendation.confidence,
      betAmount: 10,
      predictedResult: recommendation.prediction,
      notes: '',
    });
  };
  
  // Handle bet form submission
  const onBetSubmit = (data: BetFormValues) => {
    addBetMutation.mutate(data);
  };
  
  // Helper function to toggle expanded details for a recommendation
  const handleToggleDetails = (recId: number) => {
    if (expandedRecommendationId === recId) {
      setExpandedRecommendationId(null);
    } else {
      setExpandedRecommendationId(recId);
    }
  };

  const generateMutation = useMutation({
    mutationFn: generateRecommendations,
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Recommendations generated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate recommendations: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportToGoogleSheet,
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Recommendations exported to Google Sheets!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/exports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exports/latest"] });
      
      // Show detailed message if available
      if (data.message) {
        toast({
          title: "Export Details",
          description: data.message,
          duration: 5000,
        });
      }
      
      // Open the sheet in a new tab if it's a valid Google Sheets URL
      const destination = data.destination || "";
      
      if (destination.includes("docs.google.com/spreadsheets")) {
        // This is an actual Google Sheets URL, open it directly
        window.open(destination, "_blank");
      } else if (destination.includes("script.google.com") && destination.includes("source=direct-integration")) {
        // This is a script URL with our special marker
        // Get the spreadsheet ID from localStorage
        const spreadsheetId = localStorage.getItem("googleSpreadsheetId");
        
        if (spreadsheetId) {
          // If we have the spreadsheet ID, open the actual Google Sheet
          window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`, "_blank");
        } else {
          // If we don't have the spreadsheet ID, show a toast with instructions
          toast({
            title: "Spreadsheet ID Missing",
            description: "For direct Google Sheets access, add your Spreadsheet ID in the Settings page. Check your spreadsheet for the exported data.",
            duration: 7000,
          });
        }
      } else {
        // Fallback: Just try to open whatever destination we have
        window.open(destination, "_blank");
      }
      
      // Production note toast
      toast({
        title: "Next Steps",
        description: "For production use, you would need to configure the Google Sheets API credentials to allow writing data.",
        duration: 6000,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to export to Google Sheets: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const handleGenerateRecommendations = () => {
    generateMutation.mutate();
  };

  const handleExportToSheet = () => {
    exportMutation.mutate();
  };
  
  const handleCopyToClipboard = async () => {
    if (!recommendations || recommendations.length === 0) {
      toast({
        title: "Error",
        description: "No recommendations available to copy",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const success = await prepareDataForGoogleSheets(recommendations);
      
      if (success) {
        setIsCopied(true);
        toast({
          title: "Success",
          description: "Recommendations copied to clipboard in spreadsheet format. You can now paste directly into Google Sheets.",
          duration: 5000,
        });
        
        // Reset the copied state after 3 seconds
        setTimeout(() => setIsCopied(false), 3000);
      } else {
        toast({
          title: "Error",
          description: "Failed to copy data to clipboard",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to copy to clipboard: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 75) return "bg-green-500";
    if (confidence >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral">AI Recommendations</h2>
            <p className="text-gray-600">Top 5 betting opportunities for today</p>
          </div>
          <Skeleton className="h-10 w-48 mt-3 md:mt-0" />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Today's Recommended Bets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odds</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prediction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-40" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-28" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Skeleton className="h-5 w-5 rounded-full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-neutral">AI Recommendations</h2>
            <p className="text-gray-600">Top 5 betting opportunities for today</p>
          </div>
        </div>
        
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center mb-4 text-red-600">
              <InfoIcon className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-medium">Error Loading Recommendations</h3>
            </div>
            <p className="text-gray-700 mb-4">
              {error instanceof Error ? error.message : "An unknown error occurred while loading recommendations."}
            </p>
            <p className="text-gray-600 mb-4">
              Use the refresh button in the sidebar to try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-neutral">AI Recommendations</h2>
          <p className="text-gray-600">Top 5 betting opportunities for today</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-3 md:mt-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleCopyToClipboard}
                  disabled={!recommendations || recommendations.length === 0}
                  variant="outline"
                  className="flex items-center"
                >
                  {isCopied ? (
                    <>
                      <ClipboardCheck className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-4 h-4 mr-2" />
                      Copy for Spreadsheet
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copies data in a format ready to paste directly into Google Sheets</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button 
            onClick={handleExportToSheet}
            disabled={exportMutation.isPending || !recommendations || recommendations.length === 0}
          >
            Export to Google Sheet
            <ArrowUpRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Today's Recommended Bets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!recommendations || recommendations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">No recommendations available. Use the refresh button in the sidebar to fetch games and generate recommendations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odds</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prediction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recommendations && recommendations.map((rec: Recommendation) => {
                    return (
                      <React.Fragment key={rec.id}>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {rec.game}
                            <span className="text-xs text-gray-400 block mt-1">Source: {rec.gameSource || 'LLM'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {rec.betType}
                            <span className="text-xs text-gray-400 block mt-1">Source: {rec.betTypeSource || 'LLM'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {rec.odds}
                            <span className="text-xs text-gray-400 block mt-1">Source: {rec.oddsSource || 'LLM'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-24 bg-gray-200 rounded-full h-2.5">
                              <div className={`${getConfidenceColor(rec.confidence)} h-2.5 rounded-full`} style={{ width: `${rec.confidence}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-500 mt-1 block">{rec.confidence}%</span>
                            <span className="text-xs text-gray-400 block mt-1">Source: {rec.confidenceSource || 'LLM'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {rec.prediction}
                            <span className="text-xs text-gray-400 block mt-1">Source: {rec.predictionSource || 'LLM'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDetails(rec.id)}
                              title="Toggle AI Analysis"
                              aria-label={expandedRecommendationId === rec.id ? "Hide analysis" : "Show analysis"}
                            >
                              {expandedRecommendationId === rec.id ? 
                                <ChevronUp className="h-4 w-4" /> : 
                                <ChevronDown className="h-4 w-4" />
                              }
                            </Button>
                        
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-gray-400 hover:text-gray-500">
                                    <InfoIcon className="w-5 h-5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>AI-generated prediction based on historical data and current odds</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          
                            <Popover open={activeBetRecommendationId === rec.id} onOpenChange={(open) => {
                              if (!open) setActiveBetRecommendationId(null);
                            }}>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="ml-2"
                                  onClick={() => handleOpenBetForm(rec)}
                                  disabled={hasBetPlaced(rec.id)}
                                  title={hasBetPlaced(rec.id) ? "Bet already placed" : "Place a bet"}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  {hasBetPlaced(rec.id) ? "Bet Placed" : "Place Bet"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-4">
                                  <h4 className="font-medium">Place a Bet</h4>
                                  <Form {...betForm}>
                                    <form onSubmit={betForm.handleSubmit(onBetSubmit)} className="space-y-4">
                                      <FormField
                                        control={betForm.control}
                                        name="betAmount"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Bet Amount</FormLabel>
                                            <FormControl>
                                              <Input type="number" step="0.01" min="1" placeholder="10.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <FormField
                                        control={betForm.control}
                                        name="notes"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>Notes (Optional)</FormLabel>
                                            <FormControl>
                                              <Input placeholder="Any additional notes" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      
                                      <div className="flex justify-end gap-2">
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          onClick={() => setActiveBetRecommendationId(null)}
                                        >
                                          Cancel
                                        </Button>
                                        <Button 
                                          type="submit"
                                          disabled={addBetMutation.isPending}
                                        >
                                          {addBetMutation.isPending ? "Placing Bet..." : "Place Bet"}
                                        </Button>
                                      </div>
                                    </form>
                                  </Form>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </td>
                        </tr>
                        
                        {expandedRecommendationId === rec.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="text-sm text-gray-700">
                                <h4 className="font-medium mb-2">AI Analysis</h4>
                                <p>{rec.analysis || "No detailed analysis available for this recommendation."}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
