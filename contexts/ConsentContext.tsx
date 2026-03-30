"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useConsent } from "@/hooks/useConsent";

type ConsentContextValue = ReturnType<typeof useConsent>;

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const value = useConsent();
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsentContext(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsentContext must be used within ConsentProvider");
  }
  return ctx;
}
