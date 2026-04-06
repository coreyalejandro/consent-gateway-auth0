import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestVaultToken, revokeLocalConsent } from "@/lib/vault-client";

describe("Vault Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("requestVaultToken", () => {
    it("returns ok with token meta on successful response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: "mock_token_abc123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await requestVaultToken(
        "https://www.googleapis.com/auth/calendar.readonly",
        ["calendar.read"],
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.accessToken).toBe("mock_token_abc123");
        expect(result.meta.audience).toBe("https://www.googleapis.com/auth/calendar.readonly");
        expect(result.meta.scopes).toEqual(["calendar.read"]);
        expect(result.meta.issuedAt).toBeTruthy();
        // Verify issuedAt is a valid ISO date
        expect(new Date(result.meta.issuedAt).toISOString()).toBe(result.meta.issuedAt);
      }

      // Verify fetch was called correctly
      expect(mockFetch).toHaveBeenCalledWith("/api/gateway/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience: "https://www.googleapis.com/auth/calendar.readonly",
          scopes: ["calendar.read"],
        }),
      });
    });

    it("returns error on non-ok response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "access_token_unavailable" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await requestVaultToken(
        "https://www.googleapis.com/auth/calendar",
        ["calendar.write"],
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("access_token_unavailable");
      }
    });

    it("returns error when response has no accessToken", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ accessToken: undefined }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await requestVaultToken(
        "https://www.googleapis.com/auth/calendar",
        [],
      );

      expect(result.ok).toBe(false);
    });

    it("returns default error message when no error field in response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await requestVaultToken("https://example.com", []);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Token Vault request failed");
      }
    });
  });

  describe("revokeLocalConsent", () => {
    it("does not throw", () => {
      expect(() => revokeLocalConsent()).not.toThrow();
    });
  });
});
