import { pgTable, text, serial, integer, timestamp, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// KPI Definitions (metadata about the metric)
export const kpis = pgTable("kpis", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), 
  label: text("label").notNull(),      
  type: text("type").notNull(),        // 'currency', 'percentage', 'number', 'count'
  category: text("category").notNull(), // 'Impact', 'Operations', 'Partnerships', 'Financial'
  description: text("description"),
  trendGoal: text("trend_goal").default("up"), 
  targetValue: doublePrecision("target_value"), // Added target value for progress tracking
});

// Time-series data points for each KPI
export const kpiEntries = pgTable("kpi_entries", {
  id: serial("id").primaryKey(),
  kpiId: integer("kpi_id").notNull().references(() => kpis.id),
  date: date("date").notNull(),
  value: doublePrecision("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===

export const insertKpiSchema = createInsertSchema(kpis).omit({ id: true });
export const insertKpiEntrySchema = createInsertSchema(kpiEntries).omit({ id: true, createdAt: true });

// === EXPLICIT TYPES ===

export type Kpi = typeof kpis.$inferSelect;
export type InsertKpi = z.infer<typeof insertKpiSchema>;

export type KpiEntry = typeof kpiEntries.$inferSelect;
export type InsertKpiEntry = z.infer<typeof insertKpiEntrySchema>;

// Detailed response type including the history
export type KpiWithHistory = Kpi & {
  history: KpiEntry[];
  currentValue: number;
  previousValue: number;
  changePercentage: number;
};

export type DashboardDataResponse = {
  kpis: KpiWithHistory[];
  lastUpdated: string;
};
