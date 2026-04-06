"use client";

import type { AuditEntry } from "@/hooks/useConsent";

const RISK_COLORS: Record<string, string> = {
  LOW: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  MEDIUM: "bg-amber-900/40 text-amber-300 border-amber-700/50",
  HIGH: "bg-red-900/40 text-red-300 border-red-700/50",
};

const DECISION_COLORS: Record<string, string> = {
  approved: "text-emerald-400",
  denied: "text-red-400",
  error: "text-orange-400",
};

const DECISION_ICONS: Record<string, string> = {
  approved: "✓",
  denied: "✗",
  error: "!",
};

export function ConsentLog({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
        <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-3">
          Audit Log
        </h3>
        <p className="text-sm text-zinc-600">No actions recorded yet. Simulate an agent action above.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 mb-4">
        Audit Log ({entries.length} {entries.length === 1 ? "entry" : "entries"})
      </h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-4 py-3"
          >
            {/* Decision indicator */}
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                entry.decision === "approved"
                  ? "bg-emerald-900/50 text-emerald-400"
                  : entry.decision === "denied"
                    ? "bg-red-900/50 text-red-400"
                    : "bg-orange-900/50 text-orange-400"
              }`}
            >
              {DECISION_ICONS[entry.decision]}
            </span>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-zinc-200">{entry.operation}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${RISK_COLORS[entry.risk]}`}>
                  {entry.risk}
                </span>
                {entry.stepUpUsed && (
                  <span className="rounded border border-violet-700/50 bg-violet-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-300">
                    Step-Up
                  </span>
                )}
                {entry.tokenIssued && (
                  <span className="rounded border border-sky-700/50 bg-sky-900/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-300">
                    Token Issued
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                <span>{entry.service}/{entry.componentId}</span>
                <span>·</span>
                <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
              </div>
              {entry.scopes.length > 0 && (
                <div className="mt-1.5 flex gap-1 flex-wrap">
                  {entry.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              )}
              {entry.reason && (
                <p className="mt-1 text-xs text-zinc-500 italic">{entry.reason}</p>
              )}
            </div>

            {/* Decision label */}
            <span className={`text-xs font-semibold uppercase ${DECISION_COLORS[entry.decision]}`}>
              {entry.decision}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
