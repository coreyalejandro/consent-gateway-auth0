# consent-gateway-auth0 — OpenMemory guide

## Overview

- Next.js 14 App Router; Auth0 Next.js SDK v4 via `lib/auth0.ts` and root `middleware.ts` (routes under `/auth/*`).
- Gateway demo UI: `app/page.tsx` → `GatewayShell` → `ConsentProvider` / `GatewayDemo`.
- Client error surfaces: `app/error.tsx`, `app/global-error.tsx` (recoverable vs root errors).

## User Defined Namespaces

- [Leave blank - user populates]

## Components

- **Error boundaries** — `app/error.tsx`, `app/global-error.tsx`: show message + “Try again” in dev includes `error.message`.
