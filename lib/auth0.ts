import { Auth0Client } from "@auth0/nextjs-auth0/server";

/**
 * Auth0 Next.js SDK v4 client. Reads env at runtime; supports v4 names plus
 * legacy `AUTH0_ISSUER_BASE_URL` / `AUTH0_BASE_URL` from older configs.
 */
function domainFromEnv(): string | undefined {
  const raw = process.env.AUTH0_DOMAIN?.trim();
  if (raw) return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const issuer = process.env.AUTH0_ISSUER_BASE_URL?.trim();
  if (issuer?.startsWith("https://")) {
    return issuer.replace(/^https:\/\//, "").replace(/\/$/, "");
  }
  if (issuer?.startsWith("http://")) {
    return issuer.replace(/^http:\/\//, "").replace(/\/$/, "");
  }
  return undefined;
}

function appBaseUrlFromEnv(): string | undefined {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.AUTH0_BASE_URL?.trim() ||
    undefined
  );
}

const domain = domainFromEnv();
const appBaseUrl = appBaseUrlFromEnv();

export const auth0 = new Auth0Client({
  ...(domain ? { domain } : {}),
  ...(appBaseUrl ? { appBaseUrl } : {}),
});
