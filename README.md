# Consent Gateway — Auth0

> A governance layer for AI agents. Every tool call is intercepted, evaluated against policy, and only proceeds after explicit user consent and **server-side** connection-scoped token issuance.

Built for the **Auth0 AI Agent Hackathon**.

---

## What It Does

AI agents can call tools (APIs, services) on behalf of users. Consent Gateway inserts an 8-stage authorization pipeline between the agent's intent and execution:

```text
Agent Tool Call
      │
      ▼
┌─────────────┐
│ 1. Intercept │──▶ Capture the tool request
├─────────────┤
│ 2. Policy    │──▶ Evaluate against allowlists + scope rules
├─────────────┤
│ 3. Risk      │──▶ Classify LOW / MEDIUM / HIGH from component inventory
├─────────────┤
│ 4. Step-Up   │──▶ HIGH-risk actions require re-authentication via Auth0
├─────────────┤
│ 5. Consent   │──▶ User sees scopes, risk, audience, connection — approves or denies
├─────────────┤
│ 6. Issuance  │──▶ Session subject token + OAuth token exchange (connection + audience)
├─────────────┤
│ 7. Execute   │──▶ Downstream API call (not shown in this demo UI)
├─────────────┤
│ 8. Audit     │──▶ Log decision, scopes, token metadata, timestamp
└─────────────┘
```

## Key Features

- **Connection-bound issuance** — Each inventory tool declares an Auth0 `connection`. The gateway calls `POST /oauth/token` with the OAuth 2.0 token exchange grant (RFC 8693): **subject token** (from the logged-in session) + **connection** + **audience** → **provider access token** on the server only.
- **Not the same as `getAccessToken()` alone** — `getAccessToken()` here retrieves a **subject** access token for `AUTH0_SUBJECT_TOKEN_AUDIENCE`. That proves session identity for the exchange; it is **not** mislabeled as the full Token Vault / provider proof by itself.
- **Step-Up Authentication** — HIGH-risk actions require recent re-authentication (`auth_time` validation).
- **Policy Engine** — Operation allowlists, scope checks, and risk classification.
- **Component Inventory** — JSON manifest: `connection`, `risk`, `requiredScopes`, `audience` per tool. Validated against `COMPONENTS.schema.json`.
- **Audit Log** — Approve/deny/error with scopes, risk, step-up, and issuance status.

## Token Semantics (Truthful)

| Piece | Role |
| --- | --- |
| **Auth0 session / subject token** | User access token for `AUTH0_SUBJECT_TOKEN_AUDIENCE` — input to token exchange |
| **Provider access token** | Result of token exchange with `connection` + `audience` — **never returned to the browser** in this app; only metadata is shown |
| **Consent boundary** | User approval happens before the exchange runs |

Implementation: `lib/vault-client.ts` (`exchangeConnectionScopedAccessToken`), `app/api/gateway/token/route.ts`.

## Setup

### Prerequisites

- Node.js 18+
- Auth0 tenant with login configured
- An Auth0 API registered for **subject tokens** (`AUTH0_SUBJECT_TOKEN_AUDIENCE`)
- A **confidential client** allowed to perform token exchange (Token Vault / custom grant), with `AUTH0_TOKEN_VAULT_CLIENT_ID` / `AUTH0_TOKEN_VAULT_CLIENT_SECRET`

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description |
| --- | --- |
| `APP_BASE_URL` | App origin (Auth0 SDK v4), e.g. `http://localhost:3000` |
| `AUTH0_DOMAIN` | Tenant hostname **without** `https://`, e.g. `dev-xxx.us.auth0.com` |
| `AUTH0_SECRET` | Session cookie encryption secret (64+ hex chars recommended) |
| `AUTH0_CLIENT_ID` | Regular web app client ID |
| `AUTH0_CLIENT_SECRET` | Regular web app client secret |
| `AUTH0_SUBJECT_TOKEN_AUDIENCE` | **Required.** Auth0 API identifier for the **subject** access token used in token exchange |
| `AUTH0_TOKEN_VAULT_CLIENT_ID` | **Required.** Client ID for token exchange |
| `AUTH0_TOKEN_VAULT_CLIENT_SECRET` | **Required.** Client secret for token exchange |
| `AUTH0_ISSUER_BASE_URL` | *(Optional)* Full issuer URL; if omitted, derived as `https://${AUTH0_DOMAIN}` for vault + verify scripts |

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Auth0 Configuration (high level)

1. Create a **Regular Web Application**; set **Allowed Callback URLs** to `http://localhost:3000/auth/callback` and **Allowed Logout URLs** to `http://localhost:3000/` (Auth0 Next.js SDK **v4** mounts routes under `/auth/*`, not `/api/auth/*`).
2. Create an **Auth0 API**; set its identifier to `AUTH0_SUBJECT_TOKEN_AUDIENCE` and authorize the web app to request it.
3. Configure a **confidential client** for token exchange (`AUTH0_TOKEN_VAULT_*`) per Auth0 docs.
4. Align **connection** names in `component-inventory.json` with your Auth0 connections (e.g. `google-oauth2`).

### Verify tenant + env (automated)

After filling `.env.local`, run:

```bash
npm run verify:auth0
```

This checks required variables, lists **inventory `connection` values** you must match in the Auth0 Dashboard, and fetches `/.well-known/openid-configuration` to confirm the issuer is reachable and exposes `token_endpoint`.

For CI or air-gapped runs (env + inventory only, no HTTP):

```bash
npm run verify:auth0:offline
```

**Still manual (Auth0 Dashboard):** enabling the token-exchange grant for your exchange client, linking the user’s social account, and watching Auth0 logs if `/api/gateway/token` returns `502` — the script documents these in its success output.

## Project Structure

```text
middleware.ts              — Auth0 v4: `auth0.middleware()` (mounts `/auth/login`, `/auth/callback`, …)
lib/auth0.ts                 — `Auth0Client` singleton
app/
  api/
    gateway/
      token/route.ts         — Subject token + RFC 8693 exchange; metadata-only response
      step-up/route.ts       — Step-up auth verification (auth_time)
  page.tsx

components/gateway/          — Demo UI

hooks/useConsent.ts          — Consent flow; passes `connection` to token route

lib/
  gateway/inventory.ts
  policy-engine/
  vault-client.ts            — Token exchange + gateway request schema

public/component-inventory.json
COMPONENTS.schema.json
```

## Architecture Decisions

1. **Metadata-only response** — The token route returns `{ ok, meta }` so the UI cannot accidentally store provider tokens.
2. **Inventory declares `connection`** — Binds consent to a concrete Auth0 connection for exchange.
3. **Step-up via `auth_time`** — Standard OIDC freshness check for HIGH risk.

## License

MIT
