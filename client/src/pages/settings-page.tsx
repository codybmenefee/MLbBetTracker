import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showGoogleAppsScriptSetupGuide, isValidGoogleAppsScriptUrl } from "@/lib/google-apps-script";
import { InfoIcon } from "lucide-react";

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
});

type AppsScriptFormValues = z.infer<typeof appsScriptFormSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [savedScriptSettings, setSavedScriptSettings] = useState<string | null>(null);

  // Form for Google Apps Script configuration
  const scriptForm = useForm<AppsScriptFormValues>({
    resolver: zodResolver(appsScriptFormSchema),
    defaultValues: {
      googleAppsScriptUrl: "",
    },
  });

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    // Load Google Apps Script URL
    const savedAppScriptUrl = localStorage.getItem("googleAppsScriptUrl");
    if (savedAppScriptUrl) {
      setSavedScriptSettings(savedAppScriptUrl);
      scriptForm.reset({ googleAppsScriptUrl: savedAppScriptUrl });
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
              <p className="text-sm text-green-600 dark:text-green-400">
                Direct integration configured
              </p>
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