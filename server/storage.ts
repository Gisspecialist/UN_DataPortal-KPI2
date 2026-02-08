import { db } from "./db";
import { kpis, kpiEntries, type Kpi, type KpiEntry, type InsertKpi, type InsertKpiEntry, type KpiWithHistory } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";

export interface IStorage {
  getKpis(): Promise<Kpi[]>;
  getKpi(id: number): Promise<Kpi | undefined>;
  getKpiEntries(kpiId: number): Promise<KpiEntry[]>;
  createKpi(kpi: InsertKpi): Promise<Kpi>;
  createKpiEntry(entry: InsertKpiEntry): Promise<KpiEntry>;
  getDashboardData(): Promise<KpiWithHistory[]>;
}

export class DatabaseStorage implements IStorage {
  async getKpis(): Promise<Kpi[]> {
    return await db.select().from(kpis).orderBy(kpis.id);
  }

  async getKpi(id: number): Promise<Kpi | undefined> {
    const [kpi] = await db.select().from(kpis).where(eq(kpis.id, id));
    return kpi;
  }

  async getKpiEntries(kpiId: number): Promise<KpiEntry[]> {
    return await db.select()
      .from(kpiEntries)
      .where(eq(kpiEntries.kpiId, kpiId))
      .orderBy(asc(kpiEntries.date));
  }

  async createKpi(kpi: InsertKpi): Promise<Kpi> {
    const [newKpi] = await db.insert(kpis).values(kpi).returning();
    return newKpi;
  }

  async createKpiEntry(entry: InsertKpiEntry): Promise<KpiEntry> {
    const [newEntry] = await db.insert(kpiEntries).values(entry).returning();
    return newEntry;
  }

  async getDashboardData(): Promise<KpiWithHistory[]> {
    const allKpis = await this.getKpis();
    const results: KpiWithHistory[] = [];

    for (const kpi of allKpis) {
      const history = await this.getKpiEntries(kpi.id);
      
      let currentValue = 0;
      let previousValue = 0;
      let changePercentage = 0;

      if (history.length > 0) {
        currentValue = history[history.length - 1].value;
        if (history.length > 1) {
          previousValue = history[history.length - 2].value;
          if (previousValue !== 0) {
            changePercentage = ((currentValue - previousValue) / previousValue) * 100;
          }
        }
      }

      results.push({
        ...kpi,
        history,
        currentValue,
        previousValue,
        changePercentage
      });
    }

    return results;
  }
}

export const storage = new DatabaseStorage();
