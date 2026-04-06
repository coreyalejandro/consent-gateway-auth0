"use client";

import type { InventoryComponent } from "@/lib/gateway/inventory";
import type { PendingToolRequest, TokenMeta } from "@/hooks/useConsent";

const RISK_BADGE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  LOW: { bg: "bg-emerald-950/60", border: "border-emerald-600/40", text: "text-emerald-300", dot: "bg-emerald-400" },
  MEDIUM: { bg: "bg-amber-950/60", border: "border-amber-600/40", text: "text-amber-300", dot: "bg-amber-400" },
  HIGH: { bg: "bg-red-950/60", border: "border-red-600/40", text: "text-red-300", dot: "bg-red-400" },
};

export function ScopeDisplay({
  component,
  pending,
  tokenMeta,
}: {
  component: InventoryComponent;
  pending: PendingToolRequest;
  tokenMeta?: TokenMeta;
}) {
  const risk = RISK_BADGE[component.risk] ?? RISK_BADGE.LOW;

  return (
    <div className={`rounded-xl border ${risk.border} ${risk.bg} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${risk.dot}`} />
            <h4 className="text-sm font-semibold text-zinc-100">{component.id}</h4>
          </div>
          {component.description && (
            <p className="mt-1 text-xs text-zinc-400">{component.description}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${risk.border} ${risk.text}`}
        >
          {component.risk} Risk
        </span>
      </div>

      {/* Scope breakdown */}
      <div className="mt-3 space-y-2">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Requested Scopes
          </span>
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {pending.scopes.map((scope) => (
              <span
                key={scope}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-xs font-mono text-zinc-300"
              >
                <span className="h-1 w-1 rounded-full bg-sky-400" />
                {scope}
              </span>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            API Audience
          </span>
          <p className="mt-0.5 text-xs font-mono text-zinc-400 break-all">
            {component.audience}
          </p>
        </div>

        <div className="flex gap-4">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Service</span>
            <p className="text-xs text-zinc-300">{pending.service}</p>
          </div>
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Operation</span>
            <p className="text-xs text-zinc-300">{pending.operation}</p>
          </div>
        </div>
      </div>

      {/* Token metadata (post-approval) */}
      {tokenMeta && (
        <div className="mt-3 rounded-lg border border-sky-800/40 bg-sky-950/30 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-sky-400">
            Token Vault — Token Issued
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-zinc-500">Audience</span>
              <p className="font-mono text-sky-300 text-[11px] break-all">{tokenMeta.audience}</p>
            </div>
            <div>
              <span className="text-zinc-500">Issued At</span>
              <p className="text-sky-300">{new Date(tokenMeta.issuedAt).toLocaleTimeString()}</p>
            </div>
            <div className="col-span-2">
              <span className="text-zinc-500">Scopes Granted</span>
              <div className="mt-0.5 flex gap-1 flex-wrap">
                {tokenMeta.scopes.map((s) => (
                  <span key={s} className="rounded bg-sky-900/50 px-1.5 py-0.5 text-[10px] font-mono text-sky-300">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
