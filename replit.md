# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

- `artifacts/occu-med-portal` — React/Vite Occu-Med master launch portal at `/`. Uses the uploaded galaxy artwork via the `@assets` alias, overlays permission-aware celestial hotspots, includes Supabase-ready authentication/admin management, portal URL config, and a startup audio hook.

## Occu-Med Portal Setup Notes

- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable live Supabase Auth.
- The portal expects a Supabase table named `portal_users` with `email`, `role`, and `permissions` fields. `role` should be `Admin` or `User`; `permissions` should store the portal permission keys from `src/lib/config.ts`.
- External portal destination URLs are configured in `artifacts/occu-med-portal/src/lib/config.ts`.
- Without Supabase environment variables, the portal runs in setup/preview mode so the visual experience and admin controls can still be reviewed locally.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
