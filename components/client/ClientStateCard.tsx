import type { ReactNode } from "react";

/*
 * The one layout for every non-content portal screen (access states, onboarding, the
 * workspace switcher, errors, not found): a centred white card with an icon, a short
 * title, the explanation and the actions. Same tokens as every other card.
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
      ? "bg-red-50 text-red-600"
      : tone === "signal"
        ? "cp-tint text-[#f26a2e]"
        : "bg-neutral-100 text-neutral-500";

  return (
    <div className="flex min-h-[60svh] items-center justify-center py-6 sm:py-10">
      <section className="cp-card w-full max-w-xl p-6 sm:p-8">
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconTone}`}
        >
          {icon}
        </span>

        <p className="cp-eyebrow mt-6">{eyebrow}</p>

        <h1 className="mt-2 text-[1.6rem] font-semibold leading-tight tracking-[-0.035em] text-neutral-950 sm:text-[1.85rem]">
          {title}
        </h1>

        {children ? (
          <div className="mt-3 space-y-3 text-sm leading-6 text-neutral-600">{children}</div>
        ) : null}

        {actions ? (
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">{actions}</div>
        ) : null}
      </section>
    </div>
  );
}
