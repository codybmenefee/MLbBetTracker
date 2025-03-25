import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showGoogleAppsScriptSetupGuide, isValidGoogleAppsScriptUrl } from "@/lib/google-apps-script";
import { InfoIcon, Copy, CheckCircle2, Clock, ArrowRight, RefreshCw } from "lucide-react";

// Validation schema for Google Apps Script configuration
const appsScriptFormSchema = z.object({
  googleAppsScriptUrl: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (url) => isValidGoogleAppsScriptUrl(url),
      { 
        message: "Must be a valid Google Apps Script web app URL (should end with /exec)" 
      }
    ),
  googleSpreadsheetId: z
    .string()
    .min(20, "Spreadsheet ID must be at least 20 characters long")
    .max(100, "Spreadsheet ID seems too long, please check it")
    .regex(/^[a-zA-Z0-9_-]+$/, "Spreadsheet ID should only contain letters, numbers, underscores, and hyphens")
    .optional(),
});

// Validation schema for scheduler settings
const schedulerFormSchema = z.object({
  refreshTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be in 24-hour format (HH:MM)")
});

type AppsScriptFormValues = z.infer<typeof appsScriptFormSchema>;
type SchedulerFormValues = z.infer<typeof schedulerFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [savedScriptSettings, setSavedScriptSettings] = useState<{url: string, spreadsheetId?: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const [isManualRefreshLoading, setIsManualRefreshLoading] = useState(false);

  // Form for Google Apps Script configuration
  const scriptForm = useForm<AppsScriptFormValues>({
    resolver: zodResolver(appsScriptFormSchema),
    defaultValues: {
      googleAppsScriptUrl: "",
      googleSpreadsheetId: "",
    },
  });
  
  // Form for scheduler settings
  const schedulerForm = useForm<SchedulerFormValues>({
    resolver: zodResolver(schedulerFormSchema),
    defaultValues: {
      refreshTime: "07:00", // Default to 7:00 AM
    },
  });
  
  // Fetch current scheduler settings
  const schedulerQuery = useQuery<{
    refreshTime: string;
    timeZone: string;
    nextScheduledRefresh: string | null;
  }>({
    queryKey: ["/api/scheduler"],
  });
  
  // Update the form when data is loaded
  useEffect(() => {
    if (schedulerQuery.data) {
      schedulerForm.reset({
        refreshTime: schedulerQuery.data.refreshTime || "07:00",
      });
    }
  }, [schedulerQuery.data, schedulerForm]);
  
  // Mutation to update scheduler settings
  const updateSchedulerMutation = useMutation({
    mutationFn: async (data: SchedulerFormValues) => {
      return await apiRequest({
        url: "/api/scheduler/refresh-time",
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Scheduler Updated",
        description: "Daily refresh time has been updated.",
      });
      schedulerQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update scheduler settings.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to manually trigger a refresh
  const triggerRefreshMutation = useMutation({
    mutationFn: async () => {
      setIsManualRefreshLoading(true);
      return await apiRequest({
        url: "/api/scheduler/trigger",
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Refresh Triggered",
        description: "Manual refresh has been triggered. This may take a moment to complete.",
      });
      setIsManualRefreshLoading(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to trigger manual refresh.",
        variant: "destructive",
      });
      setIsManualRefreshLoading(false);
    },
  });

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    // Load Google Apps Script URL
    const savedAppScriptUrl = localStorage.getItem("googleAppsScriptUrl");
    const savedSpreadsheetId = localStorage.getItem("googleSpreadsheetId");
    
    if (savedAppScriptUrl) {
      setSavedScriptSettings({ 
        url: savedAppScriptUrl, 
        spreadsheetId: savedSpreadsheetId || undefined 
      });
      
      scriptForm.reset({ 
        googleAppsScriptUrl: savedAppScriptUrl,
        googleSpreadsheetId: savedSpreadsheetId || "",
      });
    }
  }, [scriptForm]);

  const onScriptSubmit = (data: AppsScriptFormValues) => {
    try {
      // Remove any Google Sheets configuration (since we're only using direct integration now)
      localStorage.removeItem("googleSheetsConfig");
      
      // Save the Apps Script URL
      localStorage.setItem("googleAppsScriptUrl", data.googleAppsScriptUrl);
      
      // Save the Spreadsheet ID if provided
      if (data.googleSpreadsheetId) {
        localStorage.setItem("googleSpreadsheetId", data.googleSpreadsheetId);
      } else {
        // Remove the item if not provided
        localStorage.removeItem("googleSpreadsheetId");
      }
      
      setSavedScriptSettings({
        url: data.googleAppsScriptUrl,
        spreadsheetId: data.googleSpreadsheetId
      });
      
      toast({
        title: "Settings Saved",
        description: "Google Apps Script configuration has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Google Apps Script configuration.",
        variant: "destructive",
      });
    }
  };

  const appsScriptCode = `/**
 * MLB Betting Recommendations - Google Apps Script
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Save and deploy as a web app (Publish > Deploy as web app)
 *    - Execute as: Me
 *    - Who has access: Anyone (or specific users/domain)
 * 5. Copy the web app URL for use in your application
 * 6. Also copy your Spreadsheet ID from the URL: docs.google.com/spreadsheets/d/<ID>/edit
 */

// Process HTTP POST requests from your app
function doPost(e) {
  try {
    // Parse the JSON data sent from your application
    const data = JSON.parse(e.postData.contents);
    const recommendations = data.recommendations;
    const spreadsheetId = data.spreadsheetId; // Get the spreadsheet ID from the request
    
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No valid recommendations data provided"
      }))
      .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Get the spreadsheet by ID if provided, otherwise use active spreadsheet
    let ss;
    if (spreadsheetId) {
      try {
        ss = SpreadsheetApp.openById(spreadsheetId);
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: \`Could not open spreadsheet with ID \${spreadsheetId}: \${error.toString()}\`
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      // Fallback to active spreadsheet if no ID provided
      try {
        ss = SpreadsheetApp.getActiveSpreadsheet();
        if (!ss) {
          throw new Error("No active spreadsheet found and no spreadsheet ID provided");
        }
      } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
          success: false,
          error: \`No spreadsheet available: \${error.toString()}\`
        }))
        .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Use today's date for the sheet name if not provided
    const today = new Date().toISOString().split('T')[0];
    const sheetName = data.sheetName || \`MLB Betting Recommendations \${today}\`;
    
    // Try to get the sheet if it exists, otherwise create it
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Clear previous content and format the sheet
    sheet.clear();
    
    // Set up headers
    const headers = ["Game", "Bet Type", "Odds", "Confidence", "Prediction", "Generated At", "Date Exported"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header row
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#4285F4")
      .setFontColor("white")
      .setFontWeight("bold");
    
    // Prepare data rows
    const rows = recommendations.map(rec => [
      rec.game,
      rec.betType,
      rec.odds,
      \`\${rec.confidence}%\`,
      rec.prediction,
      new Date(rec.generatedAt).toLocaleString(),
      new Date().toLocaleString()
    ]);
    
    // Write data to sheet
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
    
    // Auto-size columns for better readability
    for (let i = 1; i <= headers.length; i++) {
      sheet.autoResizeColumn(i);
    }
    
    // Add alternating row colors
    if (rows.length > 0) {
      for (let i = 0; i < rows.length; i++) {
        if (i % 2 === 1) {
          sheet.getRange(i + 2, 1, 1, headers.length).setBackground("#f3f3f3");
        }
      }
    }
    
    // Return success response
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: \`Successfully exported \${rows.length} recommendations to sheet "\${sheetName}"\`,
      updatedAt: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    // Return error response
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

// Process HTTP GET requests - shows a helpful info page when users visit the script URL
function doGet() {
  // Get the active spreadsheet URL and ID to help users
  let spreadsheetUrl = "";
  let spreadsheetId = "";
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    spreadsheetUrl = ss.getUrl();
    spreadsheetId = ss.getId();
  } catch (e) {
    spreadsheetUrl = "Unable to determine spreadsheet URL. Make sure you're running this script from your Google Sheet.";
    spreadsheetId = "Unable to determine spreadsheet ID.";
  }
  
  // Create a simple HTML page with instructions and the spreadsheet link
  const htmlOutput = HtmlService.createHtmlOutput(\`
    <html>
      <head>
        <title>MLB Betting Recommendations - Google Apps Script</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #4285F4; }
          .success { background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .info { background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
          a { color: #4285F4; }
          code { background-color: #f8f9fa; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
          .copy-button { background-color: #4285F4; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-left: 10px; }
          .id-box { background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; border: 1px solid #ddd; }
        </style>
        <script>
          function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(function() {
              alert('Spreadsheet ID copied to clipboard!');
            }, function() {
              alert('Failed to copy. Please select and copy the ID manually.');
            });
          }
        </script>
      </head>
      <body>
        <h1>MLB Betting Recommendations - Google Apps Script</h1>
        
        <div class="success">
          <strong>✓ Success!</strong> Your Google Apps Script is properly deployed and ready to receive data from the MLB Betting Recommendations application.
        </div>
        
        <div class="info">
          <strong>Your Google Spreadsheet:</strong><br>
          <a href="\${spreadsheetUrl}" target="_blank">\${spreadsheetUrl}</a>
        </div>
        
        <div class="warning">
          <strong>IMPORTANT: Spreadsheet ID Required</strong>
          <p>To use this script in production, you must provide your Spreadsheet ID in the Settings of the MLB Betting app.</p>
          <p>Your Spreadsheet ID is:</p>
          <div class="id-box" id="spreadsheetId">\${spreadsheetId}</div>
          <button class="copy-button" onclick="copyToClipboard('\${spreadsheetId}')">Copy ID</button>
          <p>Add this ID to the <strong>Spreadsheet ID</strong> field in your app's Settings page, along with the Apps Script URL.</p>
        </div>
        
        <h2>How this works:</h2>
        <p>
          This script is connected to your MLB Betting Recommendations application. When you click "Export to Google Sheets" 
          in the application, your betting recommendations will be sent directly to this script, which will then create or update 
          a sheet in your Google Spreadsheet with the latest data.
        </p>
        
        <h2>Important Notes:</h2>
        <ul>
          <li>This page appears when you visit the script URL directly in your browser</li>
          <li>The actual data transfer happens through POST requests from the application</li>
          <li>A new sheet tab will be created for each day's recommendations (format: <code>MLB Betting Recommendations YYYY-MM-DD</code>)</li>
          <li>If you encounter any issues, you can check the Execution Log in the Apps Script editor</li>
          <li><strong>The Spreadsheet ID is required</strong> for the integration to work properly in production</li>
        </ul>
        
        <p>Return to your MLB Betting Recommendations application to continue.</p>
      </body>
    </html>
  \`);
  
  return htmlOutput;
}

/**
 * Test function - can be run directly from the Apps Script editor
 * to test the functionality with sample data
 */
function testWithSampleData() {
  // Use today's date for the test sheet name
  const today = new Date().toISOString().split('T')[0];
  
  // Try to get the current spreadsheet ID
  let currentSpreadsheetId = "";
  try {
    currentSpreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (e) {
    Logger.log("Could not get active spreadsheet ID, using test ID instead");
    currentSpreadsheetId = "REPLACE_WITH_YOUR_SPREADSHEET_ID"; // Users should replace this with their actual ID
  }
  
  const sampleData = {
    recommendations: [
      {
        game: "New York Yankees vs Boston Red Sox",
        betType: "Moneyline",
        odds: "-150",
        confidence: 75,
        prediction: "Yankees Win",
        generatedAt: new Date().toISOString()
      },
      {
        game: "Los Angeles Dodgers vs San Francisco Giants",
        betType: "Run Line (-1.5)",
        odds: "+120",
        confidence: 65,
        prediction: "Dodgers Cover",
        generatedAt: new Date().toISOString()
      }
    ],
    spreadsheetId: currentSpreadsheetId, // Include the spreadsheet ID
    sheetName: \`MLB Betting Recommendations \${today}\`
  };
  
  // Simulate a POST request
  const mockE = {
    postData: {
      contents: JSON.stringify(sampleData)
    }
  };
  
  // Process the mock request
  const result = doPost(mockE);
  
  // Log the result
  Logger.log(result.getContent());
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    toast({
      title: "Code Copied",
      description: "Apps Script code copied to clipboard",
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };
  
  // Handler for scheduler form submission
  const onSchedulerSubmit = (data: SchedulerFormValues) => {
    updateSchedulerMutation.mutate(data);
  };
  
  // Handler for manual refresh
  const handleManualRefresh = () => {
    triggerRefreshMutation.mutate();
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="w-full max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Google Apps Script Integration</CardTitle>
            <CardDescription>
              Set up direct export to Google Sheets (without manual copy-paste)
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <InfoIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium mb-1">How to set up direct export</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    For automatic publishing to Google Sheets, follow these steps:
                  </p>
                  <ol className="text-sm text-muted-foreground space-y-2 ml-5 list-decimal">
                    <li>Open your target Google Spreadsheet</li>
                    <li>Go to <strong>Extensions &gt; Apps Script</strong> in the menu</li>
                    <li>Copy the Google Apps Script code below</li>
                    <li>Paste it into the Apps Script editor, replacing any existing code</li>
                    <li>Click <strong>Save</strong> (disk icon)</li>
                    <li>Click <strong>Deploy &gt; New deployment</strong></li>
                    <li>Set type to <strong>Web app</strong></li>
                    <li>Set <strong>Execute as: Me</strong> and <strong>Who has access: Anyone</strong></li>
                    <li>Click <strong>Deploy</strong> and authorize when prompted</li>
                    <li>Copy the <strong>Web app URL</strong> and paste it below</li>
                  </ol>
                  <div className="mt-2">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm"
                      onClick={() => showGoogleAppsScriptSetupGuide()}
                    >
                      Show interactive guide
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-4 mb-6">
              <div className="flex items-start">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-amber-500 mr-2 mt-0.5"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div>
                  <h4 className="text-sm font-medium mb-1">Important: URL Format</h4>
                  <p className="text-sm text-muted-foreground">
                    The Apps Script URL <strong>must end with /exec</strong> to work properly. It should look like:
                    <code className="block bg-amber-100 dark:bg-amber-900 p-1 mt-1 rounded">
                      https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
                    </code>
                    If you're seeing a Google login screen, your URL may be incorrect or the script may not be deployed as a web app.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Google Apps Script Code</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" /> Copy Code
                    </>
                  )}
                </Button>
              </div>
              <div className="relative">
                <pre className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md text-xs overflow-auto max-h-[300px] border border-slate-200 dark:border-slate-800 font-mono">
                  {appsScriptCode}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Copy this code and paste it into your Google Apps Script editor
              </p>
            </div>
            
            <Separator className="my-6" />
            
            <Form {...scriptForm}>
              <form onSubmit={scriptForm.handleSubmit(onScriptSubmit)} className="space-y-6">
                <FormField
                  control={scriptForm.control}
                  name="googleAppsScriptUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Apps Script Web App URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://script.google.com/macros/s/..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the web app URL of your deployed Google Apps Script
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={scriptForm.control}
                  name="googleSpreadsheetId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Spreadsheet ID</FormLabel>
                      <FormControl>
                        <Input placeholder="19O3tbUwpyjz56MK2YkX-qTzTKp8EBW3bHAQ5rr6_a3Q" {...field} />
                      </FormControl>
                      <FormDescription>
                        Enter the ID of your Google Spreadsheet. You can find this by visiting 
                        your spreadsheet and looking at the URL: 
                        docs.google.com/spreadsheets/d/<strong>spreadsheet-id</strong>/edit. 
                        This is required for the script to work in production.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit">Save Settings</Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-between border-t px-6 py-4">
            {savedScriptSettings ? (
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Direct integration configured
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Web App URL: {savedScriptSettings.url}
                </p>
                {savedScriptSettings.spreadsheetId && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Spreadsheet ID: {savedScriptSettings.spreadsheetId}
                  </p>
                )}
                {!savedScriptSettings.spreadsheetId && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Warning: No Spreadsheet ID provided. This may cause issues in production.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Direct export not configured. Currently using clipboard-based export.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}