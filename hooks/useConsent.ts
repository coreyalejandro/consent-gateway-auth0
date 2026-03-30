"use client";

import { useCallback, useMemo, useState } from "react";
import type { ComponentInventoryFile, InventoryComponent } from "@/lib/gateway/inventory";
import { evaluateToolRequest, findComponent } from "@/lib/gateway/inventory";

export type PendingToolRequest = {
  componentId: string;
  service: string;
  operation: string;
  scopes: string[];
  payload?: unknown;
};

export type ConsentState =
  | { status: "idle" }
  | { status: "loading_inventory" }
  | { status: "awaiting_user"; pending: PendingToolRequest; component: InventoryComponent }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };

/**
 * Client hook for the 7-stage gateway flow (intercept → evaluate → prompt → authorize).
 * Token issuance uses Auth0 Token Vault via {@link POST /api/gateway/token}.
 */
export function useConsent() {
  const [inventory, setInventory] = useState<ComponentInventoryFile | null>(null);
  const [consent, setConsent] = useState<ConsentState>({ status: "idle" });

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

  /** 1–2: Intercept + evaluate policy + inventory risk. */
  const proposeTool = useCallback(
    async (pending: PendingToolRequest) => {
      const inv = inventory ?? (await loadInventory());
      if (!inv) return;

      const component = findComponent(inv, pending.componentId);
      if (!component) {
        setConsent({ status: "denied", reason: "Unknown component id" });
        return;
      }

      const decision = evaluateToolRequest({
        service: pending.service,
        operation: pending.operation,
        scopes: pending.scopes,
      });

      if (!decision.allowed) {
        setConsent({
          status: "denied",
          reason: decision.reason ?? "Policy denied",
        });
        return;
      }

      setConsent({ status: "awaiting_user", pending, component });
    },
    [inventory, loadInventory],
  );

  /** 4–5: After user approves in UI — request access token (Auth0 Token Vault). */
  const authorizeWithTokenVault = useCallback(
    async (pending: PendingToolRequest, component: InventoryComponent) => {
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
      return data.accessToken;
    },
    [],
  );

  const approve = useCallback(async () => {
    if (consent.status !== "awaiting_user") return;
    const { pending, component } = consent;
    try {
      const accessToken = await authorizeWithTokenVault(pending, component);
      setConsent({ status: "idle" });
      return { ok: true as const, accessToken, pending, component };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Authorization failed";
      setConsent({ status: "error", message });
      return { ok: false as const, error: message };
    }
  }, [authorizeWithTokenVault, consent]);

  const deny = useCallback(() => {
    setConsent({ status: "denied", reason: "User denied" });
  }, []);

  const reset = useCallback(() => {
    setConsent({ status: "idle" });
  }, []);

  return useMemo(
    () => ({
      inventory,
      consent,
      loadInventory,
      proposeTool,
      approve,
      deny,
      reset,
    }),
    [inventory, consent, loadInventory, proposeTool, approve, deny, reset],
  );
}
