import type { ReactNode } from "react";

/*
 * The one layout for every non-content Workspace screen (access states, onboarding, the
 * workspace switcher, errors, not found): a centred card with a status line, a short title,
 * the explanation and the actions. The tone is carried by the icon AND the eyebrow text,
 * never by colour alone.
 */
export default function ClientStateCard({
  icon,
  eyebrow,
  title,
  children,
  actions,
  tone = "neutral",
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "signal" | "alert";
}) {
  const iconTone =
    tone === "alert"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "signal"
        ? "border-signal/30 bg-signal/10 text-signal-ink"
        : "border-neutral-200 bg-canvas text-neutral-600";

  return (
    <div className="flex min-h-[60svh] items-center justify-center py-6 sm:py-10">
      <section className="cp-card cp-state w-full max-w-xl overflow-hidden" data-tone={tone}>
        <div className="p-6 sm:p-9">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className={`flex h-10 w-10 items-center justify-center rounded-app border ${iconTone}`}
            >
              {icon}
            </span>
            <p className="cp-eyebrow">{eyebrow}</p>
          </div>

          <h1 className="cp-title mt-6 text-[1.6rem] sm:text-[1.9rem]">{title}</h1>

          {children ? (
            <div className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">{children}</div>
          ) : null}
        </div>

        {actions ? (
          <div className="flex flex-col gap-2.5 border-t border-neutral-200/80 bg-canvas/60 px-6 py-5 sm:flex-row sm:flex-wrap sm:px-9">
            {actions}
          </div>
        ) : null}
      </section>
    </div>
  );
}
