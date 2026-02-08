import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type DashboardDataResponse, type KpiWithHistory } from "@shared/schema";

export function useDashboardData() {
  return useQuery({
    queryKey: [api.dashboard.get.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.get.path);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      // The API returns { kpis: KpiWithHistory[], lastUpdated: string }
      // We're casting here because the route definition uses 'any' for the complex composed type to avoid circularity issues in schema
      return (await res.json()) as DashboardDataResponse;
    },
  });
}

export function useKpiDetails(id: number) {
  return useQuery({
    queryKey: [api.kpis.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.kpis.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch KPI details");
      return (await res.json()) as { kpi: KpiWithHistory; history: any[] };
    },
    enabled: !!id,
  });
}
