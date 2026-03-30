export type PolicyInput = {
  service: string;
  operation: string;
  scopes: string[];
};

export type PolicyDecision =
  | { allowed: true; risk: "LOW" | "MEDIUM" | "HIGH"; reason?: string }
  | { allowed: false; risk: "LOW" | "MEDIUM" | "HIGH"; reason: string; stepUpRequired?: boolean };

const OPERATION_ALLOWLIST: Record<string, Set<string>> = {
  google: new Set(["listEvents", "createEvent", "deleteAllEvents"]),
};

const RISK_BY_OPERATION: Record<string, "LOW" | "MEDIUM" | "HIGH"> = {
  listEvents: "LOW",
  createEvent: "MEDIUM",
  deleteAllEvents: "HIGH",
};

const REQUIRED_SCOPES: Record<string, string[]> = {
  listEvents: ["calendar.read"],
  createEvent: ["calendar.write"],
  deleteAllEvents: ["calendar.write"],
};

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  const allowedOps = OPERATION_ALLOWLIST[input.service];
  if (!allowedOps || !allowedOps.has(input.operation)) {
    return { allowed: false, risk: "HIGH", reason: "operation not allowed" };
  }

  const risk = RISK_BY_OPERATION[input.operation] ?? "HIGH";
  const required = REQUIRED_SCOPES[input.operation] ?? [];
  const missing = required.filter((s) => !input.scopes.includes(s));
  if (missing.length > 0) {
    return { allowed: false, risk, reason: `missing scopes: ${missing.join(", ")}` };
  }

  if (risk === "HIGH") {
    return { allowed: false, risk, reason: "high risk operation requires step-up", stepUpRequired: true };
  }

  return { allowed: true, risk };
}

