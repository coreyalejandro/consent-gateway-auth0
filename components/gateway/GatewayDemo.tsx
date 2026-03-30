"use client";

import { useConsentContext } from "@/contexts/ConsentContext";

export function GatewayDemo() {
  const { consent, loadInventory, proposeTool, approve, deny, reset } = useConsentContext();

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"
            onClick={() => void loadInventory()}
          >
            Load inventory
          </button>
          <button
            type="button"
            className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600"
            onClick={() =>
              void proposeTool({
                componentId: "google.calendar.listEvents",
                service: "google",
                operation: "listEvents",
                scopes: ["calendar.read"],
              })
            }
          >
            Simulate agent: listEvents
          </button>
          <button
            type="button"
            className="rounded-lg bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-600"
            onClick={() =>
              void proposeTool({
                componentId: "google.calendar.deleteAllEvents",
                service: "google",
                operation: "deleteAllEvents",
                scopes: ["calendar.write"],
              })
            }
          >
            Simulate agent: deleteAll (HIGH)
          </button>
        </div>

        {consent.status === "awaiting_user" && (
          <div className="rounded-lg border border-amber-600/40 bg-amber-950/30 p-4 text-sm">
            <p className="font-medium text-amber-200">Approval required</p>
            <p className="mt-1 text-amber-100/90">
              {consent.component.id} — risk {consent.component.risk}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500"
                onClick={() => void approve()}
              >
                Approve (Token Vault)
              </button>
              <button
                type="button"
                className="rounded-lg bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700"
                onClick={deny}
              >
                Deny
              </button>
            </div>
          </div>
        )}

        {consent.status === "denied" && (
          <p className="text-sm text-red-400">Denied: {consent.reason}</p>
        )}
        {consent.status === "error" && (
          <p className="text-sm text-red-400">Error: {consent.message}</p>
        )}
        {consent.status === "loading_inventory" && (
          <p className="text-sm text-zinc-400">Loading inventory…</p>
        )}

        <button
          type="button"
          className="self-start text-sm text-zinc-500 underline hover:text-zinc-300"
          onClick={reset}
        >
          Reset state
        </button>
      </div>
    </section>
  );
}
