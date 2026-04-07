import type { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";

/**
 * Auth0 v4: mounts /auth/login, /auth/logout, /auth/callback, /auth/profile, etc.
 * Next.js 14 uses `middleware.ts` (not `proxy.ts`; that name is for Next.js 16+ in the quickstart).
 */
export async function middleware(request: NextRequest) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
