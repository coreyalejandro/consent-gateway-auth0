import type { PolicyDecision } from "@/lib/policy-engine";
import { evaluatePolicy } from "@/lib/policy-engine";

export type InventoryComponent = {
  id: string;
  service: string;
  operation: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  requiredScopes: string[];
  audience: string;
  /** Auth0 connection name bound to this tool (token exchange). */
  connection: string;
  description?: string;
};

export type ComponentInventoryFile = {
  version: string;
  components: InventoryComponent[];
};

export function findComponent(
  inventory: ComponentInventoryFile,
  id: string,
): InventoryComponent | undefined {
  return inventory.components.find((c) => c.id === id);
}

/** Aligns JSON inventory risk with server policy evaluation from ConsentChain. */
export function evaluateToolRequest(input: {
  service: string;
  operation: string;
  scopes: string[];
}): PolicyDecision {
  return evaluatePolicy(input);
}
