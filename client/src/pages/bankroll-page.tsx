import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";

// Schema for bankroll setup form
const bankrollFormSchema = z.object({
  initialAmount: z.coerce.number().positive("Initial amount must be positive"),
  currentAmount: z.coerce.number().positive("Current amount must be positive"),
});

// Schema for bet placement form
const betFormSchema = z.object({
  recommendationId: z.coerce.number().optional(),
  date: z.string().min(1, "Date is required"),
  game: z.string().min(1, "Game is required"),
  betType: z.string().min(1, "Bet type is required"),
  odds: z.string().min(1, "Odds are required"),
  confidence: z.coerce.number().min(1).max(100, "Confidence must be between 1-100"),
  betAmount: z.coerce.number().positive("Bet amount must be positive"),
  predictedResult: z.string().min(1, "Predicted result is required"),
  notes: z.string().optional(),
});

// Schema for bet result update form
const resultUpdateSchema = z.object({
  actualResult: z.enum(["win", "loss", "pending"], {
    required_error: "Please select a result",
  }),
  notes: z.string().optional(),
});

type BankrollFormValues = z.infer<typeof bankrollFormSchema>;
type BetFormValues = z.infer<typeof betFormSchema>;
type ResultUpdateValues = z.infer<typeof resultUpdateSchema>;

export default function BankrollPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeBet, setActiveBet] = useState<number | null>(null);
  const [isAddBetDialogOpen, setIsAddBetDialogOpen] = useState(false);
  const [isUpdateResultDialogOpen, setIsUpdateResultDialogOpen] = useState(false);
  const [isEditBetDialogOpen, setIsEditBetDialogOpen] = useState(false);
  const [expandedBetId, setExpandedBetId] = useState<number | null>(null);

  // Fetch bankroll settings
  const bankrollQuery = useQuery({
    queryKey: ["/api/bankroll"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch bet history
  const betsQuery = useQuery({
    queryKey: ["/api/bets"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch recommendations for dropdown
  const recommendationsQuery = useQuery({
    queryKey: ["/api/recommendations"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Set up bankroll mutation
  const bankrollMutation = useMutation({
    mutationFn: async (data: BankrollFormValues) => {
      return apiRequest({
        url: "/api/bankroll",
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
      toast({
        title: "Bankroll set",
        description: "Your bankroll has been successfully set.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set bankroll.",
        variant: "destructive",
      });
    },
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
      setIsAddBetDialogOpen(false);
      toast({
        title: "Bet added",
        description: "Your bet has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add bet.",
        variant: "destructive",
      });
    },
  });

  // Update bet result mutation
  const updateResultMutation = useMutation({
    mutationFn: async (data: ResultUpdateValues & { id: number }) => {
      return apiRequest({
        url: `/api/bets/${data.id}/result`,
        method: "PUT",
        body: {
          actualResult: data.actualResult,
          notes: data.notes,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
      setIsUpdateResultDialogOpen(false);
      setActiveBet(null);
      toast({
        title: "Result updated",
        description: "The bet result has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update result.",
        variant: "destructive",
      });
    },
  });

  // Bankroll form
  const bankrollForm = useForm<BankrollFormValues>({
    resolver: zodResolver(bankrollFormSchema),
    defaultValues: {
      initialAmount: 500,
      currentAmount: 500,
    },
  });

  // Bet form
  const betForm = useForm<BetFormValues>({
    resolver: zodResolver(betFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      betAmount: 50,
      confidence: 75,
    },
  });

  // Result update form
  const resultUpdateForm = useForm<ResultUpdateValues>({
    resolver: zodResolver(resultUpdateSchema),
    defaultValues: {
      actualResult: "pending",
    },
  });

  // Update form values when bankroll settings are loaded
  useEffect(() => {
    if (bankrollQuery.data) {
      bankrollForm.setValue("initialAmount", bankrollQuery.data.initialAmount);
      bankrollForm.setValue("currentAmount", bankrollQuery.data.currentAmount);
    }
  }, [bankrollQuery.data, bankrollForm]);

  // Handle bankroll form submission
  const onBankrollSubmit = (data: BankrollFormValues) => {
    bankrollMutation.mutate(data);
  };

  // Handle bet form submission
  const onBetSubmit = (data: BetFormValues) => {
    addBetMutation.mutate(data);
  };

  // Handle result update form submission
  const onResultUpdateSubmit = (data: ResultUpdateValues) => {
    if (activeBet === null) return;
    
    updateResultMutation.mutate({
      ...data,
      id: activeBet,
    });
  };

  // Helper function to handle opening result update dialog
  const handleUpdateResult = (betId: number) => {
    setActiveBet(betId);
    setIsUpdateResultDialogOpen(true);
    
    // Find the bet and set default form values
    const bet = betsQuery.data?.find(b => b.id === betId);
    if (bet) {
      resultUpdateForm.setValue("actualResult", bet.actualResult as any);
      resultUpdateForm.setValue("notes", bet.notes || "");
    }
  };

  // Helper function to handle recommendation selection
  const handleRecommendationChange = (recId: string) => {
    const id = parseInt(recId);
    if (isNaN(id)) return;
    
    const recommendation = recommendationsQuery.data?.find(r => r.id === id);
    if (recommendation) {
      betForm.setValue("recommendationId", id);
      betForm.setValue("game", recommendation.game);
      betForm.setValue("betType", recommendation.betType);
      betForm.setValue("odds", recommendation.odds);
      betForm.setValue("confidence", recommendation.confidence);
      betForm.setValue("predictedResult", recommendation.prediction);
    }
  };
  
  // Helper function to toggle expanded details for a bet
  const handleToggleDetails = (betId: number) => {
    if (expandedBetId === betId) {
      setExpandedBetId(null);
    } else {
      setExpandedBetId(betId);
    }
  };
  
  // Helper function to handle editing a bet
  const handleEditBet = (betId: number) => {
    setActiveBet(betId);
    setIsEditBetDialogOpen(true);
    
    // Find the bet and set default form values
    const bet = betsQuery.data?.find(b => b.id === betId);
    if (bet) {
      betForm.reset({
        date: new Date(bet.date).toISOString().split('T')[0],
        game: bet.game,
        betType: bet.betType,
        odds: bet.odds,
        confidence: bet.confidence,
        betAmount: bet.betAmount,
        predictedResult: bet.predictedResult,
        notes: bet.notes || "",
        recommendationId: bet.recommendationId
      });
    }
  };
  
  // Helper function to handle deleting a bet
  const handleDeleteBet = (betId: number) => {
    if (confirm("Are you sure you want to delete this bet? This action cannot be undone.")) {
      deleteBetMutation.mutate(betId);
    }
  };
  
  // Edit bet mutation
  const editBetMutation = useMutation({
    mutationFn: async (data: BetFormValues & { id: number }) => {
      return apiRequest({
        url: `/api/bets/${data.id}`,
        method: "PUT",
        body: {
          date: data.date,
          game: data.game,
          betType: data.betType,
          odds: data.odds,
          confidence: data.confidence,
          betAmount: data.betAmount,
          predictedResult: data.predictedResult,
          notes: data.notes,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      setIsEditBetDialogOpen(false);
      setActiveBet(null);
      toast({
        title: "Bet updated",
        description: "The bet details have been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bet details.",
        variant: "destructive",
      });
    },
  });
  
  // Delete bet mutation
  const deleteBetMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest({
        url: `/api/bets/${id}`,
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bankroll"] });
      toast({
        title: "Bet deleted",
        description: "The bet has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bet.",
        variant: "destructive",
      });
    },
  });
  
  // Handle edit bet form submission
  const onEditBetSubmit = (data: BetFormValues) => {
    if (activeBet === null) return;
    
    editBetMutation.mutate({
      ...data,
      id: activeBet,
    });
  };
  
  // Calculate statistics
  const stats = {
    totalBets: betsQuery.data?.length || 0,
    wins: betsQuery.data?.filter(bet => bet.actualResult === "win").length || 0,
    losses: betsQuery.data?.filter(bet => bet.actualResult === "loss").length || 0,
    pending: betsQuery.data?.filter(bet => bet.actualResult === "pending").length || 0,
    totalProfit: betsQuery.data?.reduce((sum, bet) => sum + bet.profitLoss, 0) || 0,
  };
  
  const winRate = stats.totalBets > 0 && (stats.wins + stats.losses) > 0 
    ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1) 
    : 0;

  const roi = bankrollQuery.data?.initialAmount && bankrollQuery.data.initialAmount > 0
    ? (((bankrollQuery.data.currentAmount - bankrollQuery.data.initialAmount) / bankrollQuery.data.initialAmount) * 100).toFixed(1)
    : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Get result badge color
  const getResultBadge = (result: string) => {
    switch (result) {
      case "win":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Win
          </Badge>
        );
      case "loss":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Loss
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  // Render bankroll setup form if no bankroll settings exist
  if (bankrollQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Bankroll Management</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6">
              <p>Loading bankroll information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bankrollQuery.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Setup Your Bankroll</h1>
        <Card>
          <CardHeader>
            <CardTitle>Initial Bankroll Setup</CardTitle>
            <CardDescription>Set your starting bankroll to begin tracking your betting performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...bankrollForm}>
              <form onSubmit={bankrollForm.handleSubmit(onBankrollSubmit)} className="space-y-6">
                <FormField
                  control={bankrollForm.control}
                  name="initialAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Bankroll Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                          <Input {...field} type="number" step="0.01" min="0" className="pl-8" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Set the amount you're starting with for your MLB betting
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={bankrollMutation.isPending}
                  className="w-full"
                >
                  {bankrollMutation.isPending ? "Setting up..." : "Set Up Bankroll"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Bankroll Management</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Bankroll</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(bankrollQuery.data.currentAmount)}</div>
            <p className="text-xs text-gray-500">
              Started with {formatCurrency(bankrollQuery.data.initialAmount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {stats.totalProfit >= 0 ? 
              <TrendingUp className="w-4 h-4 text-green-500" /> : 
              <TrendingDown className="w-4 h-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalProfit)}
            </div>
            <p className="text-xs text-gray-500">
              ROI: {roi}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart3 className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate}%</div>
            <p className="text-xs text-gray-500">
              {stats.wins} Wins, {stats.losses} Losses, {stats.pending} Pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Bets</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBets}</div>
            <Button 
              size="sm" 
              onClick={() => setIsAddBetDialogOpen(true)}
              className="mt-2 w-full"
            >
              Place New Bet
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active & Pending Bets</TabsTrigger>
          <TabsTrigger value="history">Bet History</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Pending Bets</CardTitle>
              <CardDescription>Bets awaiting results</CardDescription>
            </CardHeader>
            <CardContent>
              {betsQuery.isLoading ? (
                <p>Loading bets...</p>
              ) : betsQuery.data?.filter(bet => bet.actualResult === "pending").length === 0 ? (
                <p>No pending bets found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Bet Type</TableHead>
                      <TableHead>Odds</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Prediction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {betsQuery.data
                      ?.filter(bet => bet.actualResult === "pending")
                      .map((bet) => (
                        <TableRow key={bet.id}>
                          <TableCell>{new Date(bet.date).toLocaleDateString()}</TableCell>
                          <TableCell>{bet.game}</TableCell>
                          <TableCell>{bet.betType}</TableCell>
                          <TableCell>{bet.odds}</TableCell>
                          <TableCell>{formatCurrency(bet.betAmount)}</TableCell>
                          <TableCell>{bet.predictedResult}</TableCell>
                          <TableCell>{getResultBadge(bet.actualResult)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdateResult(bet.id)}
                              >
                                Update Result
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteBet(bet.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Bet History</CardTitle>
              <CardDescription>
                Record of all your bets and their outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {betsQuery.isLoading ? (
                <p>Loading bet history...</p>
              ) : betsQuery.data?.length === 0 ? (
                <p>No bet history found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Bet Type</TableHead>
                      <TableHead>Odds</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Bankroll After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {betsQuery.data?.map((bet) => (
                      <React.Fragment key={bet.id}>
                        <TableRow>
                          <TableCell>{new Date(bet.date).toLocaleDateString()}</TableCell>
                          <TableCell>{bet.game}</TableCell>
                          <TableCell>{bet.betType}</TableCell>
                          <TableCell>{bet.odds}</TableCell>
                          <TableCell>{formatCurrency(bet.betAmount)}</TableCell>
                          <TableCell>{getResultBadge(bet.actualResult)}</TableCell>
                          <TableCell className={bet.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(bet.profitLoss)}
                          </TableCell>
                          <TableCell>{formatCurrency(bet.bankrollAfter)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUpdateResult(bet.id)}
                              >
                                Update Result
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditBet(bet.id)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleToggleDetails(bet.id)}
                              >
                                {expandedBetId === bet.id ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteBet(bet.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedBetId === bet.id && bet.recommendationId && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-slate-50 dark:bg-slate-900">
                              <div className="p-4">
                                <h4 className="font-semibold mb-2">AI Analysis & Prediction Justification</h4>
                                {recommendationsQuery.data && (
                                  <div>
                                    {recommendationsQuery.data.find(r => r.id === bet.recommendationId)?.analysis || 
                                     "No analysis available for this bet."}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Bet Dialog */}
      <Dialog open={isAddBetDialogOpen} onOpenChange={setIsAddBetDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Place New Bet</DialogTitle>
            <DialogDescription>
              Track a new bet in your bankroll management system
            </DialogDescription>
          </DialogHeader>
          <Form {...betForm}>
            <form onSubmit={betForm.handleSubmit(onBetSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={betForm.control}
                  name="recommendationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Based on Recommendation</FormLabel>
                      <Select
                        onValueChange={handleRecommendationChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a recommendation (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {recommendationsQuery.data?.map((rec) => (
                            <SelectItem key={rec.id} value={rec.id.toString()}>
                              {rec.game} - {rec.betType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a recommendation to pre-fill the form or enter manually
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={betForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={betForm.control}
                  name="betAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bet Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                          <Input {...field} type="number" step="0.01" min="0" className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={betForm.control}
                  name="game"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Yankees vs. Red Sox" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={betForm.control}
                  name="betType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bet Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Moneyline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={betForm.control}
                  name="odds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odds</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. -110" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={betForm.control}
                  name="confidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidence (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" max="100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={betForm.control}
                name="predictedResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Predicted Outcome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Yankees Win" />
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
                      <Textarea {...field} placeholder="Any additional notes about this bet" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddBetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addBetMutation.isPending}>
                  {addBetMutation.isPending ? "Adding..." : "Add Bet"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Update Result Dialog */}
      <Dialog open={isUpdateResultDialogOpen} onOpenChange={setIsUpdateResultDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Bet Result</DialogTitle>
            <DialogDescription>
              Record the outcome of this bet
            </DialogDescription>
          </DialogHeader>
          <Form {...resultUpdateForm}>
            <form onSubmit={resultUpdateForm.handleSubmit(onResultUpdateSubmit)} className="space-y-4">
              <FormField
                control={resultUpdateForm.control}
                name="actualResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="win">Win</SelectItem>
                        <SelectItem value="loss">Loss</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={resultUpdateForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any notes about the outcome" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUpdateResultDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateResultMutation.isPending}>
                  {updateResultMutation.isPending ? "Updating..." : "Update Result"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Bet Dialog */}
      <Dialog open={isEditBetDialogOpen} onOpenChange={setIsEditBetDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Bet</DialogTitle>
            <DialogDescription>
              Update the details of this bet
            </DialogDescription>
          </DialogHeader>
          <Form {...betForm}>
            <form onSubmit={betForm.handleSubmit(onEditBetSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={betForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={betForm.control}
                  name="betAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bet Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                          <Input {...field} type="number" step="0.01" min="0" className="pl-8" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={betForm.control}
                  name="game"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Yankees vs. Red Sox" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={betForm.control}
                  name="betType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bet Type</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Moneyline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={betForm.control}
                  name="odds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Odds</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. -110" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={betForm.control}
                  name="confidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confidence (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" max="100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={betForm.control}
                name="predictedResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Predicted Outcome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Yankees Win" />
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
                      <Textarea {...field} placeholder="Any additional notes about this bet" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditBetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editBetMutation.isPending}>
                  {editBetMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}