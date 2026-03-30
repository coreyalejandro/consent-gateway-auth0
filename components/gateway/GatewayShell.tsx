"use client";

import Link from "next/link";
import { ConsentProvider } from "@/contexts/ConsentContext";
import { GatewayDemo } from "@/components/gateway/GatewayDemo";

export function GatewayShell() {
  return (
    <ConsentProvider>
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-zinc-500">Consent Gateway</p>
          <h1 className="text-3xl font-semibold text-white">Authorized to Act</h1>
          <p className="text-zinc-400">
            Intercept → evaluate policy + inventory → prompt → Auth0 Token Vault. Sign in with{" "}
            <Link className="text-emerald-400 underline" href="/api/auth/login">
              Auth0
            </Link>
            , then approve a sample tool request.
          </p>
        </header>
        <GatewayDemo />
      </main>
    </ConsentProvider>
  );
}
