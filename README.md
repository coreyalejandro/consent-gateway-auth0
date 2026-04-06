# Consent Gateway — Auth0

> A governance layer for AI agents. Every tool call is intercepted, evaluated against policy, and authorized via **Auth0 Token Vault** — only after explicit user consent.

Built for the **Auth0 AI Agent Hackathon**.

---

## What It Does

AI agents can call tools (APIs, services) on behalf of users. But who decides what the agent is *allowed* to do? Consent Gateway answers this by inserting an 8-stage authorization pipeline between the agent's intent and the actual API call:

```
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
│ 5. Consent   │──▶ User sees scopes, risk, audience — approves or denies
├─────────────┤
│ 6. Token Vault│──▶ Auth0 issues scoped access token (getAccessToken)
├─────────────┤
│ 7. Execute   │──▶ API call with scoped token
├─────────────┤
│ 8. Audit     │──▶ Log decision, scopes, token metadata, timestamp
└─────────────┘
```

## Key Features

- **Token Vault Integration** — Auth0's `getAccessToken()` with audience + scope parameters retrieves scoped tokens from Token Vault. The agent never holds long-lived credentials.
- **Step-Up Authentication** — HIGH-risk actions (e.g., "delete all events") require the user to re-authenticate via Auth0 before the token is issued. Uses `auth_time` claim validation.
- **Policy Engine** — Operation allowlists, required scope checks, and risk classification. Extensible rule system.
- **Component Inventory** — JSON manifest of all agent-callable tools with risk levels, required scopes, and API audiences. Validated against a JSON Schema.
- **Visual Pipeline** — Real-time 8-stage pipeline visualization showing exactly where in the authorization flow the current request is.
- **Audit Log** — Every approve/deny/error is logged with timestamp, scopes, risk level, step-up status, and token issuance status.
- **Scope Visualization** — Users see exactly what permissions the agent is requesting, the target API audience, and the risk classification before granting consent.

## Token Vault Usage

The core Token Vault integration is in `app/api/gateway/token/route.ts`:

```typescript
const { accessToken } = await getAccessToken(req, res, {
  authorizationParams: {
    audience,   // e.g., "https://www.googleapis.com/auth/calendar.readonly"
    scope,      // e.g., "calendar.read"
  },
  scopes,       // enforce specific scopes
});
```

This retrieves a scoped access token from Auth0's Token Vault for the specific API audience the agent needs. The token is:
- **Scoped** to the exact permissions the user approved
- **Short-lived** — managed by Auth0's token lifecycle
- **Never stored client-side** — only metadata (audience, scopes, issuedAt) is shown in the UI

## Setup

### Prerequisites
- Node.js 18+
- An Auth0 tenant with Token Vault configured
- A Google API connection in Auth0 (for the calendar demo)

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Required variables:
| Variable | Description |
|---|---|
| `AUTH0_SECRET` | Random secret for session encryption |
| `AUTH0_BASE_URL` | `http://localhost:3000` |
| `AUTH0_ISSUER_BASE_URL` | `https://YOUR_TENANT.auth0.com` |
| `AUTH0_CLIENT_ID` | Auth0 application client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret |
| `AUTH0_AUDIENCE` | (Optional) Default API audience |

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Auth0 Configuration

1. Create a **Regular Web Application** in Auth0
2. Set **Allowed Callback URLs** to `http://localhost:3000/api/auth/callback`
3. Set **Allowed Logout URLs** to `http://localhost:3000`
4. Enable **Google** as a social connection
5. Create an API with the Google Calendar audience
6. Enable **Token Vault** for the Google connection

## Project Structure

```
app/
  api/
    auth/[auth0]/route.ts    — Auth0 login/logout/callback
    gateway/
      token/route.ts         — Token Vault: getAccessToken with audience+scopes
      step-up/route.ts       — Step-up auth verification (auth_time check)
  page.tsx                   — Main page

components/gateway/
  GatewayShell.tsx           — Layout wrapper
  GatewayDemo.tsx            — Main demo orchestrator
  GatewayPipeline.tsx        — 8-stage visual pipeline
  ConsentLog.tsx             — Audit log timeline
  ScopeDisplay.tsx           — Scope/permission visualization

hooks/
  useConsent.ts              — Core consent flow state machine

lib/
  gateway/inventory.ts       — Component inventory lookup + policy bridge
  policy-engine/rules.ts     — Policy evaluation (allowlists, scopes, risk)
  vault-client.ts            — Token Vault client wrapper

public/
  component-inventory.json   — Agent tool inventory manifest
```

## Architecture Decisions

1. **Client-side state machine** — The consent flow runs as a React state machine so the pipeline visualization is real-time. Token issuance happens server-side.
2. **Component inventory as data** — Tools are declared in a JSON manifest, not hardcoded. This enables dynamic policy without code changes.
3. **Step-up via auth_time** — Instead of custom challenge tokens, we use the OIDC `auth_time` claim to verify session freshness. Simple, standard, auditable.
4. **Token metadata only** — The UI never stores or displays access tokens. Only metadata (audience, scopes, timestamp) is shown.

## License

MIT
