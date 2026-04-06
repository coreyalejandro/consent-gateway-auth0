import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the /api/gateway/token route logic.
 *
 * Since the route uses withApiAuthRequired (which needs Auth0 session),
 * we test the request validation schema directly and verify the route
 * module can be imported without errors.
 */

import { z } from "zod";

// Mirror the schema from the route
const bodySchema = z.object({
  audience: z.string().min(1),
  scopes: z.array(z.string()).optional(),
});

describe("/api/gateway/token request validation", () => {
  it("accepts valid body with audience and scopes", () => {
    const result = bodySchema.safeParse({
      audience: "https://www.googleapis.com/auth/calendar.readonly",
      scopes: ["calendar.read"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audience).toBe("https://www.googleapis.com/auth/calendar.readonly");
      expect(result.data.scopes).toEqual(["calendar.read"]);
    }
  });

  it("accepts valid body with audience only (scopes optional)", () => {
    const result = bodySchema.safeParse({
      audience: "https://api.example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scopes).toBeUndefined();
    }
  });

  it("rejects empty audience", () => {
    const result = bodySchema.safeParse({
      audience: "",
      scopes: ["read"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing audience", () => {
    const result = bodySchema.safeParse({
      scopes: ["read"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects null body", () => {
    const result = bodySchema.safeParse(null);
    expect(result.success).toBe(false);
  });

  it("rejects scopes as non-array", () => {
    const result = bodySchema.safeParse({
      audience: "https://api.example.com",
      scopes: "calendar.read",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty scopes array", () => {
    const result = bodySchema.safeParse({
      audience: "https://api.example.com",
      scopes: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple scopes", () => {
    const result = bodySchema.safeParse({
      audience: "https://api.example.com",
      scopes: ["read", "write", "delete"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scopes).toHaveLength(3);
    }
  });
});

describe("/api/gateway/step-up route structure", () => {
  it("step-up route module exports POST handler", async () => {
    // We can't fully test since it requires Auth0 session,
    // but we verify the module shape is correct
    const mod = await import("@/app/api/gateway/step-up/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });

  it("token route module exports POST handler", async () => {
    const mod = await import("@/app/api/gateway/token/route");
    expect(mod.POST).toBeDefined();
    expect(typeof mod.POST).toBe("function");
  });

  it("auth route module exports GET and POST handlers", async () => {
    const mod = await import("@/app/api/auth/[auth0]/route");
    expect(mod.GET).toBeDefined();
    expect(mod.POST).toBeDefined();
  });
});
