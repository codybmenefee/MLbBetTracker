import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { showGoogleAppsScriptSetupGuide, isValidGoogleAppsScriptUrl } from "@/lib/google-apps-script";
import { InfoIcon, Copy, CheckCircle2 } from "lucide-react";

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

type AppsScriptFormValues = z.infer<typeof appsScriptFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [savedScriptSettings, setSavedScriptSettings] = useState<{url: string, spreadsheetId?: string} | null>(null);
  const [copied, setCopied] = useState(false);

  // Form for Google Apps Script configuration
  const scriptForm = useForm<AppsScriptFormValues>({
    resolver: zodResolver(appsScriptFormSchema),
    defaultValues: {
      googleAppsScriptUrl: "",
      googleSpreadsheetId: "",
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
      setSavedScriptSettings(data.googleAppsScriptUrl);
      
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
 */

// Process HTTP POST requests from your app
function doPost(e) {
  try {
    // Parse the JSON data sent from your application
    const data = JSON.parse(e.postData.contents);
    const recommendations = data.recommendations;
    
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No valid recommendations data provided"
      }))
      .setMimeType(ContentService.MimeType.JSON);
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

// Process HTTP GET requests (for testing)
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    status: "The API is running",
    instructions: "Send POST requests with recommendation data to use this endpoint"
  }))
  .setMimeType(ContentService.MimeType.JSON);
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
                  Using: {savedScriptSettings}
                </p>
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