import type { ReactNode } from "react";

type AdminStatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon: ReactNode;
};

export default function AdminStatCard({
  label,
  value,
  detail,
  icon,
}: AdminStatCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f26a2e]/10 text-[#f26a2e]">
          {icon}
        </span>

        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400">
          {label}
        </span>
      </div>

      <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
        {value}
      </p>

      {detail ? (
        <p className="mt-1 text-xs text-neutral-500">{detail}</p>
      ) : null}
    </div>
  );
}