import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatValue } from "@/lib/formatters";
import { type KpiWithHistory } from "@shared/schema";

interface ComparisonChartProps {
  kpis: KpiWithHistory[];
}

export function ComparisonChart({ kpis }: ComparisonChartProps) {
  // Filter for 'percentage' or 'number' type KPIs for better comparison
  // or just pick the first 3 for demo
  const compareData = kpis.slice(0, 4).map(kpi => ({
    name: kpi.label,
    value: kpi.currentValue,
    type: kpi.type
  }));

  return (
    <Card className="col-span-full lg:col-span-2 shadow-sm border-border/60">
      <CardHeader>
        <CardTitle className="text-xl font-display">Current Snapshot</CardTitle>
        <CardDescription>Quick comparison of key metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compareData} layout="vertical" margin={{ left: 0, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number, name: string, props: any) => {
                  const item = compareData.find(d => d.name === props.payload.name);
                  return [formatValue(value, item?.type || 'number'), "Current Value"];
                }}
              />
              <Bar 
                dataKey="value" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
