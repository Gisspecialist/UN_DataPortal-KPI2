import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { subMonths, format } from "date-fns";
import { z } from "zod";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get(api.dashboard.get.path, async (req, res) => {
    const kpis = await storage.getDashboardData();
    res.json({
      kpis,
      lastUpdated: new Date().toISOString()
    });
  });

  app.get(api.kpis.list.path, async (req, res) => {
    const kpis = await storage.getKpis();
    res.json(kpis);
  });

  app.get(api.kpis.get.path, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const kpi = await storage.getKpi(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }
    const history = await storage.getKpiEntries(id);
    res.json({ kpi, history });
  });

  app.post(api.kpis.addEntry.path, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const kpi = await storage.getKpi(id);
    if (!kpi) {
      return res.status(404).json({ message: "KPI not found" });
    }
    try {
      const input = api.kpis.addEntry.input.parse(req.body);
      const entry = await storage.createKpiEntry({ ...input, kpiId: id });
      res.status(201).json(entry);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/download-project", (req, res) => {
    try {
      const projectRoot = path.resolve(process.cwd());
      const zipPath = "/tmp/un-kpi-dashboard-project.zip";
      execSync(`cd "${projectRoot}" && zip -r "${zipPath}" . -x ".git/*" "node_modules/*" ".cache/*" ".local/*" ".config/*" "dist/*" ".upm/*" ".replit" "replit.nix" ".breakpoints" ".nix-channel"`);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", "attachment; filename=un-kpi-dashboard-project.zip");
      const fileStream = fs.createReadStream(zipPath);
      fileStream.pipe(res);
      fileStream.on("end", () => { try { fs.unlinkSync(zipPath); } catch {} });
    } catch (err) {
      res.status(500).json({ message: "Failed to create project zip" });
    }
  });

  app.get("/api/export-html", async (req, res) => {
    const kpis = await storage.getDashboardData();
    const data = { kpis, lastUpdated: new Date().toISOString() };

    const html = generateStandaloneHTML(data);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Content-Disposition", "attachment; filename=un-kpi-dashboard.html");
    res.send(html);
  });

  await seedDatabase();

  return httpServer;
}

function generateStandaloneHTML(data: any): string {
  const kpis = data.kpis;
  const lastUpdated = data.lastUpdated;

  function fmtVal(v: number, type: string) {
    if (type === 'currency') return '$' + (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v.toLocaleString());
    if (type === 'percentage') return v.toFixed(1) + '%';
    if (type === 'count') return v >= 1000 ? (v / 1000).toFixed(1) + 'K' : Math.round(v).toString();
    return v.toFixed(1);
  }

  const onTrack = kpis.filter((k: any) => {
    const isPos = k.changePercentage >= 0;
    return k.trendGoal === 'up' ? isPos : !isPos;
  }).length;
  const avgChange = kpis.length > 0 ? kpis.reduce((a: number, k: any) => a + k.changePercentage, 0) / kpis.length : 0;

  const categoryColors: Record<string, string> = {
    Financial: '#16A34A', Impact: '#7C3AED', Partnerships: '#0D9488',
    Operations: '#EA580C', Efficiency: '#D97706'
  };

  const kpiCards = kpis.map((k: any) => {
    const color = categoryColors[k.category] || '#009EDB';
    const isGood = k.trendGoal === 'up' ? k.changePercentage >= 0 : k.changePercentage <= 0;
    const arrow = k.changePercentage >= 0 ? '&#9650;' : '&#9660;';
    const changeColor = isGood ? '#16A34A' : '#DC2626';
    const history = k.history || [];
    const avg = history.length > 0 ? history.reduce((a: number, h: any) => a + h.value, 0) / history.length : 0;
    const max = history.length > 0 ? Math.max(...history.map((h: any) => h.value)) : 0;
    const min = history.length > 0 ? Math.min(...history.map((h: any) => h.value)) : 0;

    return `
      <div class="kpi-card" style="border-top: 4px solid ${color};">
        <div class="kpi-header">
          <span class="kpi-category" style="background: ${color}15; color: ${color};">${k.category}</span>
          <span class="kpi-trend" style="color: ${changeColor};">${arrow} ${Math.abs(k.changePercentage).toFixed(1)}%</span>
        </div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value" style="color: ${color};">${fmtVal(k.currentValue, k.type)}</div>
        <div class="kpi-stats-grid">
          <div class="kpi-stat"><span class="stat-label">Previous</span><span class="stat-val">${fmtVal(k.previousValue, k.type)}</span></div>
          <div class="kpi-stat"><span class="stat-label">Average</span><span class="stat-val">${fmtVal(avg, k.type)}</span></div>
          <div class="kpi-stat"><span class="stat-label">Max</span><span class="stat-val">${fmtVal(max, k.type)}</span></div>
          <div class="kpi-stat"><span class="stat-label">Min</span><span class="stat-val">${fmtVal(min, k.type)}</span></div>
          ${k.targetValue ? `<div class="kpi-stat"><span class="stat-label">Target</span><span class="stat-val">${fmtVal(k.targetValue, k.type)}</span></div>` : ''}
          <div class="kpi-stat"><span class="stat-label">Status</span><span class="stat-val" style="color: ${isGood ? '#16A34A' : '#DC2626'};">${isGood ? 'On Track' : 'Review'}</span></div>
        </div>
        <canvas id="chart-${k.key}" height="120"></canvas>
      </div>`;
  }).join('');

  const chartScripts = kpis.map((k: any) => {
    const color = categoryColors[k.category] || '#009EDB';
    const history = k.history || [];
    const labels = history.map((h: any) => {
      const d = new Date(h.date);
      return d.toLocaleDateString('en-US', { month: 'short' });
    });
    const values = history.map((h: any) => h.value);

    return `
      new Chart(document.getElementById('chart-${k.key}'), {
        type: 'line',
        data: {
          labels: ${JSON.stringify(labels)},
          datasets: [{
            data: ${JSON.stringify(values)},
            borderColor: '${color}',
            backgroundColor: '${color}22',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointBackgroundColor: '${color}',
            borderWidth: 2,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94A3B8' } },
            y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 10 }, color: '#94A3B8' } }
          }
        }
      });`;
  }).join('\n');

  const categories = Array.from(new Set(kpis.map((k: any) => k.category))) as string[];
  const catPieces = categories.map((cat: any) => {
    const count = kpis.filter((k: any) => k.category === cat).length;
    const color = categoryColors[cat] || '#009EDB';
    return `{ label: '${cat}', value: ${count}, color: '${color}' }`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UN Office for Partnerships - KPI Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #F8FAFC; color: #1E293B; }
  .header { background: linear-gradient(135deg, #009EDB 0%, #00598A 100%); color: white; padding: 32px 40px; }
  .header h1 { font-size: 28px; font-weight: 800; margin-bottom: 4px; }
  .header p { opacity: 0.85; font-size: 14px; }
  .header .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 8px; }
  .container { max-width: 1400px; margin: 0 auto; padding: 24px 40px; }
  .summary-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .summary-card { background: white; border-radius: 8px; padding: 20px; border: 1px solid #E2E8F0; }
  .summary-card .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #94A3B8; margin-bottom: 8px; }
  .summary-card .value { font-size: 28px; font-weight: 800; }
  .summary-card .sub { font-size: 11px; color: #94A3B8; margin-top: 4px; }
  .section-title { font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #0F172A; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px; margin-bottom: 32px; }
  .kpi-card { background: white; border-radius: 8px; padding: 20px; border: 1px solid #E2E8F0; }
  .kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .kpi-category { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 10px; border-radius: 12px; }
  .kpi-trend { font-size: 13px; font-weight: 700; }
  .kpi-label { font-size: 16px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
  .kpi-value { font-size: 32px; font-weight: 800; margin-bottom: 14px; }
  .kpi-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 6px; padding: 8px; text-align: center; }
  .stat-label { display: block; font-size: 9px; text-transform: uppercase; font-weight: 700; color: #94A3B8; letter-spacing: 0.5px; margin-bottom: 2px; }
  .stat-val { display: block; font-size: 13px; font-weight: 700; color: #334155; }
  .pie-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
  .pie-card { background: white; border-radius: 8px; padding: 24px; border: 1px solid #E2E8F0; }
  .pie-card h3 { font-size: 16px; font-weight: 700; margin-bottom: 16px; }
  .cat-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
  .cat-legend .item { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #64748B; }
  .cat-legend .dot { width: 10px; height: 10px; border-radius: 50%; }
  .footer { text-align: center; padding: 24px; color: #94A3B8; font-size: 12px; border-top: 1px solid #E2E8F0; margin-top: 24px; }
  @media (max-width: 768px) {
    .summary-row { grid-template-columns: repeat(2, 1fr); }
    .kpi-grid { grid-template-columns: 1fr; }
    .pie-section { grid-template-columns: 1fr; }
    .container { padding: 16px; }
    .header { padding: 24px 16px; }
  }
  @media print { body { background: white; } .header { break-after: avoid; } }
</style>
</head>
<body>
  <div class="header">
    <h1>UN Office for Partnerships</h1>
    <p>Key Performance Indicators Dashboard</p>
    <span class="badge">Generated: ${new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </div>

  <div class="container">
    <div class="summary-row">
      <div class="summary-card">
        <div class="label">Total Metrics</div>
        <div class="value">${kpis.length}</div>
        <div class="sub">${kpis.reduce((a: number, k: any) => a + (k.history?.length || 0), 0)} data points tracked</div>
      </div>
      <div class="summary-card">
        <div class="label">On Track</div>
        <div class="value" style="color: #16A34A;">${onTrack}<span style="font-size:16px;color:#94A3B8;">/${kpis.length}</span></div>
        <div class="sub">${((onTrack / kpis.length) * 100).toFixed(0)}% meeting targets</div>
      </div>
      <div class="summary-card">
        <div class="label">Avg Change</div>
        <div class="value" style="color: ${avgChange >= 0 ? '#16A34A' : '#DC2626'};">${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%</div>
        <div class="sub">Period over period</div>
      </div>
      <div class="summary-card">
        <div class="label">Needs Review</div>
        <div class="value">${kpis.length - onTrack}</div>
        <div class="sub">${kpis.length - onTrack === 0 ? 'All metrics healthy' : 'Require attention'}</div>
      </div>
    </div>

    <div class="pie-section">
      <div class="pie-card">
        <h3>KPI Distribution by Category</h3>
        <canvas id="pie-chart" height="220"></canvas>
        <div class="cat-legend">
          ${categories.map((cat: any) => `<div class="item"><div class="dot" style="background:${categoryColors[cat] || '#009EDB'}"></div>${cat} (${kpis.filter((k: any) => k.category === cat).length})</div>`).join('')}
        </div>
      </div>
      <div class="pie-card">
        <h3>Performance Summary</h3>
        <canvas id="bar-chart" height="220"></canvas>
      </div>
    </div>

    <h2 class="section-title">All KPI Metrics</h2>
    <div class="kpi-grid">
      ${kpiCards}
    </div>
  </div>

  <div class="footer">
    UN Office for Partnerships &mdash; KPI Dashboard &mdash; Generated ${new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>

  <script>
    const catData = [${catPieces.join(',')}];
    new Chart(document.getElementById('pie-chart'), {
      type: 'doughnut',
      data: {
        labels: catData.map(d => d.label),
        datasets: [{ data: catData.map(d => d.value), backgroundColor: catData.map(d => d.color), borderWidth: 0, hoverOffset: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '55%' }
    });

    const barKpis = ${JSON.stringify(kpis.map((k: any) => ({ label: k.label.length > 16 ? k.label.substring(0, 16) + '...' : k.label, change: k.changePercentage, color: categoryColors[k.category] || '#009EDB' })))};
    new Chart(document.getElementById('bar-chart'), {
      type: 'bar',
      data: {
        labels: barKpis.map(k => k.label),
        datasets: [{
          data: barKpis.map(k => k.change),
          backgroundColor: barKpis.map(k => k.change >= 0 ? '#16A34A88' : '#DC262688'),
          borderColor: barKpis.map(k => k.change >= 0 ? '#16A34A' : '#DC2626'),
          borderWidth: 1, borderRadius: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: '#F1F5F9' }, ticks: { callback: v => v + '%', font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });

    ${chartScripts}
  <\/script>
</body>
</html>`;
}

async function seedDatabase() {
  const kpis = await storage.getKpis();
  if (kpis.length === 0) {
    console.log("Seeding database with UN Office for Partnerships KPI data...");
    
    // 1. Resource Mobilization (Financial)
    const resourceMob = await storage.createKpi({
      key: "resource_mobilization",
      label: "Resource Mobilization",
      type: "currency",
      category: "Financial",
      description: "Total funds mobilized for SDG initiatives",
      trendGoal: "up"
    });

    // 2. Active Partnerships (Partnerships)
    const activePartnerships = await storage.createKpi({
      key: "partnerships_active",
      label: "Active Partnerships",
      type: "count",
      category: "Partnerships",
      description: "Number of active private-public partnerships",
      trendGoal: "up"
    });

    // 3. SDG Alignment Score (Impact)
    const sdgAlignment = await storage.createKpi({
      key: "sdg_alignment",
      label: "SDG Alignment Index",
      type: "percentage",
      category: "Impact",
      description: "Alignment of partnerships with the 17 SDGs",
      trendGoal: "up",
      targetValue: 100
    });

    // 4. Operational Cycle Time (Operations)
    const cycleTime = await storage.createKpi({
      key: "partnership_cycle_time",
      label: "Partnership Cycle Time",
      type: "number",
      category: "Operations",
      description: "Average days from inception to signature",
      trendGoal: "down",
      targetValue: 90
    });

    // 5. SDG Goal Progress (Example SDGs)
    const sdg17 = await storage.createKpi({
      key: "sdg_17_progress",
      label: "Goal 17: Partnerships",
      type: "percentage",
      category: "Impact",
      description: "Progress towards SDG 17 targets through active partnerships",
      trendGoal: "up",
      targetValue: 85
    });

    const sdg5 = await storage.createKpi({
      key: "sdg_5_progress",
      label: "Goal 5: Gender Equality",
      type: "percentage",
      category: "Impact",
      description: "Gender-responsive partnership initiatives",
      trendGoal: "up",
      targetValue: 70
    });

    // 6. Regional Distribution (Operations)
    const regionalDist = await storage.createKpi({
      key: "regional_impact",
      label: "Regional Impact Index",
      type: "number",
      category: "Operations",
      description: "Metric of partnership activity across all UN regions",
      trendGoal: "up",
      targetValue: 50
    });

    // 7. Resource Allocation Efficiency (Efficiency)
    const allocEfficiency = await storage.createKpi({
      key: "allocation_efficiency",
      label: "Allocation Efficiency",
      type: "percentage",
      category: "Efficiency",
      description: "Percentage of mobilized funds directly reaching project implementation",
      trendGoal: "up",
      targetValue: 95
    });

    // 8. Stakeholder Engagement (Partnerships)
    const stakeholderEng = await storage.createKpi({
      key: "stakeholder_engagement",
      label: "Stakeholder Engagement",
      type: "number",
      category: "Partnerships",
      description: "Active engagement score across private sector and NGOs",
      trendGoal: "up",
      targetValue: 5000
    });

    const today = new Date();
    
    // ... (rest of seeding)
    for (let i = 11; i >= 0; i--) {
      const date = format(subMonths(today, i), 'yyyy-MM-dd');
      await storage.createKpiEntry({ kpiId: sdg17.id, date, value: 60 + (11 - i) * 1.5 + (Math.random() * 2) });
      await storage.createKpiEntry({ kpiId: sdg5.id, date, value: 45 + (11 - i) * 1.2 + (Math.random() * 3) });
      await storage.createKpiEntry({ kpiId: regionalDist.id, date, value: 30 + (11 - i) * 1.1 + (Math.random() * 2) });
      await storage.createKpiEntry({ kpiId: allocEfficiency.id, date, value: 88 + (Math.random() * 4) });
      await storage.createKpiEntry({ kpiId: stakeholderEng.id, date, value: 3500 + (11 - i) * 120 + (Math.random() * 50) });
    }
    
    // Resource Mobilization: Large scale, steady growth
    let baseFunds = 120000000;
    for (let i = 11; i >= 0; i--) {
      const date = format(subMonths(today, i), 'yyyy-MM-dd');
      baseFunds = baseFunds * (1 + (Math.random() * 0.08 - 0.01)); 
      await storage.createKpiEntry({ kpiId: resourceMob.id, date, value: Math.round(baseFunds) });
    }

    // Active Partnerships: Growing count
    let basePartners = 450;
    for (let i = 11; i >= 0; i--) {
      const date = format(subMonths(today, i), 'yyyy-MM-dd');
      basePartners = basePartners + Math.floor(Math.random() * 15);
      await storage.createKpiEntry({ kpiId: activePartnerships.id, date, value: basePartners });
    }

    // SDG Alignment: High percentage
    for (let i = 11; i >= 0; i--) {
      const date = format(subMonths(today, i), 'yyyy-MM-dd');
      const value = 88 + (Math.random() * 7); 
      await storage.createKpiEntry({ kpiId: sdgAlignment.id, date, value: Number(value.toFixed(1)) });
    }

    // Cycle Time: Efficiency improvements
    let baseTime = 120;
    for (let i = 11; i >= 0; i--) {
      const date = format(subMonths(today, i), 'yyyy-MM-dd');
      baseTime = baseTime - (Math.random() * 2);
      await storage.createKpiEntry({ kpiId: cycleTime.id, date, value: Math.round(baseTime) });
    }

    console.log("UN Data seeded successfully!");
  }
}
