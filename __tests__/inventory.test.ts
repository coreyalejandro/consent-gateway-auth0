import { describe, it, expect } from "vitest";
import { findComponent, evaluateToolRequest } from "@/lib/gateway/inventory";
import type { ComponentInventoryFile } from "@/lib/gateway/inventory";

const MOCK_INVENTORY: ComponentInventoryFile = {
  version: "1",
  components: [
    {
      id: "google.calendar.listEvents",
      service: "google",
      operation: "listEvents",
      risk: "LOW",
      requiredScopes: ["calendar.read"],
      audience: "https://www.googleapis.com/auth/calendar.readonly",
      connection: "google-oauth2",
      description: "Read calendar events (low risk).",
    },
    {
      id: "google.calendar.createEvent",
      service: "google",
      operation: "createEvent",
      risk: "MEDIUM",
      requiredScopes: ["calendar.write"],
      audience: "https://www.googleapis.com/auth/calendar.events",
      connection: "google-oauth2",
      description: "Create events (medium risk).",
    },
    {
      id: "google.calendar.deleteAllEvents",
      service: "google",
      operation: "deleteAllEvents",
      risk: "HIGH",
      requiredScopes: ["calendar.write"],
      audience: "https://www.googleapis.com/auth/calendar",
      connection: "google-oauth2",
      description: "Destructive bulk delete (high risk).",
    },
  ],
};

describe("Component Inventory", () => {
  describe("findComponent", () => {
    it("finds existing component by id", () => {
      const result = findComponent(MOCK_INVENTORY, "google.calendar.listEvents");
      expect(result).toBeDefined();
      expect(result!.id).toBe("google.calendar.listEvents");
      expect(result!.risk).toBe("LOW");
      expect(result!.audience).toBe("https://www.googleapis.com/auth/calendar.readonly");
    });

    it("finds HIGH-risk component", () => {
      const result = findComponent(MOCK_INVENTORY, "google.calendar.deleteAllEvents");
      expect(result).toBeDefined();
      expect(result!.risk).toBe("HIGH");
    });

    it("returns undefined for unknown component id", () => {
      const result = findComponent(MOCK_INVENTORY, "slack.channel.sendMessage");
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty string id", () => {
      const result = findComponent(MOCK_INVENTORY, "");
      expect(result).toBeUndefined();
    });

    it("is case-sensitive", () => {
      const result = findComponent(MOCK_INVENTORY, "Google.Calendar.ListEvents");
      expect(result).toBeUndefined();
    });
  });

  describe("evaluateToolRequest", () => {
    it("bridges to policy engine correctly for allowed request", () => {
      const result = evaluateToolRequest({
        service: "google",
        operation: "listEvents",
        scopes: ["calendar.read"],
      });
      expect(result.allowed).toBe(true);
      expect(result.risk).toBe("LOW");
    });

    it("bridges to policy engine correctly for denied request", () => {
      const result = evaluateToolRequest({
        service: "google",
        operation: "listEvents",
        scopes: [],
      });
      expect(result.allowed).toBe(false);
    });

    it("bridges to policy engine for HIGH-risk with step-up", () => {
      const result = evaluateToolRequest({
        service: "google",
        operation: "deleteAllEvents",
        scopes: ["calendar.write"],
      });
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.stepUpRequired).toBe(true);
      }
    });
  });
});

describe("Component Inventory JSON validation", () => {
  it("matches the expected structure from public/component-inventory.json", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const inventoryPath = path.join(process.cwd(), "public", "component-inventory.json");
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    const inventory = JSON.parse(raw) as ComponentInventoryFile;

    expect(inventory.version).toBe("1");
    expect(inventory.components).toBeInstanceOf(Array);
    expect(inventory.components.length).toBe(3);

    for (const comp of inventory.components) {
      expect(comp.id).toBeTruthy();
      expect(comp.service).toBeTruthy();
      expect(comp.operation).toBeTruthy();
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(comp.risk);
      expect(comp.requiredScopes).toBeInstanceOf(Array);
      expect(comp.requiredScopes.length).toBeGreaterThan(0);
      expect(comp.audience).toBeTruthy();
      expect(comp.audience.startsWith("https://")).toBe(true);
      expect(comp.connection).toBeTruthy();
    }
  });

  it("has matching component-inventory.json in root and public", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const publicPath = path.join(process.cwd(), "public", "component-inventory.json");
    const rootPath = path.join(process.cwd(), "component-inventory.json");

    const publicContent = fs.readFileSync(publicPath, "utf-8");
    const rootContent = fs.readFileSync(rootPath, "utf-8");

    expect(JSON.parse(publicContent)).toEqual(JSON.parse(rootContent));
  });
});
