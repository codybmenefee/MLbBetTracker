import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-neutral">Help & Instructions</h2>
          <p className="text-gray-600">Learn how to use the MLB betting recommendations app</p>
        </div>
      </div>
      
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
    </div>
  );
}
