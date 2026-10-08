"use client";

import { useEffect } from "react";

import DrylakeWordmark from "@/components/brand/DrylakeWordmark";
import { CONTACT_EMAIL } from "@/lib/site";

/*
 * Last-resort boundary for errors thrown by the ROOT layout itself (for example the site
 * metadata or the Organization JSON-LD failing to build from lib/discovery/entity.ts). Clerk is
 * no longer mounted in the root layout (see components/auth/ClerkScope.tsx, 2026-10-07), so a
 * missing Clerk key now surfaces in a segment error boundary instead. app/error.tsx cannot
 * catch root-layout errors: it renders inside the root layout. Without this file Next shows its unbranded default ("Application
 * error: a client-side exception has occurred"). This replaces the whole document, so it owns
 * <html>/<body> and uses inline styles only: nothing from the failed layout can be assumed.
 *
 * Only the opaque digest is shown (a hash Drylake can match to the server log line), never
 * the message or stack. Plain anchors, not next/link: the router may be the thing broken.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout render failed", { digest: error.digest ?? null });
  }, [error]);

  return (
    <html lang="en-AU">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0b",
          color: "#f4f4f1",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: 520 }}>
          {/* Inline SVG with inline sizing: renders with no stylesheet, as this screen must. */}
          <DrylakeWordmark tone="dark" height={28} />
          <h1 style={{ fontSize: 28, margin: "20px 0 12px" }}>Something went wrong.</h1>
          <p style={{ lineHeight: 1.6, opacity: 0.8 }}>
            This page could not be loaded. Please try again. If it keeps happening, email{" "}
            {CONTACT_EMAIL} and quote the reference below.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                padding: "0 20px",
                background: "transparent",
                color: "inherit",
                border: "1px solid rgba(244,244,241,0.35)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- full reload on purpose: the root layout (and router) failed */}
            <a href="/" style={{ color: "inherit", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
              Go to the homepage
            </a>
            {error.digest && (
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, opacity: 0.6 }}>
                Reference: {error.digest}
              </span>
            )}
          </div>
        </main>
      </body>
    </html>
  );
}
