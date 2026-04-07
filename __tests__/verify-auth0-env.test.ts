import { describe, it, expect, vi } from "vitest";
import {
  normalizeIssuerBaseUrl,
  validateIssuerMetadataJson,
  parseDotEnv,
  missingKeys,
  fetchIssuerMetadata,
} from "../scripts/verify-auth0-env.mjs";

describe("verify-auth0-env.mjs helpers", () => {
  it("normalizeIssuerBaseUrl trims and strips trailing slash", () => {
    expect(normalizeIssuerBaseUrl("  https://x.auth0.com/  ")).toBe("https://x.auth0.com");
    expect(normalizeIssuerBaseUrl("")).toBe("");
  });

  it("validateIssuerMetadataJson requires https token_endpoint", () => {
    expect(validateIssuerMetadataJson(null).ok).toBe(false);
    expect(validateIssuerMetadataJson({}).ok).toBe(false);
    expect(validateIssuerMetadataJson({ token_endpoint: "http://insecure" }).ok).toBe(false);
    const ok = validateIssuerMetadataJson({
      token_endpoint: "https://tenant.auth0.com/oauth/token",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.tokenEndpoint).toContain("oauth/token");
    }
  });

  it("parseDotEnv handles comments and quoted values", () => {
    const env = parseDotEnv(`
# c
FOO=bar
BAZ="quoted"
`);
    expect(env.FOO).toBe("bar");
    expect(env.BAZ).toBe("quoted");
  });

  it("missingKeys lists empty or missing entries", () => {
    expect(missingKeys({ A: "1", B: "" }, ["A", "B", "C"])).toEqual(["B", "C"]);
  });

  it("fetchIssuerMetadata uses token_endpoint from discovery", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        token_endpoint: "https://t.auth0.com/oauth/token",
      }),
    });
    const r = await fetchIssuerMetadata("https://t.auth0.com/", fetchFn);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.tokenEndpoint).toContain("oauth/token");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://t.auth0.com/.well-known/openid-configuration",
      { method: "GET" },
    );
  });

  it("fetchIssuerMetadata fails on bad issuer URL", async () => {
    const r = await fetchIssuerMetadata("not-a-url", vi.fn());
    expect(r.ok).toBe(false);
  });
});
