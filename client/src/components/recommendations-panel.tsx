import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateRecommendations } from "@/lib/openai";
import { exportToGoogleSheet } from "@/lib/google-sheets";
import { ArrowUpRight, InfoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { Recommendation } from "@shared/schema";

export default function RecommendationsPanel() {
  const { toast } = useToast();

  const { data: recommendations, isLoading, error } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

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
      
      // Open the sheet in a new tab
      window.open(data.destination, "_blank");
      
      // In production, we would add instructions to authorize the Google Sheets API
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
          <Button 
            onClick={handleGenerateRecommendations}
            disabled={generateMutation.isPending}
          >
            Generate Recommendations
          </Button>
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
            <Button 
              onClick={handleGenerateRecommendations}
              disabled={generateMutation.isPending}
            >
              Try Again
            </Button>
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
        <Button 
          onClick={handleExportToSheet}
          disabled={exportMutation.isPending || !recommendations || recommendations.length === 0}
          className="mt-3 md:mt-0"
        >
          Export to Google Sheet
          <ArrowUpRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Today's Recommended Bets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!recommendations || recommendations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-500 mb-4">No recommendations available. Generate recommendations to get started.</p>
              <Button 
                onClick={handleGenerateRecommendations}
                disabled={generateMutation.isPending}
              >
                Generate Recommendations
              </Button>
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
                  {recommendations && recommendations.map((rec: Recommendation) => (
                    <tr key={rec.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rec.game}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rec.betType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rec.odds}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5">
                          <div className={`${getConfidenceColor(rec.confidence)} h-2.5 rounded-full`} style={{ width: `${rec.confidence}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-1 block">{rec.confidence}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.prediction}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
