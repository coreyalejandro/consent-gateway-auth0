# Why AI Agents Need a Consent Gateway (and How Connection-Scoped Tokens Fit)

AI agents are increasingly able to call tools: calendars, email, tickets, files. The hard problem is **governance**: who decides what the agent may do, and how is that decision enforced with real credentials?

Many frameworks treat authorization as binary: the user connected an account, so the agent may call the API. That collapses read vs destructive operations, skips auditability, and blurs where tokens live.

## What a Consent Gateway Solves

The pattern inserts a pipeline between **intent** and **execution**: intercept, policy, risk, optional step-up, explicit consent, then **server-side** issuance of a short-lived, scoped credential bound to a declared **connection** and **audience**.

A **component inventory** makes each tool explicit: risk tier, required scopes, target audience, and Auth0 connection name. The policy engine evaluates requests before the user sees a prompt.

## Session Token vs Provider Token

Two different artifacts matter:

1. **Subject token** — An Auth0-issued access token for your API (`AUTH0_SUBJECT_TOKEN_AUDIENCE`). It represents the logged-in user and is used as the `subject_token` in OAuth 2.0 token exchange (RFC 8693).

2. **Provider access token** — The token returned by Auth0’s `/oauth/token` exchange for a specific **connection** (e.g. a linked Google account) and **resource audience**. That is what downstream APIs consume.

Calling a session helper alone is **not** the same as proving a connection-scoped provider token. The honest integration binds **session → connection → exchange → consent → execution** and keeps provider tokens off the client.

## Prompt Injection and Client-Side Secrets

If long-lived API keys or raw tokens sit in agent context, prompt-injection can exfiltrate them. A gateway that issues tokens **only on the server** after consent, and returns **metadata** to the UI, reduces what the browser and LLM ever see.

## Step-Up for Destructive Actions

HIGH-risk operations deserve stronger proof-of-presence. Checking OIDC `auth_time` (or equivalent) before issuance matches how sensitive real-world flows work.

## What’s Next

Treat the gateway as a pattern: inventory + policy + auditable consent + **truthful** token semantics. Align docs and code so “Token Vault” or “vault” language never stands in for “we only called `getAccessToken()` once and called it a day.”

---

*Built for the Auth0 AI Agent Hackathon. [View the repo →](https://github.com/coreyalejandro/consent-gateway-auth0)*
