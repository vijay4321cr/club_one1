"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself. It replaces
 * the whole document, so it must render its own <html>/<body> and can't rely on
 * the app's CSS — styles are inlined and kept minimal on purpose.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          background: "#0d0d0d",
          color: "#f5f5f0",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.9rem", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: "#8d8d87", maxWidth: "28rem", margin: 0, lineHeight: 1.6 }}>
          The app hit an unexpected error. Please try again — if it keeps happening, reload the
          page.
        </p>
        <button
          onClick={reset}
          style={{
            border: "none",
            borderRadius: "9999px",
            background: "#e10600",
            color: "#f5f5f0",
            padding: "0.9rem 1.6rem",
            fontSize: "0.8125rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
