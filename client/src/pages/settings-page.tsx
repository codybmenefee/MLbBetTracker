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
      message: "Must be a valid Google Apps Script URL (e.g., https://script.google.com/macros/s/...)"
    })
});

type GoogleSheetsFormValues = z.infer<typeof googleSheetsFormSchema>;
type AppsScriptFormValues = z.infer<typeof appsScriptFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [savedSheetsSettings, setSavedSheetsSettings] = useState<GoogleSheetsFormValues | null>(null);
  const [savedScriptSettings, setSavedScriptSettings] = useState<string | null>(null);

  // Form for Google Sheets configuration
  const sheetsForm = useForm<GoogleSheetsFormValues>({
    resolver: zodResolver(googleSheetsFormSchema),
    defaultValues: {
      googleSheetUrl: "",
      googleSheetName: "MLB Betting Recommendations",
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
    // Save to localStorage
    localStorage.setItem("googleSheetsConfig", JSON.stringify(data));
    setSavedSheetsSettings(data);
    
    toast({
      title: "Settings saved",
      description: "Your Google Sheets configuration has been updated.",
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