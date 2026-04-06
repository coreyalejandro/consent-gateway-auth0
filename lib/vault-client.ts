/**
 * Token Vault client wrapper.
 *
 * Server-side: uses @auth0/nextjs-auth0 getAccessToken() to retrieve
 * scoped tokens from Auth0's Token Vault for a given audience + scopes.
 *
 * Client-side: calls POST /api/gateway/token which proxies to the above.
 *
 * The access token is NEVER stored in client state — only metadata
 * (audience, scopes, issuedAt) is surfaced to the UI.
 */

export type VaultTokenMeta = {
  audience: string;
  scopes: string[];
  issuedAt: string;
};

export type VaultTokenResult =
  | { ok: true; accessToken: string; meta: VaultTokenMeta }
  | { ok: false; error: string };

/**
 * Client-side: request a scoped access token via the gateway token endpoint.
 * The endpoint is protected by Auth0 session — user must be logged in.
 */
export async function requestVaultToken(
  audience: string,
  scopes: string[],
): Promise<VaultTokenResult> {
  const res = await fetch("/api/gateway/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audience, scopes }),
  });

  const data = (await res.json()) as { accessToken?: string; error?: string };

  if (!res.ok || !data.accessToken) {
    return { ok: false, error: data.error ?? "Token Vault request failed" };
  }

  return {
    ok: true,
    accessToken: data.accessToken,
    meta: {
      audience,
      scopes,
      issuedAt: new Date().toISOString(),
    },
  };
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
