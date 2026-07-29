"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary — catches render/runtime errors anywhere in the
 * app so a single broken component shows a recoverable screen instead of a
 * white page. `reset()` re-renders the segment to retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // surface it for debugging; production hides the message from users
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
      <p className="label mb-3 !text-primary">Something broke</p>
      <h1 className="h-display !normal-case text-4xl md:text-5xl">
        That didn&apos;t go to plan<span className="text-primary">.</span>
      </h1>
      <p className="mt-4 text-sm text-muted">
        A hiccup on our end interrupted the page. Try again, or head back home.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:border-cream hover:bg-cream hover:text-coal"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
