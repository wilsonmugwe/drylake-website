"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import ClientStateCard from "@/components/client/ClientStateCard";
import MessageDrylake from "@/components/client/MessageDrylake";

/*
 * Portal error boundary. Renders inside the persistent frame (navigation stays usable)
 * and never shows the error message or stack: only Next's opaque digest, so the client
 * can quote it and Drylake can find the server log line.
 */
export default function ClientPortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // The server already logged the detail; this marks it in the browser console only.
    console.error("Workspace render failed", { digest: error.digest ?? null });
  }, [error]);

  return (
    <ClientStateCard
      icon={<AlertTriangle size={20} />}
      tone="alert"
      eyebrow="Something went wrong"
      title="This page could not load."
      actions={
        <>
          <button
            type="button"
            disabled={retrying}
            onClick={() => {
              setRetrying(true);
              reset();
            }}
            className="cp-button-primary min-h-12 sm:min-w-[160px]"
          >
            <RotateCcw aria-hidden="true" size={15} className={retrying ? "animate-spin" : undefined} />
            {retrying ? "Trying again..." : "Try again"}
          </button>
          <Link href="/client" className="cp-button-secondary min-h-12 sm:min-w-[160px]">
            <ArrowLeft aria-hidden="true" size={15} />
            Overview
          </Link>
          <MessageDrylake variant="cta" />
        </>
      }
    >
      <p>
        Your workspace and its records are safe. Try again, or start a conversation and we will
        look into it.
      </p>
      {error.digest ? (
        <p className="text-xs text-neutral-600">
          Reference: <span className="font-mono text-neutral-700">{error.digest}</span>
        </p>
      ) : null}
    </ClientStateCard>
  );
}
