import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  requestGatewayConnectionToken,
  revokeLocalConsent,
  exchangeConnectionScopedAccessToken,
  loadVaultEnv,
} from "@/lib/vault-client";

describe("Vault Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.AUTH0_ISSUER_BASE_URL = "https://tenant.auth0.com";
    process.env.AUTH0_TOKEN_VAULT_CLIENT_ID = "vault_cid";
    process.env.AUTH0_TOKEN_VAULT_CLIENT_SECRET = "vault_sec";
  });

  afterEach(() => {
    delete process.env.AUTH0_ISSUER_BASE_URL;
    delete process.env.AUTH0_TOKEN_VAULT_CLIENT_ID;
    delete process.env.AUTH0_TOKEN_VAULT_CLIENT_SECRET;
  });

  describe("loadVaultEnv", () => {
    it("throws when any vault env var is missing", () => {
      delete process.env.AUTH0_TOKEN_VAULT_CLIENT_SECRET;
      expect(() => loadVaultEnv()).toThrow(/vault_env_incomplete/);
    });

    it("returns normalized issuer URL", () => {
      process.env.AUTH0_ISSUER_BASE_URL = "https://tenant.auth0.com/";
      const env = loadVaultEnv();
      expect(env.issuerBaseUrl).toBe("https://tenant.auth0.com");
    });
  });

  describe("exchangeConnectionScopedAccessToken", () => {
    it("returns ok with access token on successful token endpoint response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "at_provider",
          expires_in: 120,
          scope: "a b",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await exchangeConnectionScopedAccessToken({
        subjectToken: "subj",
        connection: "google-oauth2",
        audience: "https://www.googleapis.com/auth/calendar.readonly",
        scopes: ["calendar.read"],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.accessToken).toBe("at_provider");
        expect(result.expiresInSeconds).toBe(120);
        expect(result.grantedScope).toBe("a b");
      }

      expect(mockFetch).toHaveBeenCalledWith(
        "https://tenant.auth0.com/oauth/token",
        expect.objectContaining({
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
        }),
      );
      const init = mockFetch.mock.calls[0][1] as RequestInit;
      const body = new URLSearchParams(init.body as string);
      expect(body.get("grant_type")).toContain("token-exchange");
      expect(body.get("connection")).toBe("google-oauth2");
      expect(body.get("audience")).toContain("googleapis.com");
      expect(body.get("subject_token")).toBe("subj");
    });

    it("returns failure on non-ok HTTP response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: "invalid_grant", error_description: "bad" }),
        }),
      );

      const result = await exchangeConnectionScopedAccessToken({
        subjectToken: "s",
        connection: "c",
        audience: "https://api",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("bad");
      }
    });

    it("returns failure when access_token missing in success HTTP response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({}),
        }),
      );

      const result = await exchangeConnectionScopedAccessToken({
        subjectToken: "s",
        connection: "c",
        audience: "https://api",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("token_exchange_missing_access_token");
      }
    });
  });

  describe("requestGatewayConnectionToken", () => {
    it("returns ok with meta on successful response", async () => {
      const meta = {
        connection: "google-oauth2",
        audience: "https://www.googleapis.com/auth/calendar.readonly",
        scopes: ["calendar.read"],
        issuedAt: new Date().toISOString(),
      };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, meta }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await requestGatewayConnectionToken(
        "google-oauth2",
        "https://www.googleapis.com/auth/calendar.readonly",
        ["calendar.read"],
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.meta).toEqual(meta);
      }

      expect(mockFetch).toHaveBeenCalledWith("/api/gateway/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connection: "google-oauth2",
          audience: "https://www.googleapis.com/auth/calendar.readonly",
          scopes: ["calendar.read"],
        }),
      });
    });

    it("returns error on non-ok response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          json: async () => ({ error: "token_exchange_failed" }),
        }),
      );

      const result = await requestGatewayConnectionToken("c", "https://a", []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("token_exchange_failed");
      }
    });

    it("returns error when ok flag or meta missing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ ok: false }),
        }),
      );

      const result = await requestGatewayConnectionToken("c", "https://a", []);
      expect(result.ok).toBe(false);
    });
  });

  describe("revokeLocalConsent", () => {
    it("does not throw", () => {
      expect(() => revokeLocalConsent()).not.toThrow();
    });
  });
});
