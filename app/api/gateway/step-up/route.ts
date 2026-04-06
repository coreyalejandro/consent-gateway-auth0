import { NextRequest, NextResponse } from "next/server";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";

/**
 * Step-up authentication endpoint.
 *
 * For HIGH-risk actions the gateway requires the user to re-authenticate
 * before Token Vault issues a scoped access token.  This route checks
 * that the current Auth0 session was refreshed recently (within the
 * configured window) — acting as proof-of-presence.
 *
 * Flow:
 *   1. Client calls POST /api/gateway/step-up with { actionId, componentId }
 *   2. Server checks session freshness (auth_time within STEP_UP_MAX_AGE_S)
 *   3. If fresh → returns { verified: true, verifiedAt }
 *   4. If stale → returns { verified: false, loginUrl } so the client
 *      can redirect the user to Auth0 with prompt=login
 */

const STEP_UP_MAX_AGE_S = 120; // must have logged in within last 2 minutes

export const POST = withApiAuthRequired(async function stepUp(req: NextRequest) {
  const res = new NextResponse();

  const session = await getSession(req, res);
  if (!session?.user) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  // auth_time is a standard OIDC claim (epoch seconds)
  const authTime: number | undefined = session.user["auth_time"] as number | undefined;
  const now = Math.floor(Date.now() / 1000);

  if (authTime && now - authTime <= STEP_UP_MAX_AGE_S) {
    return NextResponse.json(
      { verified: true, verifiedAt: new Date().toISOString() },
      { status: 200, headers: res.headers },
    );
  }

  // Session is stale — client must redirect to Auth0 with prompt=login
  const loginUrl = `/api/auth/login?returnTo=${encodeURIComponent("/")}&authorizationParams=${encodeURIComponent(JSON.stringify({ prompt: "login", max_age: 0 }))}`;

  return NextResponse.json(
    { verified: false, reason: "session_stale", loginUrl },
    { status: 200, headers: res.headers },
  );
});
