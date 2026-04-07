#!/usr/bin/env node
/**
 * Verifies Auth0-related configuration that was previously "tenant-dependent":
 * required env vars, issuer OpenID metadata (token endpoint), and inventory connection names.
 *
 * Usage:
 *   node scripts/verify-auth0-env.mjs
 *   node scripts/verify-auth0-env.mjs --offline    # skip HTTP (CI / no network)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = process.cwd();
const REQUIRED_FOR_GATEWAY = [
  "AUTH0_SUBJECT_TOKEN_AUDIENCE",
  "AUTH0_TOKEN_VAULT_CLIENT_ID",
  "AUTH0_TOKEN_VAULT_CLIENT_SECRET",
];

/** v4: APP_BASE_URL; legacy projects may still use AUTH0_BASE_URL */
const REQUIRED_FOR_LOGIN = ["AUTH0_SECRET", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"];

/** @param {Record<string, string | undefined>} env */
function hasIssuer(env) {
  const d = env.AUTH0_DOMAIN?.trim();
  const i = env.AUTH0_ISSUER_BASE_URL?.trim();
  return Boolean(d || i);
}

/** @param {Record<string, string | undefined>} env */
function issuerUrlFromEnv(env) {
  const explicit = env.AUTH0_ISSUER_BASE_URL?.trim();
  if (explicit) return normalizeIssuerBaseUrl(explicit);
  const domain = env.AUTH0_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
  if (domain) return `https://${domain}`;
  return "";
}

/** @param {Record<string, string | undefined>} env */
function hasAppBaseUrl(env) {
  return Boolean(env.APP_BASE_URL?.trim() || env.AUTH0_BASE_URL?.trim());
}

/** @param {string} raw */
export function normalizeIssuerBaseUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().replace(/\/$/, "");
}

/** @param {string} content */
export function parseDotEnv(content) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!content) return out;
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Merge .env.local / .env into process.env for this process only. */
export function loadLocalEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    const parsed = parseDotEnv(fs.readFileSync(p, "utf8"));
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined || process.env[k] === "") {
        process.env[k] = v;
      }
    }
  }
}

/** @param {unknown} json */
export function validateIssuerMetadataJson(json) {
  if (!json || typeof json !== "object") {
    return { ok: false, error: "issuer_metadata_not_object" };
  }
  const te = /** @type {{ token_endpoint?: unknown }} */ (json).token_endpoint;
  if (typeof te !== "string" || !te.startsWith("https://")) {
    return { ok: false, error: "issuer_metadata_missing_token_endpoint" };
  }
  return { ok: true, tokenEndpoint: te };
}

/**
 * @param {string} issuerBaseUrl
 * @param {typeof fetch} [fetchFn]
 */
export async function fetchIssuerMetadata(issuerBaseUrl, fetchFn = globalThis.fetch) {
  const base = normalizeIssuerBaseUrl(issuerBaseUrl);
  if (!base.startsWith("https://")) {
    return { ok: false, error: "issuer_not_https" };
  }
  const url = `${base}/.well-known/openid-configuration`;
  let res;
  try {
    res = await fetchFn(url, { method: "GET" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `issuer_fetch_failed: ${msg}` };
  }
  if (!res.ok) {
    return { ok: false, error: `issuer_metadata_http_${res.status}` };
  }
  let json;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "issuer_metadata_invalid_json" };
  }
  const v = validateIssuerMetadataJson(json);
  if (!v.ok) return v;
  return { ok: true, tokenEndpoint: v.tokenEndpoint };
}

/** @param {Record<string, string | undefined>} env */
export function missingKeys(env, keys) {
  return keys.filter((k) => {
    const v = env[k];
    return v === undefined || String(v).trim() === "";
  });
}

export function readInventoryConnections() {
  const invPath = path.join(ROOT, "public", "component-inventory.json");
  if (!fs.existsSync(invPath)) {
    return { ok: false, error: `missing_file:${invPath}` };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(invPath, "utf8"));
  } catch {
    return { ok: false, error: "inventory_invalid_json" };
  }
  const components = data?.components;
  if (!Array.isArray(components)) {
    return { ok: false, error: "inventory_missing_components" };
  }
  const connections = [...new Set(components.map((c) => c?.connection).filter(Boolean))];
  return { ok: true, connections };
}

async function main() {
  const offline = process.argv.includes("--offline");
  loadLocalEnvFiles();
  const env = process.env;

  console.log("=== Auth0 configuration verification ===\n");

  const missGateway = missingKeys(env, REQUIRED_FOR_GATEWAY);
  const missLogin = missingKeys(env, REQUIRED_FOR_LOGIN);

  if (missGateway.length) {
    console.error("FAIL: missing or empty gateway/token-exchange variables:");
    for (const k of missGateway) console.error(`  - ${k}`);
    console.error("\nSet these in .env.local (see .env.example).");
    process.exit(1);
  }

  if (!hasIssuer(env)) {
    console.error("FAIL: set AUTH0_DOMAIN (v4) or AUTH0_ISSUER_BASE_URL (legacy full issuer URL).");
    process.exit(1);
  }

  if (missLogin.length) {
    console.warn("WARN: missing or empty login/session variables (app login may not work):");
    for (const k of missLogin) console.warn(`  - ${k}`);
    console.warn("");
  }

  if (!hasAppBaseUrl(env)) {
    console.warn(
      "WARN: APP_BASE_URL (v4) or AUTH0_BASE_URL not set — Auth0 SDK may infer origin; set APP_BASE_URL=http://localhost:3000 for local dev.\n",
    );
  }

  const issuer = issuerUrlFromEnv(env);
  console.log(`Issuer (normalized): ${issuer}`);
  console.log(`Subject token audience: ${env.AUTH0_SUBJECT_TOKEN_AUDIENCE}`);
  console.log(`Token exchange client ID: ${env.AUTH0_TOKEN_VAULT_CLIENT_ID?.slice(0, 8)}…`);

  const inv = readInventoryConnections();
  if (!inv.ok) {
    console.error(`FAIL: inventory: ${inv.error}`);
    process.exit(1);
  }
  console.log("\nInventory connection name(s) (must match Auth0 Dashboard → Authentication):");
  for (const c of inv.connections) {
    console.log(`  - ${c}`);
  }

  if (offline) {
    console.log(
      `\n--offline: skipped GET ${issuer}/.well-known/openid-configuration`,
    );
    console.log("OK — env + inventory checks passed (offline).");
    process.exit(0);
  }

  const meta = await fetchIssuerMetadata(issuer);
  if (!meta.ok) {
    console.error(`\nFAIL: issuer metadata: ${meta.error}`);
    console.error("Fix AUTH0_DOMAIN / AUTH0_ISSUER_BASE_URL or use --offline if you have no network.");
    process.exit(1);
  }
  console.log(`\nIssuer metadata OK — token endpoint: ${meta.tokenEndpoint}`);

  console.log(
    "\nManual (still required for a working demo):\n" +
      "  - Auth0 Dashboard: enable token exchange for your exchange client + subject API.\n" +
      "  - Connection names above must exist and users must link the provider account.\n" +
      "  - Approve flow in UI → 502 on /api/gateway/token means exchange rejected (check Auth0 logs).\n",
  );

  console.log("OK — env, inventory, and issuer reachability verified.");
  process.exit(0);
}

const isCli =
  typeof process !== "undefined" &&
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (isCli) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
