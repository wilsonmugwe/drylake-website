import Link from "next/link";

import type { Crumb } from "@/lib/discovery/structured-data";

/* Visible breadcrumb trail; the matching BreadcrumbList JSON-LD comes from breadcrumbNode(). */
export default function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-black/60">
      <ol className="flex flex-wrap items-center gap-2">
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index < crumbs.length - 1 ? (
              <Link href={crumb.path} className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline">
                {crumb.name}
              </Link>
            ) : (
              <span aria-current="page" className="text-black">
                {crumb.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
