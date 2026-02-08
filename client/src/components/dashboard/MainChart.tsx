import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatValue } from "@/lib/formatters";
import { type KpiWithHistory } from "@shared/schema";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MainChartProps {
  kpis: KpiWithHistory[];
}

export function MainChart({ kpis }: MainChartProps) {
  // Default to the first KPI if available (typically Revenue)
  const [selectedKpiId, setSelectedKpiId] = useState<string>(kpis[0]?.id.toString());
  
  const selectedKpi = kpis.find(k => k.id.toString() === selectedKpiId);
  
  if (!selectedKpi) return null;

  const data = selectedKpi.history.map(entry => ({
    date: new Date(entry.date),
    value: entry.value
  }));

  return (
    <Card className="col-span-full lg:col-span-4 shadow-sm border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle className="text-xl font-display">Performance Trends</CardTitle>
          <CardDescription>Visualizing {selectedKpi.label.toLowerCase()} over time</CardDescription>
        </div>
        <Select value={selectedKpiId} onValueChange={setSelectedKpiId}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Metric" />
          </SelectTrigger>
          <SelectContent>
            {kpis.map(kpi => (
              <SelectItem key={kpi.id} value={kpi.id.toString()}>
                {kpi.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(date, "MMM d")}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                tickFormatter={(val) => formatValue(val, selectedKpi.type)}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: "0.5rem" }}
                formatter={(val: number) => [formatValue(val, selectedKpi.type), selectedKpi.label]}
                labelFormatter={(label) => format(label, "MMMM d, yyyy")}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
