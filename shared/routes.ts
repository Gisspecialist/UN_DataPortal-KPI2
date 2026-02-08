import { z } from 'zod';
import { insertKpiSchema, insertKpiEntrySchema, kpis, kpiEntries } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  dashboard: {
    get: {
      method: 'GET' as const,
      path: '/api/dashboard',
      responses: {
        200: z.object({
          kpis: z.array(z.custom<any>()), // Using any for the complex composed type KpiWithHistory to avoid schema recursion complexity here
          lastUpdated: z.string()
        }),
      },
    },
  },
  kpis: {
    list: {
      method: 'GET' as const,
      path: '/api/kpis',
      responses: {
        200: z.array(z.custom<typeof kpis.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/kpis/:id',
      responses: {
        200: z.object({
          kpi: z.custom<typeof kpis.$inferSelect>(),
          history: z.array(z.custom<typeof kpiEntries.$inferSelect>())
        }),
        404: errorSchemas.notFound,
      },
    },
    addEntry: {
      method: 'POST' as const,
      path: '/api/kpis/:id/entries',
      input: insertKpiEntrySchema,
      responses: {
        201: z.custom<typeof kpiEntries.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
