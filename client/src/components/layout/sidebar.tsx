import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Sparkles, FolderOpen, Settings, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mutation to refresh data (games and recommendations)
  const refreshMutation = useMutation({
    mutationFn: async () => {
      setIsRefreshing(true);
      return await apiRequest({
        url: "/api/scheduler/trigger",
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: "Data Refresh",
        description: "Game data and recommendations refresh has been triggered.",
      });
      setTimeout(() => setIsRefreshing(false), 1000); // Visual feedback even if it's quick
    },
    onError: (error) => {
      toast({
        title: "Refresh Error",
        description: error.message || "Failed to refresh data.",
        variant: "destructive",
      });
      setIsRefreshing(false);
    },
  });

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  const navItems = [
    { path: "/", label: "Today's Schedule", icon: CalendarDays },
    { path: "/recommendations", label: "AI Recommendations", icon: Sparkles },
    { path: "/logs", label: "View Logs", icon: FolderOpen },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside 
      className={cn(
        "bg-white shadow-md transition-all duration-300 ease-in-out z-10",
        collapsed 
          ? "w-16 md:w-16" 
          : "w-64 md:w-64"
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className={cn(
          "text-xl font-semibold text-neutral transition-opacity",
          collapsed ? "opacity-0 w-0" : "opacity-100"
        )}>
          MLB Bets
        </h1>
        <div className="flex items-center">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "text-neutral p-2 rounded-md hover:bg-gray-100 mr-1",
              isRefreshing ? "opacity-50 cursor-not-allowed" : ""
            )}
            title="Refresh all data"
          >
            <RefreshCw 
              size={20} 
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="text-neutral p-1 rounded-md hover:bg-gray-100"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </div>
      
      <nav className="p-2">
        {navItems.map((item) => (
          <Link 
            key={item.path} 
            href={item.path}
            className={cn(
              "flex items-center p-3 mb-1 rounded-md cursor-pointer",
              location === item.path 
                ? "bg-blue-100 text-primary" 
                : "text-neutral hover:bg-blue-50"
            )}
          >
            <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
            <span className={cn(
              "transition-opacity whitespace-nowrap",
              collapsed ? "opacity-0 w-0 hidden" : "opacity-100"
            )}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
