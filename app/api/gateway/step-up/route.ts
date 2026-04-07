import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

/**
 * Step-up authentication endpoint.
 *
 * For HIGH-risk actions the gateway requires the user to re-authenticate
 * before connection-scoped token issuance proceeds. This route checks
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

export async function POST(_req: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  // auth_time is a standard OIDC claim (epoch seconds)
  const authTime: number | undefined = session.user["auth_time"] as number | undefined;
  const now = Math.floor(Date.now() / 1000);

  if (authTime && now - authTime <= STEP_UP_MAX_AGE_S) {
    return NextResponse.json({ verified: true, verifiedAt: new Date().toISOString() }, { status: 200 });
  }

  // Session is stale — client must redirect to Auth0 with re-login (v4: /auth/login)
  const loginUrl = `/auth/login?returnTo=${encodeURIComponent("/")}&prompt=login`;

  return NextResponse.json(
    { verified: false, reason: "session_stale", loginUrl },
    { status: 200 },
  );
}
