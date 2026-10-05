import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 border-b border-neutral-200 pb-7 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f26a2e]">
          {eyebrow}
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-4xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>

      {action ? <div>{action}</div> : null}
    </header>
  );
}