import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Sidebar from "@/components/layout/sidebar";
import SchedulePage from "@/pages/schedule-page";
import RecommendationsPage from "@/pages/recommendations-page";
import LogsPage from "@/pages/logs-page";
import SettingsPage from "@/pages/settings-page";
import BankrollPage from "@/pages/bankroll-page";

function Router() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6">
        <Switch>
          <Route path="/" component={SchedulePage} />
          <Route path="/recommendations" component={RecommendationsPage} />
          <Route path="/bankroll" component={BankrollPage} />
          <Route path="/logs" component={LogsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
