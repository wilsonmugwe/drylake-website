"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import SystemScreen from "@/components/system/SystemScreen";

/*
 * Branded fallback for unexpected render errors. Shows only the opaque digest as a
 * reference (safe to show: it is a hash, not the message or stack), never error details.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SystemScreen
      code="ERROR"
      title="Something went wrong."
      description="This page could not be loaded. Please try again. If it keeps happening, contact us and quote the reference below."
    >
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[44px] items-center gap-2 border border-white/18 px-5 text-sm font-semibold text-white/75 transition-colors hover:border-white/35 hover:text-white"
        >
          <RotateCcw size={15} />
          Try again
        </button>

        {error.digest && (
          <span className="font-mono text-xs text-white/55">
            Reference: {error.digest}
          </span>
        )}
      </div>
    </SystemScreen>
  );
}
