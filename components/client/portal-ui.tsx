import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { CONTACT_EMAIL } from "@/lib/site";

import { clampPercent, humanizeStatus } from "./format";

/*
 * Small presentational primitives for the client portal. Square-ish, hairline-bordered,
 * orange used only as a signal, matching the public drylake.com.au system.
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
      className={`cp-progress ${size === "lg" ? "h-1.5" : "h-1"}`}
    >
      <div className="cp-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  aside,
}: {
  eyebrow: ReactNode;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-8 pb-10 pt-10 sm:pt-14 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 max-w-3xl">
        <div className="section-label flex items-center gap-3 text-white/55">
          <span
            aria-hidden="true"
            className="signal-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#f26a2e]"
          />
          <span className="min-w-0 truncate">{eyebrow}</span>
        </div>

        <h1 className="mt-5 break-words text-[clamp(2.4rem,9vw,4.6rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
          {title}
        </h1>

        {description ? (
          <p className="mt-5 max-w-[38rem] text-[0.95rem] leading-7 text-white/60">
            {description}
          </p>
        ) : null}

        {meta ? <div className="mt-5 flex flex-wrap items-center gap-3">{meta}</div> : null}
      </div>

      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  labelledBy,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  labelledBy: string;
}) {
  return (
    <section aria-labelledby={labelledBy} className="cp-panel min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-white/[0.08] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={labelledBy} className="text-[0.98rem] font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-white/50">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {children}
    </section>
  );
}

/* Quiet stand-in for a stat whose query failed (the panel below carries the error message). */
export const UNAVAILABLE = (
  <span className="text-base font-medium tracking-normal text-white/60">Unavailable</span>
);

export function StatTile({
  label,
  value,
  detail,
  className = "",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`cp-stat min-w-0 ${className}`}>
      <p className="tech-label text-white/50">{label}</p>
      <p className="mt-4 break-words text-[1.9rem] font-semibold leading-none tracking-[-0.05em] sm:text-[2.2rem]">
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs leading-5 text-white/55">{detail}</p> : null}
    </div>
  );
}

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
    <div className="px-5 py-8 sm:px-6">
      {icon ? (
        <div className="mb-4 flex h-9 w-9 items-center justify-center border border-white/[0.1] text-white/50">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-white/85">{title}</p>
      {children ? (
        <p className="mt-1.5 max-w-md text-sm leading-6 text-white/55">{children}</p>
      ) : null}
    </div>
  );
}

/* One consistent failure message: what failed, and the two ways forward. */
export function ErrorState({ subject }: { subject: string }) {
  return (
    <div role="status" className="flex gap-3 px-5 py-6 sm:px-6">
      <AlertTriangle
        aria-hidden="true"
        size={16}
        className="mt-0.5 shrink-0 text-[#f26a2e]"
      />
      <p className="text-sm leading-6 text-white/65">
        We couldn&apos;t load {subject}. Refresh the page, or use Start a conversation at the top
        of the page (or write to <span className="break-all text-white">{CONTACT_EMAIL}</span>).
      </p>
    </div>
  );
}
