import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

/** Branded 404 for unknown URLs (also exported as 404.html on static build). */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center px-5 py-28">
      <p className="label mb-3">404</p>
      <h1 className="h-display !normal-case text-4xl md:text-5xl">
        Lost the plot<span className="text-primary">.</span>
      </h1>
      <p className="mt-4 text-sm text-muted">
        This page has left the building — it may have moved, sold out, or never existed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-cream transition-colors duration-300 hover:bg-cream hover:text-coal"
      >
        Back home
      </Link>
    </div>
  );
}
