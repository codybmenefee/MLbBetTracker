import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, RefreshCw, ArrowRight, Calendar, Database, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import type { Game, Recommendation } from "@shared/schema";

export default function LiveOddsDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Fetch games
  const gamesQuery = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  // Refresh games mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        url: "/api/odds/refresh",
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      toast({
        title: "Games Refreshed",
        description: "The latest MLB games and odds have been fetched successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Refreshing Games",
        description: error.message || "There was an error fetching the latest games.",
        variant: "destructive",
      });
    }
  });

  // Generate recommendations mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest({
        url: "/api/odds/fetch-and-generate",
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Recommendations Generated",
        description: "New betting recommendations have been generated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error Generating Recommendations",
        description: error.message || "There was an error generating recommendations.",
        variant: "destructive",
      });
    }
  });

  const isLoading = gamesQuery.isLoading || refreshMutation.isPending || generateMutation.isPending;
  const games = gamesQuery.data || [];
  const hasGames = games.length > 0;
  const lastUpdated = hasGames ? new Date(Math.max(...games.map(g => new Date(g.uploadDate).getTime()))) : null;

  // Format timestamp for display
  const formatTime = (date: Date) => {
    return format(date, "h:mm a");
  };

  // Handle opening game details
  const handleViewGameDetails = (game: Game) => {
    setSelectedGame(game);
    setIsDetailsOpen(true);
  };

  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-neutral">MLB Live Odds Dashboard</h2>
          <p className="text-gray-600">Live game data and betting recommendations powered by The Odds API</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-500" />
              Today's Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              ) : (
                games.length
              )}
            </div>
            <p className="text-sm text-gray-500">MLB games scheduled for today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="w-5 h-5 mr-2 text-blue-500" />
              Data Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">The Odds API</div>
            <p className="text-sm text-gray-500">
              Real-time odds from major sportsbooks
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Info className="w-5 h-5 mr-2 text-blue-500" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              ) : lastUpdated ? (
                format(lastUpdated, "MMM d, yyyy h:mm a")
              ) : (
                "Never"
              )}
            </div>
            <p className="text-sm text-gray-500">
              {hasGames ? "Games data is current" : "No games data available"}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Today's MLB Games</CardTitle>
          <CardDescription>
            {hasGames
              ? `Showing ${games.length} MLB games scheduled for today`
              : "No games data available. Click the button below to fetch today's games."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : hasGames ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matchup</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Home Odds</TableHead>
                    <TableHead>Away Odds</TableHead>
                    <TableHead>Over/Under</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.slice(0, 5).map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">
                        {game.awayTeam} @ {game.homeTeam}
                      </TableCell>
                      <TableCell>
                        {formatTime(new Date(game.gameTime))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={game.homeOdds.startsWith('+') ? "outline" : "default"}>
                          {game.homeOdds}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={game.awayOdds.startsWith('+') ? "outline" : "default"}>
                          {game.awayOdds}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {game.overUnderLine} ({game.overUnderOdds})
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewGameDetails(game)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {games.length > 5 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Showing 5 of {games.length} games. {games.length - 5} more games available.
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTitle>No games data</AlertTitle>
              <AlertDescription>
                There are no MLB games data available. Use the "Refresh Games" button to fetch today's games and odds.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={() => refreshMutation.mutate()}
          >
            {refreshMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Games
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            disabled={isLoading || !hasGames}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate Recommendations
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About The Odds API Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              This dashboard is connected to The Odds API, providing real-time MLB game data and odds from major sportsbooks 
              including DraftKings, FanDuel, and more. The data is refreshed automatically and used to generate AI-powered 
              betting recommendations.
            </p>
            <h3 className="font-medium text-gray-800">Features:</h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-700">
              <li>Live game data from The Odds API (updated every time you refresh)</li>
              <li>Moneyline odds from major US sportsbooks</li>
              <li>Over/Under (totals) betting lines</li>
              <li>AI-powered betting recommendations using ChatGPT</li>
              <li>Export capabilities to Google Sheets</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {/* Game Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Game Details</DialogTitle>
            <DialogDescription>
              {selectedGame && `${selectedGame.awayTeam} @ ${selectedGame.homeTeam}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedGame && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-1">Game Time</h3>
                  <p>{format(new Date(selectedGame.gameTime), "MMM d, yyyy h:mm a")}</p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Data Source</h3>
                  <p>{selectedGame.source}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Odds Information</h3>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <span className="text-sm text-gray-500">Home ({selectedGame.homeTeam}):</span>
                      <div className="font-medium">{selectedGame.homeOdds}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Away ({selectedGame.awayTeam}):</span>
                      <div className="font-medium">{selectedGame.awayOdds}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Over/Under:</span>
                    <div className="font-medium">{selectedGame.overUnderLine} ({selectedGame.overUnderOdds})</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-1">Loaded At</h3>
                <p className="text-sm">
                  {format(new Date(selectedGame.uploadDate), "MMM d, yyyy h:mm:ss a")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}