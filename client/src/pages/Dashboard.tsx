import { useQuery, useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart } from "recharts";
import { Globe, Users, DollarSign, Activity, TrendingUp, TrendingDown, Clock, Target, Plus, Loader2, Handshake, BarChart3, ArrowUpRight, Zap, Award, Layers, Briefcase, MapPin, CheckCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertKpiEntrySchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const UN_COLORS = {
  blue: "#009EDB",
  darkBlue: "#00669E",
  gold: "#FDB714",
  green: "#4CAF50",
  teal: "#00897B",
  orange: "#E65100",
  amber: "#F59E0B",
  violet: "#7C3AED",
  rose: "#E11D48",
  cyan: "#0891B2",
  slate: "#455A64",
};

const CATEGORY_PALETTES: Record<string, { primary: string; secondary: string; accent: string; gradient: [string, string]; bg: string; bgLight: string }> = {
  overview: { primary: UN_COLORS.blue, secondary: UN_COLORS.gold, accent: UN_COLORS.teal, gradient: ["#009EDB", "#00669E"], bg: "bg-[#009EDB]", bgLight: "bg-[#009EDB]/10" },
  impact: { primary: UN_COLORS.violet, secondary: UN_COLORS.green, accent: UN_COLORS.blue, gradient: ["#7C3AED", "#4CAF50"], bg: "bg-[#7C3AED]", bgLight: "bg-[#7C3AED]/10" },
  financial: { primary: UN_COLORS.green, secondary: UN_COLORS.amber, accent: UN_COLORS.blue, gradient: ["#4CAF50", "#F59E0B"], bg: "bg-[#4CAF50]", bgLight: "bg-[#4CAF50]/10" },
  partnerships: { primary: UN_COLORS.teal, secondary: UN_COLORS.blue, accent: UN_COLORS.gold, gradient: ["#00897B", "#009EDB"], bg: "bg-[#00897B]", bgLight: "bg-[#00897B]/10" },
  operations: { primary: UN_COLORS.orange, secondary: UN_COLORS.cyan, accent: UN_COLORS.amber, gradient: ["#E65100", "#0891B2"], bg: "bg-[#E65100]", bgLight: "bg-[#E65100]/10" },
};

const KPI_COLORS: Record<string, string> = {
  resource_mobilization: UN_COLORS.green,
  partnerships_active: UN_COLORS.teal,
  sdg_alignment: UN_COLORS.violet,
  partnership_cycle_time: UN_COLORS.orange,
  sdg_17_progress: UN_COLORS.blue,
  sdg_5_progress: UN_COLORS.rose,
  regional_impact: UN_COLORS.cyan,
  allocation_efficiency: UN_COLORS.amber,
  stakeholder_engagement: UN_COLORS.darkBlue,
};

const formatValue = (value: number, type: string) => {
  if (type === "currency") {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
  }
  if (type === "percentage") return `${value.toFixed(1)}%`;
  if (type === "count") return new Intl.NumberFormat("en-US").format(Math.round(value));
  return new Intl.NumberFormat("en-US").format(value);
};

const getKpiIcon = (key: string) => {
  const iconMap: Record<string, any> = {
    resource_mobilization: DollarSign,
    partnerships_active: Handshake,
    sdg_alignment: Globe,
    partnership_cycle_time: Clock,
    sdg_17_progress: Users,
    sdg_5_progress: Target,
    regional_impact: MapPin,
    allocation_efficiency: Zap,
    stakeholder_engagement: ArrowUpRight,
  };
  return iconMap[key] || Activity;
};

const tooltipStyle = {
  borderRadius: '10px',
  border: 'none',
  boxShadow: '0 10px 40px -5px rgb(0 0 0 / 0.15)',
  padding: '10px 14px',
  fontSize: '12px',
  backgroundColor: '#fff',
};

const StatMini = ({ label, value, color, icon: IconComp }: { label: string; value: string; color: string; icon: any }) => (
  <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
    <div className="p-2 rounded-md shrink-0" style={{ backgroundColor: `${color}15` }}>
      <IconComp className="h-4 w-4" style={{ color }} />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 truncate">{label}</div>
      <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">{value}</div>
    </div>
  </div>
);

const KpiCard = ({ kpi, categoryColor }: { kpi: any; categoryColor?: string }) => {
  const isPositive = kpi.changePercentage >= 0;
  const isGood = kpi.trendGoal === "up" ? isPositive : !isPositive;
  const Icon = getKpiIcon(kpi.key);
  const kpiColor = KPI_COLORS[kpi.key] || categoryColor || UN_COLORS.blue;

  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(insertKpiEntrySchema),
    defaultValues: {
      value: kpi.currentValue,
      date: format(new Date(), 'yyyy-MM-dd')
    }
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", buildUrl(api.kpis.addEntry.path, { id: kpi.id }), values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.get.path] });
      toast({ title: "Metric Updated", description: `New value for ${kpi.label} has been recorded.` });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  });

  const progressPct = kpi.targetValue
    ? Math.min((kpi.currentValue / kpi.targetValue) * 100, 100)
    : 75;

  const avg = kpi.history.length > 0
    ? kpi.history.reduce((a: number, c: any) => a + c.value, 0) / kpi.history.length
    : 0;

  const minVal = kpi.history.length > 0 ? Math.min(...kpi.history.map((h: any) => h.value)) : 0;
  const maxVal = kpi.history.length > 0 ? Math.max(...kpi.history.map((h: any) => h.value)) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card
          data-testid={`card-kpi-${kpi.key}`}
          className="hover-elevate cursor-pointer transition-all relative group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-visible"
        >
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-md" style={{ backgroundColor: kpiColor }} />
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 pt-4">
            <CardTitle className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-tight">{kpi.label}</CardTitle>
            <div className="p-2 rounded-md transition-colors shrink-0" style={{ backgroundColor: `${kpiColor}15` }}>
              <Icon className="h-4 w-4" style={{ color: kpiColor }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5 tracking-tight">{formatValue(kpi.currentValue, kpi.type)}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isGood ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'}`}>
                {isPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {Math.abs(kpi.changePercentage).toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">vs prev</span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progressPct}%`, backgroundColor: kpiColor }} />
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-3xl" data-testid={`dialog-kpi-${kpi.key}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md" style={{ backgroundColor: `${kpiColor}15` }}>
              <Icon className="h-5 w-5" style={{ color: kpiColor }} />
            </div>
            {kpi.label}
          </DialogTitle>
          <DialogDescription>{kpi.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 mt-4">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={kpi.history}>
                <defs>
                  <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={kpiColor} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={kpiColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM d')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                  formatter={(value: number) => [formatValue(value, kpi.type), 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke={kpiColor} fill={`url(#gradient-${kpi.id})`} strokeWidth={3} dot={{ r: 4, fill: kpiColor }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Record New Entry</h4>
              <form onSubmit={form.handleSubmit((v) => mutation.mutate({ ...v, value: Number(v.value), kpiId: kpi.id }))} className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor={`value-${kpi.id}`}>New Value</Label>
                  <Input data-testid={`input-value-${kpi.key}`} id={`value-${kpi.id}`} type="number" step="0.01" {...form.register("value")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`date-${kpi.id}`}>Date</Label>
                  <Input data-testid={`input-date-${kpi.key}`} id={`date-${kpi.id}`} type="date" {...form.register("date")} />
                </div>
                <Button data-testid={`button-save-${kpi.key}`} type="submit" className="w-full" style={{ backgroundColor: kpiColor }} disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Save Entry
                </Button>
              </form>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700" style={{ backgroundColor: `${kpiColor}08` }}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Current</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{formatValue(kpi.currentValue, kpi.type)}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700" style={{ backgroundColor: `${UN_COLORS.amber}08` }}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Target</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{kpi.targetValue ? formatValue(kpi.targetValue, kpi.type) : 'N/A'}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700" style={{ backgroundColor: `${UN_COLORS.teal}08` }}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Average</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{formatValue(avg, kpi.type)}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700" style={{ backgroundColor: `${UN_COLORS.green}08` }}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Min</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{formatValue(minVal, kpi.type)}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700" style={{ backgroundColor: `${UN_COLORS.violet}08` }}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Max</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{formatValue(maxVal, kpi.type)}</div>
              </div>
              <div className={`p-3 rounded-md border ${isGood ? 'border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/20'}`}>
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Status</div>
                <div className={`text-base font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>{isGood ? 'On Track' : 'Review'}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SummaryBanner = ({ kpis, palette }: { kpis: any[]; palette: typeof CATEGORY_PALETTES["overview"] }) => {
  const totalKpis = kpis.length;
  const onTrack = kpis.filter(k => {
    const isPos = k.changePercentage >= 0;
    return k.trendGoal === "up" ? isPos : !isPos;
  }).length;
  const avgChange = kpis.length > 0 ? kpis.reduce((a: number, k: any) => a + k.changePercentage, 0) / kpis.length : 0;
  const totalDataPoints = kpis.reduce((a: number, k: any) => a + (k.history?.length || 0), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6" data-testid="grid-summary-stats">
      <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${palette.primary}15` }}>
            <Layers className="h-3.5 w-3.5" style={{ color: palette.primary }} />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Metrics</span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalKpis}</div>
        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{totalDataPoints} data points tracked</div>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/20">
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">On Track</span>
        </div>
        <div className="text-2xl font-extrabold text-green-600">{onTrack}<span className="text-base text-slate-400 font-bold">/{totalKpis}</span></div>
        <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalKpis > 0 ? (onTrack / totalKpis) * 100 : 0}%` }} />
        </div>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.amber}15` }}>
            <TrendingUp className="h-3.5 w-3.5" style={{ color: UN_COLORS.amber }} />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Avg Change</span>
        </div>
        <div className={`text-2xl font-extrabold ${avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>{avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}%</div>
        <div className="text-[10px] text-slate-400 font-medium mt-0.5">Period over period</div>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${palette.secondary}15` }}>
            <Award className="h-3.5 w-3.5" style={{ color: palette.secondary }} />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Needs Review</span>
        </div>
        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalKpis - onTrack}</div>
        <div className="text-[10px] text-slate-400 font-medium mt-0.5">{totalKpis - onTrack === 0 ? 'All metrics healthy' : 'Require attention'}</div>
      </div>
    </div>
  );
};

const OverviewCharts = ({ allKpis }: { allKpis: any[] }) => {
  const findKpi = (key: string) => allKpis.find((k: any) => k.key === key);
  const resMob = findKpi("resource_mobilization");
  const allocEff = findKpi("allocation_efficiency");
  const cycleTime = findKpi("partnership_cycle_time");
  const stakeEng = findKpi("stakeholder_engagement");
  const partnersActive = findKpi("partnerships_active");

  const pieData = allKpis
    .filter(k => k.category)
    .reduce((acc: any[], k: any) => {
      const cat = k.category;
      const found = acc.find((a: any) => a.name === cat);
      if (found) { found.value += 1; }
      else { acc.push({ name: cat, value: 1 }); }
      return acc;
    }, []);
  const PIE_COLORS = [UN_COLORS.blue, UN_COLORS.green, UN_COLORS.violet, UN_COLORS.orange, UN_COLORS.teal];

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-6">
        <StatMini label="Total Mobilized" value={resMob ? formatValue(resMob.currentValue, 'currency') : '--'} color={UN_COLORS.green} icon={DollarSign} />
        <StatMini label="Active Partners" value={partnersActive ? formatValue(partnersActive.currentValue, 'count') : '--'} color={UN_COLORS.teal} icon={Handshake} />
        <StatMini label="Alloc. Efficiency" value={allocEff ? formatValue(allocEff.currentValue, 'percentage') : '--'} color={UN_COLORS.amber} icon={Zap} />
        <StatMini label="Cycle Time" value={cycleTime ? `${Math.round(cycleTime.currentValue)} days` : '--'} color={UN_COLORS.orange} icon={Clock} />
        <StatMini label="Engagement" value={stakeEng ? formatValue(stakeEng.currentValue, 'count') : '--'} color={UN_COLORS.darkBlue} icon={ArrowUpRight} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-lg font-bold" data-testid="text-resource-chart-title">Resource Mobilization</CardTitle>
              <CardDescription>12-month funding trend (USD)</CardDescription>
            </div>
            <Button data-testid="button-export-overview" variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <DollarSign className="h-3.5 w-3.5" /> Export
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-green-100 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-green-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-green-700 dark:text-green-400">{resMob ? formatValue(resMob.currentValue, 'currency') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{resMob ? formatValue(resMob.history.reduce((a: number, h: any) => a + h.value, 0) / resMob.history.length, 'currency') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-sm font-extrabold ${resMob && resMob.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{resMob ? `${resMob.changePercentage >= 0 ? '+' : ''}${resMob.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resMob?.history || []}>
                  <defs>
                    <linearGradient id="colorFunds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UN_COLORS.green} stopOpacity={0.35}/>
                      <stop offset="95%" stopColor={UN_COLORS.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => format(new Date(l), 'MMMM yyyy')} formatter={(v: number) => [formatValue(v, 'currency'), 'Mobilized']} />
                  <Area type="monotone" dataKey="value" stroke={UN_COLORS.green} fillOpacity={1} fill="url(#colorFunds)" strokeWidth={3} dot={{r: 3, fill: '#fff', stroke: UN_COLORS.green, strokeWidth: 2}} activeDot={{r: 6}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">KPI Distribution</CardTitle>
            <CardDescription>Metrics by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-2">
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{allKpis.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total KPIs Tracked</div>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              {pieData.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] font-semibold text-slate-500">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Stakeholder Engagement</CardTitle>
            <CardDescription>Monthly engagement score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-blue-100 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-blue-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-blue-700 dark:text-blue-400">{stakeEng ? formatValue(stakeEng.currentValue, 'count') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{stakeEng ? formatValue(stakeEng.history.reduce((a: number, h: any) => a + h.value, 0) / stakeEng.history.length, 'count') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-sm font-extrabold ${stakeEng && stakeEng.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stakeEng ? `${stakeEng.changePercentage >= 0 ? '+' : ''}${stakeEng.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stakeEng?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => format(new Date(l), 'MMMM yyyy')} formatter={(v: number) => [v.toFixed(0), 'Score']} />
                  <Bar dataKey="value" fill={UN_COLORS.darkBlue} radius={[6, 6, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Allocation Efficiency</CardTitle>
            <CardDescription>Funds reaching project implementation (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-amber-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-amber-700 dark:text-amber-400">{allocEff ? `${allocEff.currentValue.toFixed(1)}%` : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Target</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{allocEff?.targetValue ? `${allocEff.targetValue}%` : '95%'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-sm font-extrabold ${allocEff && allocEff.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{allocEff ? `${allocEff.changePercentage >= 0 ? '+' : ''}${allocEff.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allocEff?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Efficiency']} />
                  <Line type="monotone" dataKey="value" stroke={UN_COLORS.amber} strokeWidth={3} dot={{r: 4, fill: UN_COLORS.amber}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Partnership Cycle Time</CardTitle>
            <CardDescription>Average days from inception to signature</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-orange-100 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-orange-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-orange-700 dark:text-orange-400">{cycleTime ? `${Math.round(cycleTime.currentValue)}d` : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{cycleTime ? `${Math.round(cycleTime.history.reduce((a: number, h: any) => a + h.value, 0) / cycleTime.history.length)}d` : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-sm font-extrabold ${cycleTime && cycleTime.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{cycleTime ? `${cycleTime.changePercentage >= 0 ? '+' : ''}${cycleTime.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cycleTime?.history || []}>
                  <defs>
                    <linearGradient id="colorCycle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UN_COLORS.orange} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={UN_COLORS.orange} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} days`, 'Cycle Time']} />
                  <Area type="monotone" dataKey="value" stroke={UN_COLORS.orange} fill="url(#colorCycle)" strokeWidth={3} dot={{r: 3, fill: UN_COLORS.orange}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Active Partnerships Growth</CardTitle>
            <CardDescription>Cumulative partnership count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-teal-100 dark:border-teal-800/30 bg-teal-50/50 dark:bg-teal-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-teal-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-teal-700 dark:text-teal-400">{partnersActive ? formatValue(partnersActive.currentValue, 'count') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Start</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{partnersActive && partnersActive.history.length > 0 ? formatValue(partnersActive.history[0].value, 'count') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-green-100 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-green-600/70 tracking-wider">Growth</div>
                <div className="text-sm font-extrabold text-green-700 dark:text-green-400">{partnersActive ? `${partnersActive.changePercentage >= 0 ? '+' : ''}${partnersActive.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnersActive?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => format(new Date(l), 'MMMM yyyy')} formatter={(v: number) => [v, 'Partners']} />
                  <Bar dataKey="value" fill={UN_COLORS.teal} radius={[6, 6, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <SdgImpactSection kpis={allKpis} />
    </>
  );
};

const ImpactCharts = ({ kpis }: { kpis: any[] }) => {
  const sdgKpis = kpis.filter(k => k.category === "Impact");
  const palette = CATEGORY_PALETTES.impact;
  const impactColors = [UN_COLORS.violet, UN_COLORS.blue, UN_COLORS.rose];

  if (sdgKpis.length === 0) return null;

  const avgProgress = sdgKpis.reduce((a, k) => a + (k.targetValue ? (k.currentValue / k.targetValue) * 100 : 0), 0) / sdgKpis.length;
  const bestPerformer = sdgKpis.reduce((best, k) => {
    const progress = k.targetValue ? (k.currentValue / k.targetValue) * 100 : 0;
    return progress > (best.targetValue ? (best.currentValue / best.targetValue) * 100 : 0) ? k : best;
  }, sdgKpis[0]);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatMini label="SDG Metrics" value={`${sdgKpis.length} Active`} color={palette.primary} icon={Globe} />
        <StatMini label="Avg Progress" value={`${avgProgress.toFixed(0)}%`} color={palette.secondary} icon={Target} />
        <StatMini label="Best Performer" value={bestPerformer?.label || '--'} color={palette.accent} icon={Award} />
        <StatMini label="Data Points" value={`${sdgKpis.reduce((a: number, k: any) => a + (k.history?.length || 0), 0)}`} color={UN_COLORS.cyan} icon={BarChart3} />
      </div>

      <SdgImpactSection kpis={kpis} />

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        {sdgKpis.map((kpi, idx) => (
          <Card key={kpi.id} className="bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md" style={{ backgroundColor: `${impactColors[idx % impactColors.length]}15` }}>
                  <Globe className="h-4 w-4" style={{ color: impactColors[idx % impactColors.length] }} />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">{kpi.label}</CardTitle>
                  <CardDescription>{kpi.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 text-center" style={{ backgroundColor: `${impactColors[idx % impactColors.length]}08` }}>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Current</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-white">{formatValue(kpi.currentValue, kpi.type)}</div>
                </div>
                <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Target</div>
                  <div className="text-sm font-extrabold text-slate-800 dark:text-white">{kpi.targetValue ? formatValue(kpi.targetValue, kpi.type) : 'N/A'}</div>
                </div>
                <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 text-center bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Change</div>
                  <div className={`text-sm font-extrabold ${kpi.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{kpi.changePercentage >= 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={kpi.history}>
                    <defs>
                      <linearGradient id={`grad-impact-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={impactColors[idx % impactColors.length]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={impactColors[idx % impactColors.length]} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                    <YAxis tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, kpi.label]} />
                    <Area type="monotone" dataKey="value" stroke={impactColors[idx % impactColors.length]} fill={`url(#grad-impact-${kpi.id})`} strokeWidth={3} dot={{r: 3, fill: impactColors[idx % impactColors.length]}} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};

const FinancialCharts = ({ allKpis }: { allKpis: any[] }) => {
  const findKpi = (key: string) => allKpis.find((k: any) => k.key === key);
  const resMob = findKpi("resource_mobilization");
  const allocEff = findKpi("allocation_efficiency");

  const resMobHistory = resMob?.history || [];
  const totalMobilized = resMobHistory.reduce((a: number, h: any) => a + h.value, 0);
  const avgMonthly = resMobHistory.length > 0 ? totalMobilized / resMobHistory.length : 0;
  const peakMonth = resMobHistory.length > 0 ? resMobHistory.reduce((p: any, c: any) => c.value > p.value ? c : p, resMobHistory[0]) : null;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatMini label="Total Mobilized" value={formatValue(totalMobilized, 'currency')} color={UN_COLORS.green} icon={DollarSign} />
        <StatMini label="Monthly Average" value={formatValue(avgMonthly, 'currency')} color={UN_COLORS.blue} icon={Activity} />
        <StatMini label="Peak Month" value={peakMonth ? format(new Date(peakMonth.date), 'MMM yyyy') : '--'} color={UN_COLORS.gold} icon={Award} />
        <StatMini label="Current Efficiency" value={allocEff ? `${allocEff.currentValue.toFixed(1)}%` : '--'} color={UN_COLORS.amber} icon={Zap} />
      </div>

      <div className="grid gap-6">
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-900/20">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Resource Mobilization - Detailed View</CardTitle>
                <CardDescription>Total funds mobilized for SDG initiatives over 12 months</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-md border border-green-100 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-green-600/70 tracking-wider">Current</div>
                <div className="text-lg font-extrabold text-green-700 dark:text-green-400">{resMob ? formatValue(resMob.currentValue, 'currency') : '--'}</div>
              </div>
              <div className="p-3 rounded-md border border-blue-100 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-blue-600/70 tracking-wider">Avg Monthly</div>
                <div className="text-lg font-extrabold text-blue-700 dark:text-blue-400">{formatValue(avgMonthly, 'currency')}</div>
              </div>
              <div className="p-3 rounded-md border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-amber-600/70 tracking-wider">Peak Value</div>
                <div className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{peakMonth ? formatValue(peakMonth.value, 'currency') : '--'}</div>
              </div>
            </div>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={resMobHistory}>
                  <defs>
                    <linearGradient id="colorFundsDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UN_COLORS.green} stopOpacity={0.4}/>
                      <stop offset="95%" stopColor={UN_COLORS.green} stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM yyyy')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis tickFormatter={(val) => `$${(val / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => format(new Date(l), 'MMMM d, yyyy')} formatter={(v: number) => [formatValue(v, 'currency'), 'Mobilized']} />
                  <Bar dataKey="value" fill={`${UN_COLORS.green}30`} radius={[4, 4, 0, 0]} barSize={28} />
                  <Line type="monotone" dataKey="value" stroke={UN_COLORS.green} strokeWidth={3} dot={{r: 4, fill: '#fff', stroke: UN_COLORS.green, strokeWidth: 2}} activeDot={{r: 7}} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.amber}15` }}>
                <Zap className="h-4 w-4" style={{ color: UN_COLORS.amber }} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Allocation Efficiency Tracking</CardTitle>
                <CardDescription>Percentage of mobilized funds reaching project implementation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-md border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-amber-600/70 tracking-wider">Current</div>
                <div className="text-lg font-extrabold text-amber-700 dark:text-amber-400">{allocEff ? `${allocEff.currentValue.toFixed(1)}%` : '--'}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Target</div>
                <div className="text-lg font-extrabold text-slate-800 dark:text-white">{allocEff?.targetValue ? `${allocEff.targetValue}%` : '95%'}</div>
              </div>
              <div className="p-3 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-lg font-extrabold ${allocEff && allocEff.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{allocEff ? `${allocEff.changePercentage >= 0 ? '+' : ''}${allocEff.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allocEff?.history || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis domain={[80, 100]} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Efficiency']} />
                  <Bar dataKey="value" fill={UN_COLORS.amber} radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

const PartnershipCharts = ({ allKpis }: { allKpis: any[] }) => {
  const findKpi = (key: string) => allKpis.find((k: any) => k.key === key);
  const partners = findKpi("partnerships_active");
  const stakeEng = findKpi("stakeholder_engagement");

  const partnersHistory = partners?.history || [];
  const engHistory = stakeEng?.history || [];
  const growthRate = partnersHistory.length >= 2 ? ((partnersHistory[partnersHistory.length - 1].value - partnersHistory[0].value) / partnersHistory[0].value * 100) : 0;
  const avgEngagement = engHistory.length > 0 ? engHistory.reduce((a: number, h: any) => a + h.value, 0) / engHistory.length : 0;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatMini label="Active Partners" value={partners ? formatValue(partners.currentValue, 'count') : '--'} color={UN_COLORS.teal} icon={Handshake} />
        <StatMini label="Growth Rate" value={`${growthRate.toFixed(1)}%`} color={UN_COLORS.green} icon={TrendingUp} />
        <StatMini label="Engagement Score" value={stakeEng ? stakeEng.currentValue.toFixed(0) : '--'} color={UN_COLORS.darkBlue} icon={ArrowUpRight} />
        <StatMini label="Avg Engagement" value={avgEngagement.toFixed(0)} color={UN_COLORS.violet} icon={Users} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.teal}15` }}>
                <Handshake className="h-4 w-4" style={{ color: UN_COLORS.teal }} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Active Partnerships Growth</CardTitle>
                <CardDescription>Cumulative count of active partnerships</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-teal-100 dark:border-teal-800/30 bg-teal-50/50 dark:bg-teal-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-teal-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-teal-700 dark:text-teal-400">{partners ? formatValue(partners.currentValue, 'count') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Start</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{partnersHistory.length > 0 ? formatValue(partnersHistory[0].value, 'count') : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-green-100 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-green-600/70 tracking-wider">Growth</div>
                <div className="text-sm font-extrabold text-green-700 dark:text-green-400">+{growthRate.toFixed(1)}%</div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnersHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => format(new Date(l), 'MMMM yyyy')} formatter={(v: number) => [v, 'Partners']} />
                  <Bar dataKey="value" fill={UN_COLORS.teal} radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.darkBlue}15` }}>
                <ArrowUpRight className="h-4 w-4" style={{ color: UN_COLORS.darkBlue }} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Stakeholder Engagement Trend</CardTitle>
                <CardDescription>Engagement score across private sector and NGOs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-blue-100 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-blue-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-blue-700 dark:text-blue-400">{stakeEng ? stakeEng.currentValue.toFixed(0) : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{avgEngagement.toFixed(0)}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-sm font-extrabold ${stakeEng && stakeEng.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{stakeEng ? `${stakeEng.changePercentage >= 0 ? '+' : ''}${stakeEng.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => format(new Date(l), 'MMMM yyyy')} formatter={(v: number) => [v.toFixed(0), 'Score']} />
                  <Line type="monotone" dataKey="value" stroke={UN_COLORS.darkBlue} strokeWidth={3} dot={{r: 4, fill: UN_COLORS.darkBlue}} activeDot={{r: 7}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

const EfficiencyCharts = ({ allKpis }: { allKpis: any[] }) => {
  const findKpi = (key: string) => allKpis.find((k: any) => k.key === key);
  const cycleTime = findKpi("partnership_cycle_time");
  const regional = findKpi("regional_impact");

  const cycleHistory = cycleTime?.history || [];
  const regionHistory = regional?.history || [];
  const avgCycle = cycleHistory.length > 0 ? cycleHistory.reduce((a: number, h: any) => a + h.value, 0) / cycleHistory.length : 0;
  const bestCycle = cycleHistory.length > 0 ? Math.min(...cycleHistory.map((h: any) => h.value)) : 0;
  const avgRegional = regionHistory.length > 0 ? regionHistory.reduce((a: number, h: any) => a + h.value, 0) / regionHistory.length : 0;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatMini label="Current Cycle" value={cycleTime ? `${Math.round(cycleTime.currentValue)} days` : '--'} color={UN_COLORS.orange} icon={Clock} />
        <StatMini label="Best Cycle" value={`${Math.round(bestCycle)} days`} color={UN_COLORS.green} icon={Zap} />
        <StatMini label="Avg Cycle" value={`${Math.round(avgCycle)} days`} color={UN_COLORS.amber} icon={Activity} />
        <StatMini label="Regional Index" value={regional ? regional.currentValue.toFixed(1) : '--'} color={UN_COLORS.cyan} icon={MapPin} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.orange}15` }}>
                <Clock className="h-4 w-4" style={{ color: UN_COLORS.orange }} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Partnership Cycle Time</CardTitle>
                <CardDescription>Days from inception to signature (target: 90 days)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-orange-100 dark:border-orange-800/30 bg-orange-50/50 dark:bg-orange-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-orange-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-orange-700 dark:text-orange-400">{cycleTime ? `${Math.round(cycleTime.currentValue)}d` : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-green-100 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-green-600/70 tracking-wider">Best</div>
                <div className="text-sm font-extrabold text-green-700 dark:text-green-400">{Math.round(bestCycle)}d</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{Math.round(avgCycle)}d</div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cycleHistory}>
                  <defs>
                    <linearGradient id="colorCycleEff" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={UN_COLORS.orange} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={UN_COLORS.orange} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} days`, 'Cycle Time']} />
                  <Area type="monotone" dataKey="value" stroke={UN_COLORS.orange} fill="url(#colorCycleEff)" strokeWidth={3} dot={{r: 4, fill: UN_COLORS.orange}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.cyan}15` }}>
                <MapPin className="h-4 w-4" style={{ color: UN_COLORS.cyan }} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">Regional Impact Index</CardTitle>
                <CardDescription>Activity metric across UN regional groups</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-2.5 rounded-md border border-cyan-100 dark:border-cyan-800/30 bg-cyan-50/50 dark:bg-cyan-900/10 text-center">
                <div className="text-[9px] uppercase font-bold text-cyan-600/70 tracking-wider">Current</div>
                <div className="text-sm font-extrabold text-cyan-700 dark:text-cyan-400">{regional ? regional.currentValue.toFixed(1) : '--'}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Average</div>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white">{avgRegional.toFixed(1)}</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 text-center">
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Change</div>
                <div className={`text-sm font-extrabold ${regional && regional.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{regional ? `${regional.changePercentage >= 0 ? '+' : ''}${regional.changePercentage.toFixed(1)}%` : '--'}</div>
              </div>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tickFormatter={(str) => format(new Date(str), 'MMM')} axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dx={-5} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v.toFixed(1), 'Index']} />
                  <Bar dataKey="value" fill={UN_COLORS.cyan} radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

const SdgImpactSection = ({ kpis }: { kpis: any[] }) => {
  const sdgKpis = kpis.filter(k => k.category === "Impact");
  if (sdgKpis.length === 0) return null;

  const sdgColors = [UN_COLORS.violet, UN_COLORS.blue, UN_COLORS.rose];

  return (
    <Card className="bg-white dark:bg-slate-900 shadow-sm" data-testid="card-sdg-progress">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <div className="p-1.5 rounded-md" style={{ backgroundColor: `${UN_COLORS.violet}15` }}>
            <Globe className="h-5 w-5" style={{ color: UN_COLORS.violet }} />
          </div>
          SDG Impact Progress
        </CardTitle>
        <CardDescription>Tracking alignment and progress against core Sustainable Development Goals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-3">
          {sdgKpis.map((kpi, idx) => {
            const progress = kpi.targetValue ? (kpi.currentValue / kpi.targetValue) * 100 : 0;
            const color = sdgColors[idx % sdgColors.length];
            return (
              <div key={kpi.id} className="space-y-3 p-4 rounded-md border border-slate-100 dark:border-slate-700" style={{ backgroundColor: `${color}06` }}>
                <div className="flex justify-between text-sm items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{kpi.label}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${color}15`, color }}>
                    {Math.round(progress)}% of Target
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: color }} />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold gap-2">
                  <span>Current: {formatValue(kpi.currentValue, kpi.type)}</span>
                  <span>Target: {kpi.targetValue ? formatValue(kpi.targetValue, kpi.type) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {kpi.changePercentage >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-[10px] font-bold ${kpi.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.changePercentage >= 0 ? '+' : ''}{kpi.changePercentage.toFixed(1)}% change
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const navItems = [
  { title: "Overview", icon: Activity, href: "/", color: UN_COLORS.blue },
  { title: "Impact", icon: Globe, href: "/impact", color: UN_COLORS.violet },
  { title: "Financials", icon: DollarSign, href: "/financials", color: UN_COLORS.green },
  { title: "Partnerships", icon: Handshake, href: "/partnerships", color: UN_COLORS.teal },
  { title: "Efficiency", icon: Clock, href: "/efficiency", color: UN_COLORS.orange },
];

const categoryConfig: Record<string, { title: string; description: string; filter?: string; palette: string }> = {
  "/": { title: "Impact Overview", description: "Central monitoring system for global strategic objectives and sustainable impact.", palette: "overview" },
  "/impact": { title: "SDG Impact Dashboard", description: "Sustainable Development Goals alignment and impact metrics.", filter: "Impact", palette: "impact" },
  "/financials": { title: "Financial Analytics", description: "Resource mobilization and funding efficiency metrics.", filter: "Financial", palette: "financial" },
  "/partnerships": { title: "Partnership Network", description: "Private and public sector engagement tracking.", filter: "Partnerships", palette: "partnerships" },
  "/efficiency": { title: "Operational Efficiency", description: "Cycle times and internal process optimization.", filter: "Operations", palette: "operations" },
};

export default function Dashboard() {
  const [location] = useLocation();
  const { data, isLoading } = useQuery<any>({ queryKey: [api.dashboard.get.path] });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[360px] w-full" />
          <Skeleton className="h-[360px] w-full" />
        </div>
      </div>
    );
  }

  const allKpis = data?.kpis || [];
  const config = categoryConfig[location] || categoryConfig["/"];
  const kpis = config.filter ? allKpis.filter((k: any) => k.category === config.filter) : allKpis;
  const palette = CATEGORY_PALETTES[config.palette] || CATEGORY_PALETTES.overview;
  const activeNav = navItems.find(n => n.href === location);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950">
        <Sidebar className="border-r border-slate-200 dark:border-slate-800">
          <SidebarContent>
            <SidebarGroup>
              <div className="px-4 py-6 flex flex-col items-center border-b border-slate-100 dark:border-slate-800 mb-2">
                <div className="w-11 h-11 bg-[#009EDB] rounded-md flex items-center justify-center mb-2.5 shadow-lg shadow-[#009EDB]/20">
                  <Globe className="text-white h-6 w-6" />
                </div>
                <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center leading-tight" data-testid="text-sidebar-title">UN Office for Partnerships</h1>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mt-1 font-semibold">KPI Dashboard</p>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <Link href={item.href}>
                        <SidebarMenuButton
                          data-testid={`button-nav-${item.title.toLowerCase()}`}
                          className={location === item.href ? "font-bold" : "text-slate-600 dark:text-slate-400"}
                          style={location === item.href ? { backgroundColor: `${item.color}15`, color: item.color } : undefined}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest mb-1" style={{ color: activeNav?.color || UN_COLORS.blue }}>
                  <Target className="h-3.5 w-3.5" />
                  Performance Analytics
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" data-testid="text-page-title">{config.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-base">{config.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button data-testid="button-download-project" variant="default" size="sm" className="gap-1.5" onClick={() => {
                    const a = document.createElement('a');
                    a.href = '/api/download-project';
                    a.download = 'un-kpi-dashboard-project.zip';
                    a.click();
                  }}>
                    <Download className="h-3.5 w-3.5" /> Download Project
                  </Button>
                  <Button data-testid="button-download-html" variant="outline" size="sm" className="gap-1.5" onClick={() => {
                    const a = document.createElement('a');
                    a.href = '/api/export-html';
                    a.download = 'un-kpi-dashboard.html';
                    a.click();
                  }}>
                    <Download className="h-3.5 w-3.5" /> Download HTML
                  </Button>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md shadow-sm flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Live</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {data?.lastUpdated ? format(new Date(data.lastUpdated), 'MMM d, h:mm a') : ''}
                </span>
              </div>
            </header>

            <SummaryBanner kpis={kpis} palette={palette} />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8" data-testid="grid-kpi-cards">
              {kpis.map((kpi: any) => (
                <KpiCard key={kpi.id} kpi={kpi} categoryColor={palette.primary} />
              ))}
            </div>

            {location === "/" && <OverviewCharts allKpis={allKpis} />}
            {location === "/impact" && <ImpactCharts kpis={allKpis} />}
            {location === "/financials" && <FinancialCharts allKpis={allKpis} />}
            {location === "/partnerships" && <PartnershipCharts allKpis={allKpis} />}
            {location === "/efficiency" && <EfficiencyCharts allKpis={allKpis} />}

            <footer className="mt-10 py-6 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-[#009EDB]/10 p-1.5 rounded-md">
                  <Globe className="h-3.5 w-3.5 text-[#009EDB]" />
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  2026 United Nations Office for Partnerships -- Simulation Data
                </span>
              </div>
              <div className="flex gap-4">
                <span className="text-[11px] font-semibold text-slate-400">Privacy Policy</span>
                <span className="text-[11px] font-semibold text-slate-400">Terms of Use</span>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
