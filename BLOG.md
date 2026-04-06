# Why AI Agents Need a Consent Gateway (and How Token Vault Makes It Possible)

AI agents are getting good at calling tools. They can read your calendar, draft emails, create tickets, and manage files. But here's the problem nobody is solving well: **who decides what the agent is allowed to do, and how is that decision enforced?**

Most agent frameworks treat authorization as a binary: the user connects an API, and the agent gets full access. There's no distinction between reading a calendar event and deleting every event on it. There's no audit trail of what was approved. There's no step-up authentication for destructive actions. The agent just... acts.

## What a Consent Gateway Solves

The Consent Gateway pattern inserts a governance layer between the agent's intent and the API call. Every tool invocation passes through an 8-stage pipeline: intercept, policy evaluation, risk classification, step-up authentication (for high-risk actions), user consent, token issuance, execution, and audit logging.

The key insight is that **authorization should be granular and contextual**. Reading calendar events is LOW risk — auto-approve it after initial consent. Creating an event is MEDIUM — show the user what's happening. Deleting all events is HIGH — require the user to re-authenticate before the token is even issued.

This is where a component inventory comes in. Each tool the agent can call is declared in a JSON manifest with its risk level, required scopes, and target API audience. The policy engine evaluates every request against this inventory before the user ever sees a consent prompt.

## How Token Vault Enables It

Auth0's Token Vault is the critical piece that makes this pattern practical. Instead of the agent (or the application) managing OAuth tokens, refresh tokens, and credential storage, Token Vault handles the entire token lifecycle. The gateway simply calls `getAccessToken()` with the specific audience and scopes the user approved:

```typescript
const { accessToken } = await getAccessToken(req, res, {
  authorizationParams: {
    audience: "https://www.googleapis.com/auth/calendar.readonly",
    scope: "calendar.read",
  },
});
```

The token is scoped to exactly what the user consented to — nothing more. It's short-lived, managed by Auth0, and never stored in the application's client-side state. The UI only shows metadata: which API, which scopes, when it was issued.

This separation is crucial. The agent framework doesn't need to know how tokens are stored or refreshed. The consent gateway doesn't need to implement a credential store. Token Vault handles the plumbing, and the gateway handles the policy.

## Token Vault as Prompt Injection Defense

There's a security angle that's easy to miss: Token Vault is also a **prompt injection defense**. When an agent holds API keys or long-lived tokens in its context, a prompt injection attack can exfiltrate those credentials — the agent is tricked into sending them to an attacker-controlled endpoint. With Token Vault, the agent never possesses credentials. The token is retrieved server-side by the gateway, used for a single scoped API call, and never exposed to the LLM context. Even if the agent is compromised by a malicious prompt, there are no credentials to steal. The attacker would need to compromise both the Auth0 session and pass the consent gateway's policy engine — a dramatically higher bar.

## The Step-Up Gap in Agent Authorization

Here's the insight that surprised me while building this: **no major agent framework implements risk-tiered authorization**. LangChain, CrewAI, AutoGen — they all treat every tool call the same way. A read operation and a destructive bulk delete go through the same (or no) authorization flow.

The consent gateway pattern introduces step-up authentication for high-risk actions. When an agent requests a destructive operation, the gateway checks the OIDC `auth_time` claim to verify session freshness. If the user hasn't authenticated recently, they're redirected to Auth0 with `prompt=login` before the token is issued. This is the same pattern banks use for wire transfers — applied to AI agent actions.

## What's Next

The consent gateway is a pattern, not a product. Any team building agent tooling should consider: What happens when the agent calls a destructive API? Who audits that decision? Can the user revoke access to a specific service without disconnecting everything?

If you're building AI agents that act on behalf of users, start with three things: a component inventory (declare what the agent can do), a policy engine (evaluate whether it should), and Token Vault (issue scoped credentials only when authorized). The era of "connect and forget" agent authorization needs to end.

---

*Built for the Auth0 AI Agent Hackathon. [View the repo →](https://github.com/coreyalejandro/consent-gateway-auth0)*
