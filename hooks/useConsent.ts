"use client";

import { useCallback, useMemo, useState } from "react";
import type { ComponentInventoryFile, InventoryComponent } from "@/lib/gateway/inventory";
import { evaluateToolRequest, findComponent } from "@/lib/gateway/inventory";

/* ── Shared types ─────────────────────────────────────────── */

export type PendingToolRequest = {
  componentId: string;
  service: string;
  operation: string;
  scopes: string[];
  payload?: unknown;
};

export type GatewayStage =
  | "idle"
  | "intercept"
  | "policy"
  | "risk_check"
  | "consent_prompt"
  | "step_up"
  | "token_vault"
  | "execute"
  | "audit_log"
  | "complete"
  | "denied"
  | "error";

export type AuditEntry = {
  id: string;
  timestamp: string;
  componentId: string;
  operation: string;
  service: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  scopes: string[];
  decision: "approved" | "denied" | "error";
  stepUpUsed: boolean;
  tokenIssued: boolean;
  reason?: string;
};

export type TokenMeta = {
  audience: string;
  scopes: string[];
  issuedAt: string;
  /** Access token is NOT stored — only metadata */
};

export type ConsentState =
  | { status: "idle" }
  | { status: "loading_inventory" }
  | { status: "processing"; stage: GatewayStage; pending: PendingToolRequest; component: InventoryComponent }
  | { status: "awaiting_user"; pending: PendingToolRequest; component: InventoryComponent }
  | { status: "step_up_required"; pending: PendingToolRequest; component: InventoryComponent }
  | { status: "approved"; pending: PendingToolRequest; component: InventoryComponent; tokenMeta: TokenMeta }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };

/* ── Hook ─────────────────────────────────────────────────── */

export function useConsent() {
  const [inventory, setInventory] = useState<ComponentInventoryFile | null>(null);
  const [consent, setConsent] = useState<ConsentState>({ status: "idle" });
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [currentStage, setCurrentStage] = useState<GatewayStage>("idle");

  /* helpers */
  const addAudit = useCallback((entry: Omit<AuditEntry, "id" | "timestamp">) => {
    setAuditLog((prev) => [
      {
        ...entry,
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const advanceStage = useCallback((stage: GatewayStage, delay = 400) => {
    return new Promise<void>((resolve) => {
      setCurrentStage(stage);
      if (consent.status === "processing" || consent.status === "awaiting_user" || consent.status === "step_up_required") {
        // keep the same consent state but update stage
      }
      setTimeout(resolve, delay);
    });
  }, [consent.status]);

  /* 1. Load inventory */
  const loadInventory = useCallback(async () => {
    setConsent({ status: "loading_inventory" });
    const res = await fetch("/component-inventory.json", { cache: "no-store" });
    if (!res.ok) {
      setConsent({ status: "error", message: "Failed to load component-inventory.json" });
      return null;
    }
    const data = (await res.json()) as ComponentInventoryFile;
    setInventory(data);
    setConsent({ status: "idle" });
    return data;
  }, []);

  /* 2. Propose tool — runs stages 1-3 (intercept → policy → risk) */
  const proposeTool = useCallback(
    async (pending: PendingToolRequest) => {
      const inv = inventory ?? (await loadInventory());
      if (!inv) return;

      const component = findComponent(inv, pending.componentId);
      if (!component) {
        setCurrentStage("denied");
        setConsent({ status: "denied", reason: "Unknown component id" });
        addAudit({
          componentId: pending.componentId,
          operation: pending.operation,
          service: pending.service,
          risk: "HIGH",
          scopes: pending.scopes,
          decision: "denied",
          stepUpUsed: false,
          tokenIssued: false,
          reason: "Unknown component",
        });
        return;
      }

      // Stage 1: Intercept
      setCurrentStage("intercept");
      setConsent({ status: "processing", stage: "intercept", pending, component });
      await new Promise((r) => setTimeout(r, 500));

      // Stage 2: Policy evaluation
      setCurrentStage("policy");
      setConsent({ status: "processing", stage: "policy", pending, component });
      await new Promise((r) => setTimeout(r, 500));

      const decision = evaluateToolRequest({
        service: pending.service,
        operation: pending.operation,
        scopes: pending.scopes,
      });

      // Stage 3: Risk check
      setCurrentStage("risk_check");
      setConsent({ status: "processing", stage: "risk_check", pending, component });
      await new Promise((r) => setTimeout(r, 500));

      if (!decision.allowed) {
        if (decision.stepUpRequired) {
          // HIGH-risk: requires step-up authentication
          setCurrentStage("step_up");
          setConsent({ status: "step_up_required", pending, component });
          return;
        }
        setCurrentStage("denied");
        setConsent({ status: "denied", reason: decision.reason ?? "Policy denied" });
        addAudit({
          componentId: pending.componentId,
          operation: pending.operation,
          service: pending.service,
          risk: component.risk,
          scopes: pending.scopes,
          decision: "denied",
          stepUpUsed: false,
          tokenIssued: false,
          reason: decision.reason,
        });
        return;
      }

      // Stage 4: Consent prompt
      setCurrentStage("consent_prompt");
      setConsent({ status: "awaiting_user", pending, component });
    },
    [inventory, loadInventory, addAudit],
  );

  /* 3. Step-up verification */
  const verifyStepUp = useCallback(async () => {
    if (consent.status !== "step_up_required") return { verified: false };
    const { pending, component } = consent;

    const res = await fetch("/api/gateway/step-up", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actionId: pending.componentId }),
    });
    const data = (await res.json()) as { verified: boolean; loginUrl?: string; verifiedAt?: string };

    if (!data.verified && data.loginUrl) {
      // Redirect to Auth0 for re-authentication
      window.location.href = data.loginUrl;
      return { verified: false };
    }

    if (data.verified) {
      // Step-up passed — move to consent prompt
      setCurrentStage("consent_prompt");
      setConsent({ status: "awaiting_user", pending, component });
      return { verified: true };
    }

    return { verified: false };
  }, [consent]);

  /* 4. Authorize via Token Vault */
  const authorizeWithTokenVault = useCallback(
    async (pending: PendingToolRequest, component: InventoryComponent): Promise<TokenMeta> => {
      setCurrentStage("token_vault");

      const res = await fetch("/api/gateway/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience: component.audience,
          scopes: pending.scopes,
        }),
      });
      const data = (await res.json()) as { accessToken?: string; error?: string };
      if (!res.ok || !data.accessToken) {
        throw new Error(data.error ?? "Token Vault request failed");
      }

      // Return metadata only — never store the token in client state
      return {
        audience: component.audience,
        scopes: pending.scopes,
        issuedAt: new Date().toISOString(),
      };
    },
    [],
  );

  /* 5. Approve (user clicks approve) */
  const approve = useCallback(async () => {
    if (consent.status !== "awaiting_user") return;
    const { pending, component } = consent;
    const wasStepUp = component.risk === "HIGH";

    try {
      const tokenMeta = await authorizeWithTokenVault(pending, component);
      await new Promise((r) => setTimeout(r, 400));

      // Stage: Execute
      setCurrentStage("execute");
      await new Promise((r) => setTimeout(r, 500));

      // Stage: Audit log
      setCurrentStage("audit_log");
      addAudit({
        componentId: pending.componentId,
        operation: pending.operation,
        service: pending.service,
        risk: component.risk,
        scopes: pending.scopes,
        decision: "approved",
        stepUpUsed: wasStepUp,
        tokenIssued: true,
      });
      await new Promise((r) => setTimeout(r, 400));

      // Stage: Complete
      setCurrentStage("complete");
      setConsent({ status: "approved", pending, component, tokenMeta });

      return { ok: true as const, tokenMeta, pending, component };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Authorization failed";
      setCurrentStage("error");
      setConsent({ status: "error", message });
      addAudit({
        componentId: pending.componentId,
        operation: pending.operation,
        service: pending.service,
        risk: component.risk,
        scopes: pending.scopes,
        decision: "error",
        stepUpUsed: wasStepUp,
        tokenIssued: false,
        reason: message,
      });
      return { ok: false as const, error: message };
    }
  }, [authorizeWithTokenVault, consent, addAudit]);

  /* 6. Deny */
  const deny = useCallback(() => {
    if (consent.status === "awaiting_user" || consent.status === "step_up_required") {
      const { pending, component } = consent;
      addAudit({
        componentId: pending.componentId,
        operation: pending.operation,
        service: pending.service,
        risk: component.risk,
        scopes: pending.scopes,
        decision: "denied",
        stepUpUsed: false,
        tokenIssued: false,
        reason: "User denied",
      });
    }
    setCurrentStage("denied");
    setConsent({ status: "denied", reason: "User denied" });
  }, [consent, addAudit]);

  /* 7. Reset */
  const reset = useCallback(() => {
    setCurrentStage("idle");
    setConsent({ status: "idle" });
  }, []);

  return useMemo(
    () => ({
      inventory,
      consent,
      currentStage,
      auditLog,
      loadInventory,
      proposeTool,
      verifyStepUp,
      approve,
      deny,
      reset,
    }),
    [inventory, consent, currentStage, auditLog, loadInventory, proposeTool, verifyStepUp, approve, deny, reset],
  );
}
