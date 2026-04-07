"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-12">
          <h1 className="text-xl font-semibold text-white">Application error</h1>
          <p className="text-sm text-zinc-400">
            A root-level error occurred. Refresh the page or try again. Check the browser console for the underlying
            error.
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
      </body>
    </html>
  );
}
