"use client";

import { useConsentContext } from "@/contexts/ConsentContext";

const RISK_DOT: Record<string, string> = {
  LOW: "bg-emerald-400",
  MEDIUM: "bg-amber-400",
  HIGH: "bg-red-400",
};

const RISK_BG: Record<string, string> = {
  LOW: "border-emerald-800/30 bg-emerald-950/20",
  MEDIUM: "border-amber-800/30 bg-amber-950/20",
  HIGH: "border-red-800/30 bg-red-950/20",
};

const RISK_TEXT: Record<string, string> = {
  LOW: "text-emerald-400",
  MEDIUM: "text-amber-400",
  HIGH: "text-red-400",
};

export function InventoryManifest() {
  const { inventory, loadInventory } = useConsentContext();

  if (!inventory) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3">
          Agent Permission Manifest
        </h3>
        <p className="text-sm text-zinc-600 mb-3">
          View the full component inventory — every tool the agent can request access to.
        </p>
        <button
          type="button"
          className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          onClick={() => void loadInventory()}
        >
          Load Manifest
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-1">
        Agent Permission Manifest
      </h3>
      <p className="text-[11px] text-zinc-600 mb-4">
        {inventory.components.length} registered tools · v{inventory.version}
      </p>
      <div className="space-y-2">
        {inventory.components.map((comp) => (
          <div
            key={comp.id}
            className={`rounded-lg border px-4 py-3 ${RISK_BG[comp.risk]}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${RISK_DOT[comp.risk]}`} />
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {comp.id}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {comp.risk === "HIGH" && (
                  <span className="rounded border border-violet-700/50 bg-violet-900/40 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-300">
                    Step-Up
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase ${RISK_TEXT[comp.risk]}`}>
                  {comp.risk}
                </span>
              </div>
            </div>
            {comp.description && (
              <p className="mt-1 text-xs text-zinc-500 pl-4">{comp.description}</p>
            )}
            <div className="mt-2 flex flex-col gap-1 pl-4">
              <p className="text-[10px] font-mono text-zinc-500">
                connection: <span className="text-zinc-400">{comp.connection}</span>
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 flex-wrap">
                  {comp.requiredScopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-zinc-700">→</span>
                <span className="text-[10px] font-mono text-zinc-600 truncate">
                  {comp.audience}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
