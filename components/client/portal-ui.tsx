import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { CONTACT_EMAIL } from "@/lib/site";

import { clampPercent, humanizeStatus } from "./format";

/*
 * Presentational primitives for the client portal, in the Admin design system: white
 * cards on the #f4f4f1 canvas, dark ink, grey secondary text, hairline borders, and
 * orange only for progress, active states and the primary action.
 */

type Tone = "signal" | "ok" | "alert" | "muted" | "neutral";

const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: "signal",
  IN_PROGRESS: "signal",
  OPEN: "signal",
  PLANNING: "neutral",
  NOT_STARTED: "neutral",
  PENDING: "neutral",
  COMPLETED: "ok",
  DELIVERED: "ok",
  PAID: "ok",
  OVERDUE: "alert",
  ON_HOLD: "muted",
  CANCELLED: "muted",
  VOID: "muted",
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";

  return (
    <span className="cp-pill" data-tone={tone}>
      <span aria-hidden="true" className="cp-pill-dot" />
      {humanizeStatus(status)}
    </span>
  );
}

export function ProgressBar({
  value,
  label,
  size = "sm",
}: {
  value: number;
  label: string;
  size?: "sm" | "lg";
}) {
  const percent = clampPercent(value);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={`cp-progress ${size === "lg" ? "h-2" : "h-1.5"}`}
    >
      <div className="cp-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

/*
 * Compact page heading. The title is sized for a dashboard, not a hero, so a long project
 * or organisation name wraps instead of taking over the screen.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  aside,
  back,
}: {
  eyebrow: ReactNode;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="pb-6 sm:pb-8">
      {back ? <div className="-ml-2 mb-3">{back}</div> : null}

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="cp-eyebrow truncate">{eyebrow}</p>

          <h1 className="mt-2 break-words text-[1.75rem] font-semibold leading-tight tracking-[-0.035em] text-neutral-950 sm:text-[2.1rem]">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>
          ) : null}

          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2.5">{meta}</div> : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  labelledBy,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  labelledBy: string;
  icon?: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className="cp-card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-neutral-200/80 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg cp-tint text-[#f26a2e]"
            >
              {icon}
            </span>
          ) : null}

          <div className="min-w-0">
            <h2 id={labelledBy} className="text-[0.95rem] font-semibold tracking-[-0.015em] text-neutral-950">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-5 text-neutral-500">{description}</p>
            ) : null}
          </div>
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}

/* Quiet stand-in for a metric whose query failed (the section below carries the error). */
export const UNAVAILABLE = (
  <span className="text-base font-medium tracking-normal text-neutral-400">Unavailable</span>
);

/* White metric card, the client-side twin of AdminStatCard. */
export function StatTile({
  label,
  value,
  detail,
  icon,
  accent,
  className = "",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  /* Optional visual below the value (a progress bar). */
  accent?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`cp-card min-w-0 p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="cp-label">{label}</p>

        {icon ? (
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg cp-tint text-[#f26a2e]"
          >
            {icon}
          </span>
        ) : null}
      </div>

      <p className="mt-4 break-words text-[1.6rem] font-semibold leading-none tracking-[-0.04em] text-neutral-950">
        {value}
      </p>

      {accent ? <div className="mt-4">{accent}</div> : null}

      {detail ? <p className="mt-2 text-xs leading-5 text-neutral-500">{detail}</p> : null}
    </div>
  );
}

/* Empty section: still looks intentional, says what will appear and when. */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-6 sm:px-6">
      {icon ? (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-[#fafaf8] text-neutral-400"
        >
          {icon}
        </span>
      ) : null}

      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-800">{title}</p>
        {children ? (
          <p className="mt-1 max-w-md text-sm leading-6 text-neutral-500">{children}</p>
        ) : null}
      </div>
    </div>
  );
}

/* One consistent failure message: what failed, and the two ways forward. */
export function ErrorState({ subject }: { subject: string }) {
  return (
    <div role="status" className="flex gap-3 px-5 py-5 sm:px-6">
      <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[#f26a2e]" />
      <p className="text-sm leading-6 text-neutral-600">
        We couldn&apos;t load {subject}. Refresh the page, or use Start a conversation (or write
        to <span className="break-all font-medium text-neutral-900">{CONTACT_EMAIL}</span>).
      </p>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-neutral-500 transition hover:bg-white hover:text-neutral-950"
    >
      <ArrowLeft aria-hidden="true" size={15} />
      {label}
    </Link>
  );
}

/* Label/value row used for invoice and project facts. */
export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="cp-label">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  );
}
