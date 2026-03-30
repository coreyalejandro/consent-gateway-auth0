#!/usr/bin/env node
/**
 * Validates public/component-inventory.json against COMPONENTS.schema.json (AJV-free smoke check).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const inventoryPath = path.join(root, "public", "component-inventory.json");
const schemaPath = path.join(root, "COMPONENTS.schema.json");

function main() {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

  if (typeof inventory.version !== "string") {
    console.error("handoff:check FAIL: inventory.version missing");
    process.exit(1);
  }
  if (!Array.isArray(inventory.components)) {
    console.error("handoff:check FAIL: inventory.components must be an array");
    process.exit(1);
  }

  const required = schema.$defs?.component?.required ?? [];
  for (const c of inventory.components) {
    for (const key of required) {
      if (c[key] === undefined || c[key] === null) {
        console.error(`handoff:check FAIL: component missing "${key}"`, c);
        process.exit(1);
      }
    }
  }

  console.log(
    `handoff:check OK — ${inventory.components.length} components (schema required fields present).`,
  );
}

main();
