import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { gatewayTokenRequestSchema as gatewayTokenBodySchema } from "@/lib/vault-client";

const mocks = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockGetSession: vi.fn(),
  mockExchange: vi.fn(),
}));

vi.mock("@/lib/auth0", () => ({
  auth0: {
    getSession: () => mocks.mockGetSession(),
    getAccessToken: (...args: unknown[]) => mocks.mockGetAccessToken(...args),
  },
}));

vi.mock("@/lib/vault-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/vault-client")>("@/lib/vault-client");
  return {
    ...actual,
    exchangeConnectionScopedAccessToken: (
      ...args: Parameters<(typeof actual)["exchangeConnectionScopedAccessToken"]>
    ) => mocks.mockExchange(...args),
  };
});

/**
 * Request validation (shared with route) and route handler behavior with mocks.
 */
describe("/api/gateway/token request validation", () => {
  it("accepts valid body with connection, audience, and scopes", () => {
    const result = gatewayTokenBodySchema.safeParse({
      connection: "google-oauth2",
      audience: "https://www.googleapis.com/auth/calendar.readonly",
      scopes: ["calendar.read"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.connection).toBe("google-oauth2");
      expect(result.data.audience).toBe("https://www.googleapis.com/auth/calendar.readonly");
      expect(result.data.scopes).toEqual(["calendar.read"]);
    }
  });

  it("rejects missing connection", () => {
    const result = gatewayTokenBodySchema.safeParse({
      audience: "https://api.example.com",
      scopes: ["read"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty connection", () => {
    const result = gatewayTokenBodySchema.safeParse({
      connection: "",
      audience: "https://api.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing audience", () => {
    const result = gatewayTokenBodySchema.safeParse({
      connection: "google-oauth2",
    });
    expect(result.success).toBe(false);
  });

  it("rejects null body", () => {
    const result = gatewayTokenBodySchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("accepts optional scopes omitted", () => {
    const result = gatewayTokenBodySchema.safeParse({
      connection: "c",
      audience: "https://api.example.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("POST /api/gateway/token handler (mocked Auth0 + exchange)", () => {
  beforeEach(() => {
    process.env.AUTH0_SUBJECT_TOKEN_AUDIENCE = "https://subject.api.test/";
    mocks.mockGetSession.mockResolvedValue({ user: { sub: "user-1" } });
    mocks.mockGetAccessToken.mockResolvedValue({
      token: "subject_jwt",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    });
    mocks.mockExchange.mockResolvedValue({
      ok: true,
      accessToken: "provider_secret",
      expiresInSeconds: 3600,
    });
  });

  afterEach(() => {
    mocks.mockGetAccessToken.mockReset();
    mocks.mockGetSession.mockReset();
    mocks.mockExchange.mockReset();
    vi.clearAllMocks();
    delete process.env.AUTH0_SUBJECT_TOKEN_AUDIENCE;
  });

  it("returns 200 with metadata and never exposes access tokens", async () => {
    const { POST } = await import("@/app/api/gateway/token/route");
    const req = new NextRequest("http://localhost/api/gateway/token", {
      method: "POST",
      body: JSON.stringify({
        connection: "google-oauth2",
        audience: "https://www.googleapis.com/auth/calendar.readonly",
        scopes: ["calendar.read"],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json.ok).toBe(true);
    expect(json.meta).toMatchObject({
      connection: "google-oauth2",
      audience: "https://www.googleapis.com/auth/calendar.readonly",
      scopes: ["calendar.read"],
    });
    expect((json.meta as { issuedAt?: string }).issuedAt).toBeTruthy();
    expect((json.meta as { expiresIn?: number }).expiresIn).toBe(3600);
    expect(json).not.toHaveProperty("accessToken");
    expect(JSON.stringify(json)).not.toContain("provider_secret");
  });

  it("returns 502 when token exchange fails", async () => {
    mocks.mockExchange.mockResolvedValue({ ok: false, error: "invalid_grant" });
    const { POST } = await import("@/app/api/gateway/token/route");
    const req = new NextRequest("http://localhost/api/gateway/token", {
      method: "POST",
      body: JSON.stringify({
        connection: "google-oauth2",
        audience: "https://a",
        scopes: [],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBe("token_exchange_failed");
  });

  it("returns 500 when AUTH0_SUBJECT_TOKEN_AUDIENCE is unset", async () => {
    delete process.env.AUTH0_SUBJECT_TOKEN_AUDIENCE;
    const { POST } = await import("@/app/api/gateway/token/route");
    const req = new NextRequest("http://localhost/api/gateway/token", {
      method: "POST",
      body: JSON.stringify({
        connection: "c",
        audience: "https://a",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("returns 401 when subject token unavailable", async () => {
    mocks.mockGetAccessToken.mockResolvedValue({
      token: "",
      expiresAt: 0,
    });
    const { POST } = await import("@/app/api/gateway/token/route");
    const req = new NextRequest("http://localhost/api/gateway/token", {
      method: "POST",
      body: JSON.stringify({
        connection: "c",
        audience: "https://a",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when there is no session", async () => {
    mocks.mockGetSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/gateway/token/route");
    const req = new NextRequest("http://localhost/api/gateway/token", {
      method: "POST",
      body: JSON.stringify({
        connection: "c",
        audience: "https://a",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("/api/gateway/step-up route structure", () => {
  it("step-up route module exports POST handler", async () => {
    const mod = await import("@/app/api/gateway/step-up/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });

  it("token route module exports POST handler", async () => {
    const mod = await import("@/app/api/gateway/token/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });

  it("root middleware exports handler (Auth0 v4)", async () => {
    const mod = await import("@/middleware");
    expect(mod.middleware).toBeDefined();
    expect(typeof mod.middleware).toBe("function");
  });
});
