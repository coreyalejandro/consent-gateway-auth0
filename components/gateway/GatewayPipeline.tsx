"use client";

import type { GatewayStage } from "@/hooks/useConsent";

const STAGES: { key: GatewayStage; label: string; icon: string }[] = [
  { key: "intercept", label: "Intercept", icon: "🛡" },
  { key: "policy", label: "Policy", icon: "📋" },
  { key: "risk_check", label: "Risk", icon: "⚠" },
  { key: "step_up", label: "Step-Up", icon: "🔐" },
  { key: "consent_prompt", label: "Consent", icon: "👤" },
  { key: "token_vault", label: "Token Vault", icon: "🔑" },
  { key: "execute", label: "Execute", icon: "⚡" },
  { key: "audit_log", label: "Audit", icon: "📝" },
];

const STAGE_ORDER: Record<string, number> = {};
STAGES.forEach((s, i) => {
  STAGE_ORDER[s.key] = i;
});

function stageStatus(
  stageKey: GatewayStage,
  currentStage: GatewayStage,
): "inactive" | "active" | "complete" | "skipped" {
  if (currentStage === "idle" || currentStage === "denied" || currentStage === "error") {
    if (currentStage === "denied" || currentStage === "error") {
      const currentIdx = STAGE_ORDER[stageKey];
      // Show stages that were passed before denial
      return currentIdx !== undefined ? "inactive" : "inactive";
    }
    return "inactive";
  }

  if (currentStage === "complete") return "complete";

  const currentIdx = STAGE_ORDER[currentStage] ?? -1;
  const thisIdx = STAGE_ORDER[stageKey] ?? -1;

  if (thisIdx < currentIdx) return "complete";
  if (thisIdx === currentIdx) return "active";
  return "inactive";
}

const STATUS_STYLES: Record<string, string> = {
  inactive: "border-zinc-700 bg-zinc-900 text-zinc-600",
  active: "border-emerald-500 bg-emerald-950 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-105",
  complete: "border-emerald-600/50 bg-emerald-900/30 text-emerald-400",
  skipped: "border-zinc-800 bg-zinc-950 text-zinc-700 opacity-50",
};

const CONNECTOR_STYLES: Record<string, string> = {
  inactive: "bg-zinc-800",
  active: "bg-emerald-500 animate-pulse",
  complete: "bg-emerald-600/50",
  skipped: "bg-zinc-800",
};

export function GatewayPipeline({ currentStage }: { currentStage: GatewayStage }) {
  return (
    <div className="w-full">
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-center justify-between gap-0">
        {STAGES.map((stage, i) => {
          const status = stageStatus(stage.key, currentStage);
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 transition-all duration-500 ${STATUS_STYLES[status]}`}
              >
                <span className="text-lg leading-none">{stage.icon}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap">
                  {stage.label}
                </span>
                {status === "active" && (
                  <span className="h-1 w-6 rounded-full bg-emerald-400 animate-pulse" />
                )}
                {status === "complete" && (
                  <span className="text-[10px] text-emerald-500">✓</span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-4 lg:w-6 transition-all duration-500 ${CONNECTOR_STYLES[status === "complete" ? "complete" : stageStatus(STAGES[i + 1].key, currentStage) === "active" ? "active" : "inactive"]}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex md:hidden flex-col gap-0">
        {STAGES.map((stage, i) => {
          const status = stageStatus(stage.key, currentStage);
          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-500 ${STATUS_STYLES[status]}`}
                >
                  <span className="text-base">{stage.icon}</span>
                  <span className="text-xs font-medium uppercase tracking-wider">{stage.label}</span>
                  {status === "active" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {status === "complete" && <span className="text-xs text-emerald-500">✓</span>}
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`w-0.5 h-3 transition-all duration-500 ${CONNECTOR_STYLES[status === "complete" ? "complete" : "inactive"]}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
