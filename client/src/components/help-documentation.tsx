import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showGoogleAppsScriptSetupGuide } from "@/lib/google-apps-script";
import { Button } from "@/components/ui/button";

export default function HelpDocumentation() {
  const faqs = [
    {
      id: "format-csv",
      question: "How to format your CSV",
      answer: (
        <>
          <p className="text-gray-700 mb-3">
            Your CSV file should include the following columns:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
            <li>Home Team: Full team name (e.g., "New York Yankees")</li>
            <li>Away Team: Full team name (e.g., "Boston Red Sox")</li>
            <li>Game Time: Format as "YYYY-MM-DD HH:MM" in 24-hour format</li>
            <li>Home Odds: American odds format (e.g., -110, +150)</li>
            <li>Away Odds: American odds format (e.g., -110, +150)</li>
            <li>Over/Under: Total runs (e.g., 8.5)</li>
            <li>O/U Odds: American odds format for Over (e.g., -110)</li>
          </ul>
          <p className="text-gray-700">
            Download our template from the Schedule page for the exact format required.
          </p>
        </>
      ),
    },
    {
      id: "how-bets-generated",
      question: "How bets are generated",
      answer: (
        <>
          <p className="text-gray-700 mb-3">
            Our AI system analyzes several factors to generate betting recommendations:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
            <li>Historical team performance data</li>
            <li>Head-to-head matchup statistics</li>
            <li>Current team form and momentum</li>
            <li>Pitching matchups and bullpen analysis</li>
            <li>Market odds and line movements</li>
          </ul>
          <p className="text-gray-700">
            The AI evaluates all factors and assigns a confidence score to each prediction.
          </p>
        </>
      ),
    },
    {
      id: "google-sheets-integration",
      question: "How to set up Google Sheets direct integration",
      answer: (
        <>
          <p className="text-gray-700 mb-3">
            The app offers two ways to export recommendations to Google Sheets:
          </p>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 mb-3">
            <li>
              <strong>Basic export:</strong> Copies data to clipboard in a format ready for pasting
              into Google Sheets. This requires you to manually paste the data.
            </li>
            <li>
              <strong>Direct integration:</strong> Automatically publishes recommendations directly
              to your Google Sheet without manual copying/pasting.
            </li>
          </ol>
          
          <p className="font-medium text-gray-800 mt-4 mb-2">Setting up Direct Integration</p>
          
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 mb-4">
            <li>
              Create a Google Sheet where you want recommendations to be published
              (or use an existing sheet)
            </li>
            <li>
              In your Google Sheet, go to <strong>Extensions &gt; Apps Script</strong>
            </li>
            <li>
              Delete any code in the editor and paste the Google Apps Script code from our documentation
              (found in "docs/google-apps-script-solution.js" in the project repository)
            </li>
            <li>
              Save the script (File &gt; Save) with a name like "MLB Recommendations Importer"
            </li>
            <li>
              Deploy the script by clicking <strong>Deploy &gt; New deployment</strong>
            </li>
            <li>
              Select <strong>Web app</strong> as the deployment type
            </li>
            <li>
              Set "Who has access" to <strong>Anyone</strong> (so our app can send data to it)
            </li>
            <li>
              Click <strong>Deploy</strong> and authorize the script when prompted
            </li>
            <li>
              Copy the web app URL that appears after deployment
            </li>
            <li>
              In our app's Settings page, go to the "Direct Integration" tab and paste the URL
            </li>
          </ol>
          
          <p className="text-gray-700 mb-3">
            Once configured, the app will automatically send recommendations to your Google Sheet
            whenever you click the "Export to Google Sheets" button.
          </p>
          
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => showGoogleAppsScriptSetupGuide()}
          >
            Show Detailed Setup Instructions
          </Button>
        </>
      ),
    },
    {
      id: "why-results-vary",
      question: "Why results may vary (AI limitations)",
      answer: (
        <>
          <p className="text-gray-700 mb-3">
            While our AI system provides data-driven recommendations, please be aware of these limitations:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
            <li>AI models cannot account for last-minute lineup changes or injuries</li>
            <li>Weather conditions may not be factored into predictions</li>
            <li>The model has incomplete information about team strategies</li>
            <li>Sports outcomes inherently include randomness and unpredictability</li>
          </ul>
          <p className="text-gray-700">
            Always use these recommendations as one of several factors in your betting decisions.
          </p>
        </>
      ),
    },
    {
      id: "privacy-note",
      question: "Privacy note",
      answer: (
        <>
          <p className="text-gray-700 mb-3">
            We take your privacy seriously. Here's what you should know:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 mb-3">
            <li>Your uploaded data is only used to generate recommendations</li>
            <li>We do not store or share your betting history with third parties</li>
            <li>Google Sheet access is restricted to your account only</li>
            <li>API requests are secured with encryption</li>
          </ul>
          <p className="text-gray-700">
            For more details, please review our complete privacy policy.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="container py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Help & Instructions</h2>
          <p className="text-muted-foreground">Learn how to use the MLB betting recommendations app</p>
        </div>
      </div>
      
      <Tabs defaultValue="faqs" className="w-full mx-auto">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="sheets-setup">Google Sheets Setup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem value={faq.id} key={faq.id}>
                    <AccordionTrigger className="text-gray-900 font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sheets-setup">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Setting Up Google Sheets Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  To automatically publish recommendations to Google Sheets without manual copying and pasting,
                  you'll need to set up the Google Apps Script integration.
                </p>
                
                <h3 className="text-lg font-medium">Step 1: Create or Open a Google Sheet</h3>
                <p>Start by creating a new Google Sheet or opening an existing one where you want to store your recommendations.</p>
                
                <h3 className="text-lg font-medium">Step 2: Open the Apps Script Editor</h3>
                <p>From your Google Sheet, go to <strong>Extensions → Apps Script</strong> in the menu bar.</p>
                
                <h3 className="text-lg font-medium">Step 3: Add the Integration Code</h3>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <p className="text-sm mb-2 text-gray-700">
                    Delete any existing code in the editor and paste the code from:
                  </p>
                  <code className="text-sm bg-gray-100 p-1 rounded">docs/google-apps-script-solution.js</code>
                </div>
                
                <h3 className="text-lg font-medium">Step 4: Save the Script</h3>
                <p>Click <strong>File → Save</strong> and give your project a name (e.g., "MLB Betting Recommendations").</p>
                
                <h3 className="text-lg font-medium">Step 5: Deploy as Web App</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Click <strong>Deploy → New deployment</strong></li>
                  <li>Select <strong>Web app</strong> for the deployment type</li>
                  <li>Set <strong>Who has access</strong> to "Anyone" or "Anyone with Google Account"</li>
                  <li>Click <strong>Deploy</strong> and authorize when prompted</li>
                  <li>Copy the web app URL provided after deployment</li>
                </ol>
                
                <h3 className="text-lg font-medium">Step 6: Configure the App</h3>
                <p>
                  Go to the <strong>Settings</strong> page in this app, navigate to the <strong>Direct Integration</strong> tab,
                  and paste the web app URL you copied.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mt-4">
                  <p className="text-blue-800 font-medium">Why this works</p>
                  <p className="text-sm text-blue-700 mt-1">
                    This integration uses Google Apps Script to create an API endpoint that can receive data from our app.
                    When you export recommendations, our app sends the data directly to your Google Sheet through this endpoint,
                    eliminating the need for manual copying and pasting.
                  </p>
                </div>
                
                <Button 
                  className="mt-4"
                  onClick={() => window.open("https://developers.google.com/apps-script/guides/web", "_blank")}
                >
                  Learn More About Google Apps Script
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
