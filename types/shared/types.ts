export type AgentStatus = "ACTIVE" | "DISABLED";

export type AgentIdentity = {
  agentId: string;
  service: string;
};

export type AgentActionRequest = {
  actionId: string;
  service: string;
  operation: string;
  scopes: string[];
  payload: unknown;
};

export type PolicyDecision =
  | { allowed: true; risk: "LOW" | "MEDIUM" | "HIGH"; reason?: string }
  | { allowed: false; risk: "LOW" | "MEDIUM" | "HIGH"; reason: string; stepUpRequired?: boolean };

export type LedgerEntry = {
  id: string;
  actionId: string;
  agentId: string;
  service: string;
  operation: string;
  requestHash: string;
  responseHash: string;
  signature: string;
  createdAt: string;
};

export type RevocationState = {
  id: string;
  agentId: string;
  service: string;
  revokedAt: string;
  reason?: string | null;
};

export type IdempotencyRecord = {
  id: string;
  actionId: string;
  agentId: string;
  status: "RESERVED" | "COMPLETED";
  requestHash: string;
  responseJson?: string | null;
  createdAt: string;
  updatedAt: string;
};

