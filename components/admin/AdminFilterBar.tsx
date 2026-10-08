"use client";

import { Loader2, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/*
 * URL-driven filter bar shared by the admin list pages.
 *
 * Contract: it only reads and writes query parameters (`q` for the text search plus one
 * parameter per select). The page is a Server Component that reads the same parameters
 * and filters in Supabase, so results are server-side, shareable and survive a refresh.
 * Text input is debounced; selects apply immediately.
 */
export type AdminFilterOption = {
  value: string;
  label: string;
};

export type AdminFilterSelect = {
  param: string;
  label: string;
  options: AdminFilterOption[];
  allLabel?: string;
};

type AdminFilterBarProps = {
  searchPlaceholder: string;
  searchLabel?: string;
  selects?: AdminFilterSelect[];
  resultCount?: number;
  resultNoun?: string;
};

const SEARCH_DEBOUNCE_MS = 300;
const MAX_QUERY_LENGTH = 100;

export default function AdminFilterBar({
  searchPlaceholder,
  searchLabel = "Search",
  selects = [],
  resultCount,
  resultNoun = "results",
}: AdminFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(currentQuery);
  const [syncedQuery, setSyncedQuery] = useState(currentQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the box in sync when the URL changes from outside (back button, Clear):
  // adjust state during render rather than in an effect.
  if (currentQuery !== syncedQuery) {
    setSyncedQuery(currentQuery);

    // Ignore our own debounced write (same text, maybe a trailing space still typed).
    if (currentQuery !== query.trim()) {
      setQuery(currentQuery);
    }
  }

  // Unmount only: drop a pending debounced URL write so leaving the page cannot rewrite the
  // next page's URL.
  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  function apply(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }

    const qs = next.toString();

    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function onQueryChange(value: string) {
    const trimmed = value.slice(0, MAX_QUERY_LENGTH);
    setQuery(trimmed);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      apply({ q: trimmed.trim() });
    }, SEARCH_DEBOUNCE_MS);
  }

  const activeSelects = selects.filter((select) => searchParams.get(select.param));
  const hasFilters = Boolean(currentQuery) || activeSelects.length > 0;

  function clearAll() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const cleared: Record<string, string> = { q: "" };

    for (const select of selects) {
      cleared[select.param] = "";
    }

    setQuery("");
    apply(cleared);
  }

  return (
    <div
      role="search"
      className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="admin-filter-q" className="sr-only">
            {searchLabel}
          </label>

          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
          />

          <input
            id="admin-filter-q"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();

                if (debounceRef.current) {
                  clearTimeout(debounceRef.current);
                }

                apply({ q: query.trim() });
              }
            }}
            placeholder={searchPlaceholder}
            autoComplete="off"
            maxLength={MAX_QUERY_LENGTH}
            className="min-h-11 w-full rounded-xl border border-neutral-200 bg-[#fbfbf9] py-2.5 pl-10 pr-10 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:bg-white focus:ring-4 focus:ring-[#f26a2e]/10"
          />

          {pending ? (
            <Loader2
              size={16}
              aria-hidden="true"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-neutral-400"
            />
          ) : null}
        </div>

        {selects.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-none">
            {selects.map((select) => (
              <div key={select.param} className="min-w-0 lg:w-48">
                <label
                  htmlFor={`admin-filter-${select.param}`}
                  className="sr-only"
                >
                  {select.label}
                </label>

                <select
                  id={`admin-filter-${select.param}`}
                  value={searchParams.get(select.param) ?? ""}
                  onChange={(event) =>
                    apply({ [select.param]: event.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-neutral-200 bg-[#fbfbf9] px-3.5 py-2.5 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:bg-white focus:ring-4 focus:ring-[#f26a2e]/10"
                >
                  <option value="">
                    {select.allLabel ?? `All ${select.label.toLowerCase()}`}
                  </option>

                  {select.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {hasFilters || typeof resultCount === "number" ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          <p aria-live="polite">
            {typeof resultCount === "number"
              ? `${resultCount} ${resultNoun}${hasFilters ? " match your filters" : ""}`
              : null}
          </p>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
            >
              <X size={13} aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
