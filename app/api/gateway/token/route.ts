import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { z } from "zod";

const bodySchema = z.object({
  audience: z.string().min(1),
  scopes: z.array(z.string()).optional(),
});

/**
 * Auth0 Token Vault: returns an access token for the requested API audience/scopes
 * after the user session is established (use with gateway UI approve flow).
 *
 * @see https://auth0.com/ai/docs/intro/token-vault
 */
export const POST = withApiAuthRequired(async function gatewayToken(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { audience, scopes } = parsed.data;
  const res = new NextResponse();

  try {
    const { accessToken } = await getAccessToken(req, res, {
      authorizationParams: {
        audience,
        ...(scopes?.length ? { scope: scopes.join(" ") } : {}),
      },
      ...(scopes?.length ? { scopes } : {}),
    });

    return NextResponse.json(
      { accessToken: accessToken ?? null },
      { status: 200, headers: res.headers },
    );
  } catch {
    return NextResponse.json({ error: "access_token_unavailable" }, { status: 401 });
  }
});
