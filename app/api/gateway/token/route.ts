import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  exchangeConnectionScopedAccessToken,
  gatewayTokenRequestSchema,
} from "@/lib/vault-client";

/**
 * Issues connection-scoped provider access after consent:
 * session → subject token (Auth0) → token exchange (connection + audience) → metadata only.
 * Raw provider tokens are never returned to the client.
 */
export async function POST(req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
    const tokenResult = await auth0.getAccessToken(req, res, {
      audience: subjectAudience,
    });
    subjectToken = tokenResult.token ?? undefined;
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
}
