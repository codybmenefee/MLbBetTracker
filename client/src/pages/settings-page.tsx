import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

// Form schema
const formSchema = z.object({
  googleSheetUrl: z.string()
    .trim()
    .min(1, "Google Sheet URL is required")
    .regex(/^https:\/\/(docs\.google\.com\/spreadsheets\/d\/|sheets\.new)/, 
      "Must be a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/... or https://sheets.new)"),
  googleSheetName: z.string().trim().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [savedSettings, setSavedSettings] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      googleSheetUrl: "",
      googleSheetName: "MLB Betting Recommendations",
    },
  });

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem("googleSheetsConfig");
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setSavedSettings(parsedData);
        form.reset(parsedData);
      } catch (e) {
        console.error("Error parsing saved settings:", e);
      }
    }
  }, []);

  const onSubmit = (data: FormValues) => {
    // Save to localStorage
    localStorage.setItem("googleSheetsConfig", JSON.stringify(data));
    setSavedSettings(data);
    
    toast({
      title: "Settings saved",
      description: "Your Google Sheets configuration has been updated.",
    });
  };

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Google Sheets Configuration</CardTitle>
          <CardDescription>
            Configure where your betting recommendations will be exported
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
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
                control={form.control}
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
          {savedSettings ? (
            <div className="text-sm">
              <p><strong>Google Sheet URL:</strong> {savedSettings.googleSheetUrl}</p>
              <p><strong>Sheet Name:</strong> {savedSettings.googleSheetName || "Default"}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No configuration saved yet</p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}