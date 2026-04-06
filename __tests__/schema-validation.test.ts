import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("COMPONENTS.schema.json validation", () => {
  const schemaPath = path.join(process.cwd(), "COMPONENTS.schema.json");
  const inventoryPath = path.join(process.cwd(), "public", "component-inventory.json");

  let schema: Record<string, unknown>;
  let inventory: Record<string, unknown>;

  it("schema file exists and is valid JSON", () => {
    const raw = fs.readFileSync(schemaPath, "utf-8");
    schema = JSON.parse(raw);
    expect(schema.$schema).toBeDefined();
    expect(schema.$defs).toBeDefined();
  });

  it("inventory file exists and is valid JSON", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    expect(inventory).toBeDefined();
  });

  it("inventory matches schema required top-level fields", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    const schemaRaw = fs.readFileSync(schemaPath, "utf-8");
    schema = JSON.parse(schemaRaw);

    const requiredTopLevel = (schema as { required?: string[] }).required ?? [];
    for (const field of requiredTopLevel) {
      expect(inventory).toHaveProperty(field);
    }
  });

  it("every component has all schema-required fields", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    const schemaRaw = fs.readFileSync(schemaPath, "utf-8");
    schema = JSON.parse(schemaRaw);

    const defs = (schema as { $defs?: { component?: { required?: string[] } } }).$defs;
    const componentRequired: string[] = defs?.component?.required ?? [];
    const components = (inventory as { components: Record<string, unknown>[] }).components;

    for (const comp of components) {
      for (const field of componentRequired) {
        expect(comp).toHaveProperty(field);
        expect((comp as Record<string, unknown>)[field]).not.toBeNull();
        expect((comp as Record<string, unknown>)[field]).not.toBeUndefined();
      }
    }
  });

  it("risk values are valid enum values", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    const components = (inventory as { components: { risk: string }[] }).components;
    const validRisks = ["LOW", "MEDIUM", "HIGH"];
    for (const comp of components) {
      expect(validRisks).toContain(comp.risk);
    }
  });

  it("audiences are valid URLs", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    const components = (inventory as { components: { audience: string; id: string }[] }).components;
    for (const comp of components) {
      expect(comp.audience.startsWith("https://")).toBe(true);
    }
  });

  it("component IDs are unique", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    const components = (inventory as { components: { id: string }[] }).components;
    const ids = components.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("requiredScopes are non-empty arrays", () => {
    const raw = fs.readFileSync(inventoryPath, "utf-8");
    inventory = JSON.parse(raw);
    const components = (inventory as { components: { requiredScopes: string[] }[] }).components;
    for (const comp of components) {
      expect(Array.isArray(comp.requiredScopes)).toBe(true);
      expect(comp.requiredScopes.length).toBeGreaterThan(0);
    }
  });
});
