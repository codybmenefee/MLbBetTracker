import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { showGoogleAppsScriptSetupGuide, isValidGoogleAppsScriptUrl } from "@/lib/google-apps-script";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { InfoIcon } from 'lucide-react';

// Form schema
const googleSheetsFormSchema = z.object({
  googleSheetUrl: z.string()
    .trim()
    .min(1, "Google Sheet URL is required")
    .regex(/^https:\/\/(docs\.google\.com\/spreadsheets\/d\/|sheets\.new)/, 
      "Must be a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/... or https://sheets.new)"),
  googleSheetName: z.string().trim().optional(),
});

const appsScriptFormSchema = z.object({
  googleAppsScriptUrl: z.string()
    .trim()
    .min(1, "Google Apps Script URL is required")
    .refine(isValidGoogleAppsScriptUrl, {
      message: "Must be a valid Google Apps Script web app URL that ends with '/exec' (e.g., https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec). Script library URLs ending with a number (like /1 or /2) will not work properly."
    })
});

type GoogleSheetsFormValues = z.infer<typeof googleSheetsFormSchema>;
type AppsScriptFormValues = z.infer<typeof appsScriptFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [savedSheetsSettings, setSavedSheetsSettings] = useState<GoogleSheetsFormValues | null>(null);
  const [savedScriptSettings, setSavedScriptSettings] = useState<string | null>(null);

  // Today's date in format 'YYYY-MM-DD'
  const today = new Date().toISOString().split('T')[0];

  // Form for Google Sheets configuration
  const sheetsForm = useForm<GoogleSheetsFormValues>({
    resolver: zodResolver(googleSheetsFormSchema),
    defaultValues: {
      googleSheetUrl: "",
      googleSheetName: `MLB Betting Recommendations ${today}`,
    },
  });

  // Form for Google Apps Script configuration
  const scriptForm = useForm<AppsScriptFormValues>({
    resolver: zodResolver(appsScriptFormSchema),
    defaultValues: {
      googleAppsScriptUrl: "",
    },
  });

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    // Load Google Sheets config
    const savedSheetsData = localStorage.getItem("googleSheetsConfig");
    if (savedSheetsData) {
      try {
        const parsedData = JSON.parse(savedSheetsData);
        setSavedSheetsSettings(parsedData);
        sheetsForm.reset(parsedData);
      } catch (e) {
        console.error("Error parsing saved sheets settings:", e);
      }
    }

    // Load Google Apps Script URL
    const savedScriptUrl = localStorage.getItem("googleAppsScriptUrl");
    if (savedScriptUrl) {
      setSavedScriptSettings(savedScriptUrl);
      scriptForm.reset({ googleAppsScriptUrl: savedScriptUrl });
    }
  }, []);

  const onSheetsSubmit = (data: GoogleSheetsFormValues) => {
    // Always use today's date in the sheet name regardless of what was entered
    const today = new Date().toISOString().split('T')[0];
    const updatedData = {
      ...data,
      googleSheetName: `MLB Betting Recommendations ${today}`
    };
    
    // Save to localStorage
    localStorage.setItem("googleSheetsConfig", JSON.stringify(updatedData));
    setSavedSheetsSettings(updatedData);
    
    toast({
      title: "Settings saved",
      description: "Your Google Sheets configuration has been updated. The sheet name will always include today's date.",
    });
  };

  const onScriptSubmit = (data: AppsScriptFormValues) => {
    // Save to localStorage
    localStorage.setItem("googleAppsScriptUrl", data.googleAppsScriptUrl);
    setSavedScriptSettings(data.googleAppsScriptUrl);
    
    toast({
      title: "Settings saved",
      description: "Your Google Apps Script URL has been saved. Direct export is now enabled.",
    });
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="sheets" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
          <TabsTrigger value="apps-script">Direct Integration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sheets">
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets Configuration</CardTitle>
              <CardDescription>
                Configure where your betting recommendations will be exported
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <Form {...sheetsForm}>
                <form onSubmit={sheetsForm.handleSubmit(onSheetsSubmit)} className="space-y-6">
                  <FormField
                    control={sheetsForm.control}
                    name="googleSheetUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Sheet URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://docs.google.com/spreadsheets/d/..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the URL of your Google Sheet. You can create a new one at{" "}
                          <a 
                            href="https://sheets.new" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline"
                          >
                            sheets.new
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={sheetsForm.control}
                    name="googleSheetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sheet Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="MLB Betting Recommendations" {...field} />
                        </FormControl>
                        <FormDescription>
                          The name of the sheet where recommendations will be exported
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Settings</Button>
                </form>
              </Form>
            </CardContent>
            
            <CardFooter className="flex flex-col items-start border-t pt-6">
              <h3 className="font-medium mb-2">Current Configuration</h3>
              {savedSheetsSettings ? (
                <div className="text-sm">
                  <p><strong>Google Sheet URL:</strong> {savedSheetsSettings.googleSheetUrl}</p>
                  <p><strong>Sheet Name:</strong> {savedSheetsSettings.googleSheetName || "Default"}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No configuration saved yet</p>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="apps-script">
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
                    <p className="text-sm text-muted-foreground">
                      For automatic publishing to Google Sheets, you need to create a Google Apps Script. 
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm"
                        onClick={() => showGoogleAppsScriptSetupGuide()}
                      >
                        View setup instructions
                      </Button>
                    </p>
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
                <h3 className="text-sm font-medium mb-2">Google Apps Script Code</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Copy this code and paste it into the Apps Script editor in your Google Sheet:
                </p>
                <div className="relative">
                  <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-xs overflow-auto max-h-[300px] border border-gray-200 dark:border-gray-800">{`/**
 * MLB Betting Recommendations - Google Apps Script
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Save and deploy as a web app (Deploy > New deployment)
 *    - Select type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the web app URL for use in your application
 */

// Process HTTP POST requests from your app
function doPost(e) {
  try {
    // Parse the JSON data sent from your application
    const data = JSON.parse(e.postData.contents);
    const recommendations = data.recommendations;
    
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return createCORSResponse({
        success: false,
        error: "No valid recommendations data provided"
      });
    }
    
    // Get the active spreadsheet and sheet (or create a new sheet)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = data.sheetName || "MLB Recommendations";
    
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
    return createCORSResponse({
      success: true,
      message: \`Successfully exported \${rows.length} recommendations to sheet "\${sheetName}"\`,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    // Return error response
    return createCORSResponse({
      success: false,
      error: error.toString()
    });
  }
}

// Process HTTP GET requests (for testing)
function doGet() {
  return createCORSResponse({
    status: "The API is running",
    instructions: "Send POST requests with recommendation data to use this endpoint"
  });
}

/**
 * Helper function to create CORS-enabled responses
 * This allows the web app to be accessed from any domain
 */
function createCORSResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '3600');
}

/**
 * Test function - can be run directly from the Apps Script editor
 * to test the functionality with sample data
 */
function testWithSampleData() {
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
    sheetName: "Test Data"
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
}`}</pre>
                  <Button
                    className="absolute top-2 right-2 h-7 w-7 p-0"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        document.querySelector('pre')?.textContent || ''
                      );
                      toast({
                        title: "Copied to clipboard",
                        description: "Google Apps Script code copied to clipboard"
                      });
                    }}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="15" 
                      height="15" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  No API keys needed! This script uses your Google account's permissions.
                </p>
              </div>
              
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
                          Enter the deployed web app URL from your Google Apps Script
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">Save Script URL</Button>
                </form>
              </Form>
              
              <Separator className="my-6" />
              
              <div className="text-sm">
                <h3 className="font-medium mb-2">About Direct Integration</h3>
                <p className="text-muted-foreground mb-2">
                  Direct integration uses a Google Apps Script attached to your spreadsheet to automatically publish recommendation data. 
                  This eliminates the need to manually copy and paste data.
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Create a Google Apps Script in your target spreadsheet</li>
                  <li>Deploy it as a web app that anyone can access</li>
                  <li>Copy the web app URL and paste it above</li>
                </ol>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col items-start border-t pt-6">
              <h3 className="font-medium mb-2">Current Integration Status</h3>
              {savedScriptSettings ? (
                <div className="text-sm">
                  <p className="text-green-600 dark:text-green-400 font-medium">✓ Direct export enabled</p>
                  <p className="text-muted-foreground mt-1">Configured endpoint: {savedScriptSettings}</p>
                </div>
              ) : (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Direct export not configured. Currently using clipboard-based export.
                </p>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}