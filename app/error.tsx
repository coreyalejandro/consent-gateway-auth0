"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12 text-zinc-100">
      <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
      <p className="text-sm text-zinc-400">
        The page hit a client error. Check the browser console for details. If this persists after a refresh, report
        the console stack trace.
      </p>
      {process.env.NODE_ENV === "development" && (
        <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 text-xs text-orange-200">
          {error.message}
        </pre>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="self-start rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
      >
        Try again
      </button>
    </main>
  );
}
