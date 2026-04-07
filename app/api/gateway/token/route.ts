import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, withApiAuthRequired } from "@auth0/nextjs-auth0";
import {
  exchangeConnectionScopedAccessToken,
  gatewayTokenRequestSchema,
} from "@/lib/vault-client";

/**
 * Issues connection-scoped provider access after consent:
 * session → subject token (Auth0) → token exchange (connection + audience) → metadata only.
 * Raw provider tokens are never returned to the client.
 */
export const POST = withApiAuthRequired(async function gatewayToken(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = gatewayTokenRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const subjectAudience = process.env.AUTH0_SUBJECT_TOKEN_AUDIENCE;
  if (!subjectAudience?.trim()) {
    return NextResponse.json(
      { error: "missing_env", detail: "AUTH0_SUBJECT_TOKEN_AUDIENCE" },
      { status: 500 },
    );
  }

  const res = new NextResponse();

  let subjectToken: string | undefined;
  try {
    const tokenResult = await getAccessToken(req, res, {
      authorizationParams: {
        audience: subjectAudience,
      },
    });
    subjectToken = tokenResult.accessToken ?? undefined;
  } catch {
    return NextResponse.json({ error: "subject_token_unavailable" }, { status: 401 });
  }

  if (!subjectToken) {
    return NextResponse.json({ error: "subject_token_unavailable" }, { status: 401 });
  }

  const { connection, audience, scopes } = parsed.data;
  const exchange = await exchangeConnectionScopedAccessToken({
    subjectToken,
    connection,
    audience,
    scopes,
  });

  if (!exchange.ok) {
    return NextResponse.json(
      { error: "token_exchange_failed", detail: exchange.error },
      { status: 502, headers: res.headers },
    );
  }

  // exchange.accessToken is intentionally not returned to the client.

  const issuedAt = new Date().toISOString();
  const metaScopes = scopes?.length ? scopes : [];

  return NextResponse.json(
    {
      ok: true as const,
      meta: {
        connection,
        audience,
        scopes: metaScopes,
        issuedAt,
        ...(exchange.expiresInSeconds !== undefined
          ? { expiresIn: exchange.expiresInSeconds }
          : {}),
      },
    },
    { status: 200, headers: res.headers },
  );
});
