import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "@/lib/policy-engine/rules";

describe("Policy Engine", () => {
  describe("operation allowlist", () => {
    it("allows known google operations", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "listEvents",
        scopes: ["calendar.read"],
      });
      expect(result.allowed).toBe(true);
    });

    it("denies unknown service", () => {
      const result = evaluatePolicy({
        service: "slack",
        operation: "sendMessage",
        scopes: ["chat.write"],
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("operation not allowed");
    });

    it("denies unknown operation on known service", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "sendEmail",
        scopes: ["mail.send"],
      });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("operation not allowed");
    });
  });

  describe("scope enforcement", () => {
    it("denies listEvents without calendar.read scope", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "listEvents",
        scopes: [],
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("missing scopes");
        expect(result.reason).toContain("calendar.read");
      }
    });

    it("denies createEvent without calendar.write scope", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "createEvent",
        scopes: ["calendar.read"],
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("missing scopes");
        expect(result.reason).toContain("calendar.write");
      }
    });

    it("allows createEvent with calendar.write scope", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "createEvent",
        scopes: ["calendar.write"],
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("risk classification", () => {
    it("classifies listEvents as LOW risk", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "listEvents",
        scopes: ["calendar.read"],
      });
      expect(result.risk).toBe("LOW");
    });

    it("classifies createEvent as MEDIUM risk", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "createEvent",
        scopes: ["calendar.write"],
      });
      expect(result.risk).toBe("MEDIUM");
    });

    it("classifies deleteAllEvents as HIGH risk", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "deleteAllEvents",
        scopes: ["calendar.write"],
      });
      expect(result.risk).toBe("HIGH");
    });
  });

  describe("step-up authentication", () => {
    it("requires step-up for HIGH-risk operations", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "deleteAllEvents",
        scopes: ["calendar.write"],
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.stepUpRequired).toBe(true);
        expect(result.reason).toContain("step-up");
      }
    });

    it("allows HIGH-risk operation when stepUpVerified is true", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "deleteAllEvents",
        scopes: ["calendar.write"],
        stepUpVerified: true,
      });
      expect(result.allowed).toBe(true);
      expect(result.risk).toBe("HIGH");
    });

    it("still denies HIGH-risk without scopes even with stepUpVerified", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "deleteAllEvents",
        scopes: [],
        stepUpVerified: true,
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("missing scopes");
      }
    });

    it("does NOT require step-up for LOW risk", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "listEvents",
        scopes: ["calendar.read"],
      });
      expect(result.allowed).toBe(true);
      // stepUpRequired should not exist on allowed result
    });

    it("does NOT require step-up for MEDIUM risk", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "createEvent",
        scopes: ["calendar.write"],
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty service string", () => {
      const result = evaluatePolicy({
        service: "",
        operation: "listEvents",
        scopes: ["calendar.read"],
      });
      expect(result.allowed).toBe(false);
    });

    it("handles empty operation string", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "",
        scopes: ["calendar.read"],
      });
      expect(result.allowed).toBe(false);
    });

    it("handles extra scopes gracefully (superset of required)", () => {
      const result = evaluatePolicy({
        service: "google",
        operation: "listEvents",
        scopes: ["calendar.read", "calendar.write", "extra.scope"],
      });
      expect(result.allowed).toBe(true);
    });
  });
});
