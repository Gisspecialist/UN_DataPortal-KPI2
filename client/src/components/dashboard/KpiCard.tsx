import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { formatValue } from "@/lib/formatters";
import { type KpiWithHistory } from "@shared/schema";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface KpiCardProps {
  kpi: KpiWithHistory;
  index: number;
}

export function KpiCard({ kpi, index }: KpiCardProps) {
  const isPositive = kpi.changePercentage >= 0;
  const isGood = kpi.trendGoal === 'down' ? !isPositive : isPositive;
  
  // Prepare data for the mini sparkline
  const chartData = kpi.history.slice(-10).map((h) => ({ value: h.value }));

  // Dynamic delay for animation stagger
  const animationDelay = `${index * 100}ms`;

  return (
    <Card 
      className="p-6 relative overflow-hidden group hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards"
      style={{ animationDelay }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
          <h3 className="text-2xl font-bold font-display mt-1 tracking-tight">
            {formatValue(kpi.currentValue, kpi.type)}
          </h3>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View Details</DropdownMenuItem>
            <DropdownMenuItem>Export Data</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-end justify-between h-12">
        <div className={cn(
          "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
          isGood 
            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400" 
            : "text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400"
        )}>
          {isGood ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          <span>{Math.abs(kpi.changePercentage).toFixed(1)}%</span>
        </div>

        <div className="w-24 h-full opacity-50 group-hover:opacity-100 transition-opacity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.2} className={isGood ? "text-emerald-500" : "text-rose-500"} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} className={isGood ? "text-emerald-500" : "text-rose-500"} />
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={isGood ? "#10b981" : "#e11d48"} 
                strokeWidth={2}
                fill={`url(#gradient-${kpi.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
