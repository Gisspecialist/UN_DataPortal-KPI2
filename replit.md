# Replit.md

## Overview

This is a **KPI Dashboard** application built for tracking and visualizing key performance indicators (originally themed around UN Office for Partnerships metrics). It's a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL for data storage. The dashboard displays KPI cards with sparkline charts, trend indicators, performance comparison charts, and detailed time-series views.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management / Data Fetching**: TanStack React Query for server state
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Charts**: Recharts (Area, Bar, Line charts) for data visualization
- **Fonts**: Inter (body) and Outfit (display) via Google Fonts
- **Build Tool**: Vite with React plugin

Path aliases:
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets` → `./attached_assets/`

### Backend (server/)
- **Framework**: Express 5 running on Node.js
- **Language**: TypeScript executed via tsx
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Database Connection**: node-postgres (pg) Pool using `DATABASE_URL` environment variable
- **Dev Server**: Vite dev server middleware integrated with Express for HMR
- **Production**: Static file serving from `dist/public/`

### Shared Code (shared/)
- **Schema** (`shared/schema.ts`): Drizzle table definitions and Zod validation schemas for `kpis` and `kpiEntries` tables
- **Routes** (`shared/routes.ts`): API route definitions with path constants and Zod response schemas, shared between client and server

### Database Schema
Two tables in PostgreSQL:
1. **kpis** - KPI metadata (key, label, type, category, description, trendGoal, targetValue)
2. **kpi_entries** - Time-series data points linked to KPIs (kpiId, date, value, createdAt)

The database is seeded automatically on first server start when no KPIs exist.

### API Endpoints
- `GET /api/dashboard` - Returns all KPIs with their history, current/previous values, and change percentages
- `GET /api/kpis` - Lists all KPI definitions
- `GET /api/kpis/:id` - Returns a specific KPI with its full history

### Build Process
- **Dev**: `npm run dev` runs tsx with Vite middleware for HMR
- **Build**: `npm run build` runs a custom script that builds the client with Vite and bundles the server with esbuild
- **Production**: `npm start` serves the built assets from `dist/`
- **DB Push**: `npm run db:push` uses drizzle-kit to push schema changes to the database

### Key Design Decisions
1. **Monorepo structure** with shared types between frontend and backend, avoiding type duplication
2. **Drizzle ORM** chosen for type-safe database queries with PostgreSQL, using `drizzle-zod` for automatic Zod schema generation from table definitions
3. **shadcn/ui components** are copied into the project (not installed as a package), allowing full customization
4. **No authentication** - this is currently a read-only dashboard without user accounts
5. **Database seeding** happens in the route registration, ensuring demo data exists on first run

## External Dependencies

- **PostgreSQL**: Required database, connected via `DATABASE_URL` environment variable. Must be provisioned before the app can start.
- **Google Fonts**: Inter, Outfit, DM Sans, Fira Code, Geist Mono, and Architects Daughter loaded via CDN
- **No other external APIs or services** are currently integrated (though the build script allowlists packages like Stripe, OpenAI, Google Generative AI for potential future use)