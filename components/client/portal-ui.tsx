import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { CONTACT_EMAIL } from "@/lib/site";

import { clampPercent, humanizeStatus } from "./format";

/*
 * Presentational primitives for Drylake Workspace (docs/design/2026-10-07-drylake-workspace.md).
 *
 * Light, restrained content surfaces on the app canvas: hierarchy comes from typography and
 * spacing, not from a grid of equal cards. Signal orange marks status and progress only; the
 * primary action is ink (white text, 19:1), so it reads on every light surface.
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

/* Status is always spelled out; the dot is decoration (never colour alone). */
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
 * Page heading. Sized for a product, not a hero: a long project or organisation name wraps
 * instead of taking over the screen. `summary` is the plain-language status line.
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
      {back ? <div className="-ml-2 mb-4">{back}</div> : null}

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="cp-eyebrow">{eyebrow}</p>

          <h1 className="cp-title mt-3 break-words">{title}</h1>

          {description ? (
            <p className="mt-3 max-w-2xl text-[0.95rem] leading-7 text-neutral-600">{description}</p>
          ) : null}

          {meta ? <div className="mt-4 flex flex-wrap items-center gap-2.5">{meta}</div> : null}
        </div>

        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </header>
  );
}

/* A titled section of a page. One white surface, a quiet header, its content. */
export function Panel({
  title,
  description,
  action,
  children,
  labelledBy,
  count,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  labelledBy: string;
  /* Optional item count shown beside the title. */
  count?: number;
  /* Accepted for compatibility; sections no longer carry icon tiles. */
  icon?: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className="cp-card min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-5 pb-3 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 id={labelledBy} className="cp-section-title">
            {title}
            {typeof count === "number" ? (
              <span className="ml-2 font-mono text-xs font-medium tabular-nums text-neutral-500">
                {count}
              </span>
            ) : null}
          </h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="border-t border-neutral-200/80">{children}</div>
    </section>
  );
}

/* Small text link used in section headers ("All billing"). 44px tall for touch. */
export function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="cp-text-link">
      {children}
    </Link>
  );
}

/*
 * Empty section: intentional, says what will appear here and when, and (where it helps)
 * offers the one real next step.
 */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div data-empty-state className="flex items-start gap-4 px-5 py-7 sm:px-6">
      {icon ? (
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app border border-dashed border-neutral-300 bg-canvas text-neutral-500"
        >
          {icon}
        </span>
      ) : null}

      <div className="min-w-0">
        <p className="text-sm font-semibold text-neutral-900">{title}</p>
        {children ? (
          <p className="mt-1 max-w-md text-sm leading-6 text-neutral-600">{children}</p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

/* One consistent failure message: what failed, and the two ways forward. */
export function ErrorState({ subject }: { subject: string }) {
  return (
    <div role="status" className="flex gap-3 px-5 py-5 sm:px-6">
      <AlertTriangle aria-hidden="true" size={16} className="mt-1 shrink-0 text-signal-ink" />
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
      className="inline-flex min-h-[44px] items-center gap-2 rounded-app px-2 text-sm font-medium text-neutral-600 transition hover:bg-white hover:text-neutral-950"
    >
      <ArrowLeft aria-hidden="true" size={15} />
      {label}
    </Link>
  );
}

/* Label/value pair used for invoice and project facts. */
export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="cp-label">{label}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium text-neutral-900">{value}</dd>
    </div>
  );
}

/*
 * A row of key figures in ONE band (not a grid of equal cards). The first figure leads; the
 * rest are supporting. Rendered as a description list.
 */
export function FigureBand({
  label,
  figures,
}: {
  label: string;
  figures: Array<{ label: string; value: ReactNode; detail?: ReactNode }>;
}) {
  return (
    <dl aria-label={label} className="cp-card cp-figures">
      {figures.map((figure, index) => (
        <div key={figure.label} className="cp-figure" data-lead={index === 0 ? "true" : undefined}>
          <dt className="cp-label">{figure.label}</dt>
          <dd className="cp-figure-value">{figure.value}</dd>
          {figure.detail ? <dd className="mt-1 text-xs leading-5 text-neutral-500">{figure.detail}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/* Quiet stand-in for a figure whose query failed (the section below carries the error). */
export const UNAVAILABLE = (
  <span className="text-base font-medium tracking-normal text-neutral-500">Unavailable</span>
);
