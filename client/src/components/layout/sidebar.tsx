import { useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Sparkles, FolderOpen, HelpCircle, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: "/", label: "Today's Schedule", icon: CalendarDays },
    { path: "/recommendations", label: "AI Recommendations", icon: Sparkles },
    { path: "/logs", label: "View Logs", icon: FolderOpen },
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "/help", label: "Help", icon: HelpCircle },
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
        <button 
          onClick={() => setCollapsed(!collapsed)} 
          className="text-neutral p-1 rounded-md hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
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
