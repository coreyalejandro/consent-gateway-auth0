"use client";

import { useConsentContext } from "@/contexts/ConsentContext";
import { GatewayPipeline } from "@/components/gateway/GatewayPipeline";
import { ConsentLog } from "@/components/gateway/ConsentLog";
import { ScopeDisplay } from "@/components/gateway/ScopeDisplay";
import { InventoryManifest } from "@/components/gateway/InventoryManifest";

const ACTIONS = [
  {
    label: "Read Events",
    sublabel: "LOW risk · calendar.read",
    componentId: "google.calendar.listEvents",
    service: "google",
    operation: "listEvents",
    scopes: ["calendar.read"],
    color: "bg-emerald-700 hover:bg-emerald-600",
  },
  {
    label: "Create Event",
    sublabel: "MEDIUM risk · calendar.write",
    componentId: "google.calendar.createEvent",
    service: "google",
    operation: "createEvent",
    scopes: ["calendar.write"],
    color: "bg-amber-700 hover:bg-amber-600",
  },
  {
    label: "Delete All Events",
    sublabel: "HIGH risk · step-up required",
    componentId: "google.calendar.deleteAllEvents",
    service: "google",
    operation: "deleteAllEvents",
    scopes: ["calendar.write"],
    color: "bg-red-700 hover:bg-red-600",
  },
] as const;

export function GatewayDemo() {
  const { consent, currentStage, auditLog, proposeTool, verifyStepUp, approve, deny, reset } =
    useConsentContext();

  const isProcessing = consent.status === "processing" || consent.status === "loading_inventory";

  return (
    <div className="flex flex-col gap-6">
      {/* Pipeline Visualization */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-4">
          Gateway Pipeline
        </h3>
        <GatewayPipeline currentStage={currentStage} />
      </section>

      {/* Agent Actions */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h3 className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3">
          Simulate Agent Tool Call
        </h3>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action.componentId}
              type="button"
              disabled={isProcessing}
              className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${action.color}`}
              onClick={() =>
                void proposeTool({
                  componentId: action.componentId,
                  service: action.service,
                  operation: action.operation,
                  scopes: [...action.scopes],
                })
              }
            >
              <span className="block">{action.label}</span>
              <span className="block text-[10px] opacity-70 font-normal">{action.sublabel}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Scope Display + Consent Prompt */}
      {consent.status === "awaiting_user" && (
        <section className="rounded-xl border border-amber-600/40 bg-amber-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-amber-200">User Approval Required</h3>
          </div>
          <p className="text-sm text-amber-100/80">
            The agent wants to execute <strong>{consent.pending.operation}</strong> on{" "}
            <strong>{consent.pending.service}</strong>. Review the requested permissions below.
          </p>

          <ScopeDisplay component={consent.component} pending={consent.pending} />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              onClick={() => void approve()}
            >
              Approve — Issue connection-scoped token
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              onClick={deny}
            >
              Deny
            </button>
          </div>
        </section>
      )}

      {/* Step-Up Required */}
      {consent.status === "step_up_required" && (
        <section className="rounded-xl border border-violet-600/40 bg-violet-950/20 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <h3 className="text-sm font-semibold text-violet-200">Step-Up Authentication Required</h3>
          </div>
          <p className="text-sm text-violet-100/80">
            <strong>{consent.pending.operation}</strong> is a <strong className="text-red-300">HIGH risk</strong> action.
            The gateway requires you to re-authenticate before this action can proceed.
            This protects against unauthorized destructive operations.
          </p>

          <ScopeDisplay component={consent.component} pending={consent.pending} />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
              onClick={() => void verifyStepUp()}
            >
              Re-Authenticate with Auth0
            </button>
            <button
              type="button"
              className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              onClick={deny}
            >
              Deny
            </button>
          </div>
        </section>
      )}

      {/* Approved (success) */}
      {consent.status === "approved" && (
        <section className="rounded-xl border border-emerald-600/40 bg-emerald-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
              ✓
            </span>
            <h3 className="text-sm font-semibold text-emerald-200">Action Authorized & Executed</h3>
          </div>
          <ScopeDisplay
            component={consent.component}
            pending={consent.pending}
            tokenMeta={consent.tokenMeta}
          />
        </section>
      )}

      {/* Denied */}
      {consent.status === "denied" && (
        <section className="rounded-xl border border-red-800/40 bg-red-950/20 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-800 text-[10px] font-bold text-red-200">
              ✗
            </span>
            <p className="text-sm text-red-300">
              <strong>Denied:</strong> {consent.reason}
            </p>
          </div>
        </section>
      )}

      {/* Error */}
      {consent.status === "error" && (
        <section className="rounded-xl border border-orange-800/40 bg-orange-950/20 p-4">
          <p className="text-sm text-orange-300">
            <strong>Error:</strong> {consent.message}
          </p>
        </section>
      )}

      {/* Reset */}
      {consent.status !== "idle" && consent.status !== "loading_inventory" && consent.status !== "processing" && (
        <button
          type="button"
          className="self-start text-xs text-zinc-500 underline hover:text-zinc-300 transition-colors"
          onClick={reset}
        >
          Reset gateway
        </button>
      )}

      {/* Permission Manifest */}
      <InventoryManifest />

      {/* Audit Log */}
      <ConsentLog entries={auditLog} />
    </div>
  );
}
