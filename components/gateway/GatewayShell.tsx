"use client";

import Link from "next/link";
import { ConsentProvider } from "@/contexts/ConsentContext";
import { GatewayDemo } from "@/components/gateway/GatewayDemo";

export function GatewayShell() {
  return (
    <ConsentProvider>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900/60 border border-emerald-700/40">
              <span className="text-lg">🛡</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-500">
                Consent Gateway
              </p>
              <h1 className="text-2xl font-bold text-white">Authorized to Act</h1>
            </div>
          </div>
          <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
            A governance layer for AI agents. Every tool call is intercepted, evaluated against policy
            and a component inventory, then authorized via{" "}
            <strong className="text-emerald-400">Auth0</strong> — session, connection binding, and consent before any
            connection-scoped token is issued.{" "}
            <Link className="text-sky-400 underline hover:text-sky-300" href="/auth/login">
              Sign in with Auth0
            </Link>{" "}
            to try the full flow.
          </p>
        </header>
        <GatewayDemo />
        <footer className="border-t border-zinc-800/50 pt-4 text-[11px] text-zinc-600">
          Built for the Auth0 AI Agent Hackathon · Consent Gateway + connection-scoped token issuance
        </footer>
      </main>
    </ConsentProvider>
  );
}
