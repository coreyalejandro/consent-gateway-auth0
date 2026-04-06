import { describe, it, expect } from "vitest";
import type { GatewayStage, AuditEntry, ConsentState, PendingToolRequest } from "@/hooks/useConsent";

/**
 * Tests for consent flow types and state machine transitions.
 * Since the hook requires React rendering context, we test the type
 * contracts and state shapes that the hook produces.
 */

describe("Consent Flow Types", () => {
  describe("GatewayStage values", () => {
    it("covers all expected stages", () => {
      const stages: GatewayStage[] = [
        "idle",
        "intercept",
        "policy",
        "risk_check",
        "consent_prompt",
        "step_up",
        "token_vault",
        "execute",
        "audit_log",
        "complete",
        "denied",
        "error",
      ];
      // Type check — if any stage is invalid, this won't compile
      expect(stages).toHaveLength(12);
    });
  });

  describe("ConsentState discriminated union", () => {
    it("idle state has no extra fields", () => {
      const state: ConsentState = { status: "idle" };
      expect(state.status).toBe("idle");
    });

    it("awaiting_user state carries pending and component", () => {
      const pending: PendingToolRequest = {
        componentId: "google.calendar.listEvents",
        service: "google",
        operation: "listEvents",
        scopes: ["calendar.read"],
      };
      const state: ConsentState = {
        status: "awaiting_user",
        pending,
        component: {
          id: "google.calendar.listEvents",
          service: "google",
          operation: "listEvents",
          risk: "LOW",
          requiredScopes: ["calendar.read"],
          audience: "https://www.googleapis.com/auth/calendar.readonly",
        },
      };
      expect(state.status).toBe("awaiting_user");
      if (state.status === "awaiting_user") {
        expect(state.pending.componentId).toBe("google.calendar.listEvents");
        expect(state.component.risk).toBe("LOW");
      }
    });

    it("step_up_required state carries pending and component", () => {
      const state: ConsentState = {
        status: "step_up_required",
        pending: {
          componentId: "google.calendar.deleteAllEvents",
          service: "google",
          operation: "deleteAllEvents",
          scopes: ["calendar.write"],
        },
        component: {
          id: "google.calendar.deleteAllEvents",
          service: "google",
          operation: "deleteAllEvents",
          risk: "HIGH",
          requiredScopes: ["calendar.write"],
          audience: "https://www.googleapis.com/auth/calendar",
        },
      };
      expect(state.status).toBe("step_up_required");
      if (state.status === "step_up_required") {
        expect(state.component.risk).toBe("HIGH");
      }
    });

    it("denied state carries reason", () => {
      const state: ConsentState = { status: "denied", reason: "User denied" };
      expect(state.status).toBe("denied");
      if (state.status === "denied") {
        expect(state.reason).toBe("User denied");
      }
    });

    it("error state carries message", () => {
      const state: ConsentState = { status: "error", message: "Token Vault request failed" };
      if (state.status === "error") {
        expect(state.message).toBe("Token Vault request failed");
      }
    });

    it("approved state carries tokenMeta", () => {
      const state: ConsentState = {
        status: "approved",
        pending: {
          componentId: "google.calendar.listEvents",
          service: "google",
          operation: "listEvents",
          scopes: ["calendar.read"],
        },
        component: {
          id: "google.calendar.listEvents",
          service: "google",
          operation: "listEvents",
          risk: "LOW",
          requiredScopes: ["calendar.read"],
          audience: "https://www.googleapis.com/auth/calendar.readonly",
        },
        tokenMeta: {
          audience: "https://www.googleapis.com/auth/calendar.readonly",
          scopes: ["calendar.read"],
          issuedAt: new Date().toISOString(),
        },
      };
      if (state.status === "approved") {
        expect(state.tokenMeta.audience).toContain("googleapis.com");
        expect(state.tokenMeta.scopes).toEqual(["calendar.read"]);
      }
    });
  });

  describe("AuditEntry shape", () => {
    it("creates valid audit entries for approved actions", () => {
      const entry: AuditEntry = {
        id: "audit_123_abc",
        timestamp: new Date().toISOString(),
        componentId: "google.calendar.listEvents",
        operation: "listEvents",
        service: "google",
        risk: "LOW",
        scopes: ["calendar.read"],
        decision: "approved",
        stepUpUsed: false,
        tokenIssued: true,
      };
      expect(entry.decision).toBe("approved");
      expect(entry.tokenIssued).toBe(true);
      expect(entry.stepUpUsed).toBe(false);
    });

    it("creates valid audit entries for denied actions", () => {
      const entry: AuditEntry = {
        id: "audit_456_def",
        timestamp: new Date().toISOString(),
        componentId: "google.calendar.deleteAllEvents",
        operation: "deleteAllEvents",
        service: "google",
        risk: "HIGH",
        scopes: ["calendar.write"],
        decision: "denied",
        stepUpUsed: false,
        tokenIssued: false,
        reason: "User denied",
      };
      expect(entry.decision).toBe("denied");
      expect(entry.tokenIssued).toBe(false);
      expect(entry.reason).toBe("User denied");
    });

    it("creates valid audit entries for step-up actions", () => {
      const entry: AuditEntry = {
        id: "audit_789_ghi",
        timestamp: new Date().toISOString(),
        componentId: "google.calendar.deleteAllEvents",
        operation: "deleteAllEvents",
        service: "google",
        risk: "HIGH",
        scopes: ["calendar.write"],
        decision: "approved",
        stepUpUsed: true,
        tokenIssued: true,
      };
      expect(entry.stepUpUsed).toBe(true);
      expect(entry.risk).toBe("HIGH");
    });
  });

  describe("PendingToolRequest", () => {
    it("requires all mandatory fields", () => {
      const req: PendingToolRequest = {
        componentId: "google.calendar.createEvent",
        service: "google",
        operation: "createEvent",
        scopes: ["calendar.write"],
      };
      expect(req.componentId).toBeTruthy();
      expect(req.service).toBeTruthy();
      expect(req.operation).toBeTruthy();
      expect(req.scopes.length).toBeGreaterThan(0);
      expect(req.payload).toBeUndefined();
    });

    it("supports optional payload", () => {
      const req: PendingToolRequest = {
        componentId: "google.calendar.createEvent",
        service: "google",
        operation: "createEvent",
        scopes: ["calendar.write"],
        payload: { title: "Team Meeting", date: "2026-04-07" },
      };
      expect(req.payload).toBeDefined();
    });
  });
});
