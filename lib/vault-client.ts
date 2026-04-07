/**
 * Gateway token issuance — server-side OAuth 2.0 token exchange (RFC 8693) and
 * browser helper for POST /api/gateway/token.
 *
 * Important: `getAccessToken()` from @auth0/nextjs-auth0 is a **subject session
 * token** for a configured API audience. It is not, by itself, proof of a
 * connection-bound provider token. Provider-scoped access is obtained only after
 * `exchangeConnectionScopedAccessToken()` succeeds with subject + connection + audience.
 */

import { z } from "zod";

const TOKEN_EXCHANGE_GRANT = "urn:ietf:params:oauth:grant-type:token-exchange";
const SUBJECT_TOKEN_TYPE = "urn:ietf:params:oauth:token-type:access_token";

export type VaultEnv = {
  issuerBaseUrl: string;
  vaultClientId: string;
  vaultClientSecret: string;
};

export function loadVaultEnv(): VaultEnv {
  const issuerBaseUrl = process.env.AUTH0_ISSUER_BASE_URL?.replace(/\/$/, "") ?? "";
  const vaultClientId = process.env.AUTH0_TOKEN_VAULT_CLIENT_ID ?? "";
  const vaultClientSecret = process.env.AUTH0_TOKEN_VAULT_CLIENT_SECRET ?? "";
  if (!issuerBaseUrl || !vaultClientId || !vaultClientSecret) {
    throw new Error(
      "vault_env_incomplete: set AUTH0_ISSUER_BASE_URL, AUTH0_TOKEN_VAULT_CLIENT_ID, AUTH0_TOKEN_VAULT_CLIENT_SECRET",
    );
  }
  return { issuerBaseUrl, vaultClientId, vaultClientSecret };
}

export type ExchangeConnectionParams = {
  subjectToken: string;
  connection: string;
  audience: string;
  scopes?: string[];
};

export type ExchangeConnectionSuccess = {
  ok: true;
  /** Returned only on the server; never send to the browser. */
  accessToken: string;
  expiresInSeconds?: number;
  grantedScope?: string;
};

export type ExchangeConnectionFailure = {
  ok: false;
  error: string;
};

export type ExchangeConnectionResult = ExchangeConnectionSuccess | ExchangeConnectionFailure;

/**
 * OAuth 2.0 token exchange against Auth0 `POST /oauth/token`.
 * Uses the token-exchange–enabled confidential client credentials plus
 * subject token, connection, and resource audience.
 */
export async function exchangeConnectionScopedAccessToken(
  params: ExchangeConnectionParams,
): Promise<ExchangeConnectionResult> {
  let env: VaultEnv;
  try {
    env = loadVaultEnv();
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "vault_env_incomplete",
    };
  }

  const tokenUrl = `${env.issuerBaseUrl}/oauth/token`;
  const body = new URLSearchParams({
    grant_type: TOKEN_EXCHANGE_GRANT,
    client_id: env.vaultClientId,
    client_secret: env.vaultClientSecret,
    subject_token: params.subjectToken,
    subject_token_type: SUBJECT_TOKEN_TYPE,
    audience: params.audience,
    connection: params.connection,
  });
  if (params.scopes?.length) {
    body.set("scope", params.scopes.join(" "));
  }

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json: unknown = await res.json().catch(() => ({}));
  const record = json as Record<string, unknown>;

  if (!res.ok) {
    const msg =
      typeof record.error_description === "string"
        ? record.error_description
        : typeof record.error === "string"
          ? record.error
          : "token_exchange_failed";
    return { ok: false, error: msg };
  }

  const accessToken = record.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return { ok: false, error: "token_exchange_missing_access_token" };
  }

  const expiresInSeconds =
    typeof record.expires_in === "number" ? record.expires_in : undefined;
  const grantedScope = typeof record.scope === "string" ? record.scope : undefined;

  return {
    ok: true,
    accessToken,
    expiresInSeconds,
    grantedScope,
  };
}

/* ── Browser: gateway token endpoint (metadata only in response) ─────────── */

export const gatewayTokenRequestSchema = z.object({
  connection: z.string().min(1),
  audience: z.string().min(1),
  scopes: z.array(z.string()).optional(),
});

export type GatewayTokenMeta = {
  connection: string;
  audience: string;
  scopes: string[];
  issuedAt: string;
  expiresIn?: number;
};

export type GatewayTokenClientResult =
  | { ok: true; meta: GatewayTokenMeta }
  | { ok: false; error: string };

/**
 * Client: request connection-scoped issuance via the gateway token endpoint.
 * The response does not include raw access tokens — only metadata.
 */
export async function requestGatewayConnectionToken(
  connection: string,
  audience: string,
  scopes: string[],
): Promise<GatewayTokenClientResult> {
  const res = await fetch("/api/gateway/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ connection, audience, scopes }),
  });

  const data = (await res.json()) as {
    ok?: boolean;
    meta?: GatewayTokenMeta;
    error?: string;
  };

  if (!res.ok || !data.ok || !data.meta) {
    return { ok: false, error: data.error ?? "gateway_token_request_failed" };
  }

  return { ok: true, meta: data.meta };
}

/**
 * Revoke context — in a production system this would call Auth0 Management API
 * to revoke the refresh token / connection grant. For the demo, this is a
 * client-side signal that clears local consent state.
 */
export function revokeLocalConsent(): void {
  // In production: POST /api/gateway/revoke → Auth0 Management API
  // For demo: caller clears state via the useConsent hook reset()
}
