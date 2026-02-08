import { Link, useLocation } from "wouter";
import { LayoutDashboard, TrendingUp, Users, Settings, PieChart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Financials', href: '/financials', icon: TrendingUp },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="hidden lg:flex h-screen w-64 flex-col fixed left-0 top-0 border-r border-border/40 bg-card z-30">
      <div className="p-6 flex items-center gap-2 border-b border-border/40">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <Activity className="w-5 h-5" />
        </div>
        <span className="font-display font-bold text-xl">Pulse</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/40">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
          <p className="text-xs font-semibold text-primary mb-1">Pro Plan</p>
          <p className="text-xs text-muted-foreground mb-3">Your team has full access.</p>
          <button className="w-full text-xs font-semibold bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90 transition-colors">
            Manage Plan
          </button>
        </div>
      </div>
    </div>
  );
}
