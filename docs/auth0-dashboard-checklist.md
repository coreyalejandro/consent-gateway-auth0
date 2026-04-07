# Auth0 Dashboard checklist (Next.js SDK v4)

Use this in **Auth0 Dashboard** after you sign in. This repo cannot change your tenant remotely; the in-IDE browser also stops at login.

## 1. Application (Regular Web App)

**Path:** Applications → Applications → *[your app]* → **Settings**

| Field | Value to paste |
| --- | --- |
| **Application Type** | `Regular Web Application` |
| **Token Endpoint Authentication Method** | `Post` (`client_secret_post`) |

### Application URIs (local dev)

| Field | Value |
| --- | --- |
| **Allowed Callback URLs** | `http://localhost:3000/auth/callback` |
| **Allowed Logout URLs** | `http://localhost:3000/` |
| **Allowed Web Origins** | `http://localhost:3000` |

> **Note:** SDK v4 serves routes under `/auth/*`, **not** `/api/auth/*`. Do **not** use `http://localhost:3000/api/auth/callback` unless you intentionally customize routes.

Click **Save Changes**.

## 2. APIs (subject token)

**Path:** APIs → *[API for subject access token]* → **Settings**

- **Identifier** must match `AUTH0_SUBJECT_TOKEN_AUDIENCE` in `.env.local` exactly.

**Path:** APIs → *[same API]* → **Machine To Machine** (or **Permissions** / application access, depending on UI)

- Authorize your **Regular Web Application** to request this API if required by your tenant.

## 3. Token exchange client (vault env vars)

**Path:** Applications → *[Machine to Machine or confidential app used for exchange]* → **Settings**

- Copy **Client ID** → `AUTH0_TOKEN_VAULT_CLIENT_ID`
- Copy **Client Secret** → `AUTH0_TOKEN_VAULT_CLIENT_SECRET`

Enable **OAuth 2.0 Token Exchange** (and any Token Vault / connection settings) per Auth0 docs for your plan.

## 4. Connections

**Path:** Authentication → Social (or your connection type)

- Names must match `connection` in `public/component-inventory.json` (e.g. `google-oauth2`).

## 5. Verify locally

```bash
npm run verify:auth0
# or, without network:
npm run verify:auth0:offline
```

---

**Why MCP could not “fill” this:** The Auth0 Dashboard requires **your** login. Automated tools only reach the public login page until you authenticate in the browser.
