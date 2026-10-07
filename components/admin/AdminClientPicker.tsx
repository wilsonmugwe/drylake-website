"use client";

import { Building2, Check, ChevronsUpDown, Search } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

import { clientMatchesQuery, clientOptionLabel } from "@/lib/clients/display";

/*
 * Accessible searchable client selector (WAI-ARIA combobox + listbox).
 *
 * The client list is loaded on the server by the page and passed in, so search is
 * instant and needs no extra API. Inactive clients are listed but cannot be chosen,
 * matching the existing rule that projects cannot be created for inactive clients.
 */
export type PickerClient = {
  id: string;
  name: string;
  status: string;
  /* Primary contact (organizations.billing_email); shown so two similar names differ. */
  contactEmail?: string | null;
};

type AdminClientPickerProps = {
  clients: PickerClient[];
  value: string | null;
  onChange: (clientId: string | null) => void;
  disabled?: boolean;
  invalid?: boolean;
};

const MAX_VISIBLE = 50;

export default function AdminClientPicker({
  clients,
  value,
  onChange,
  disabled,
  invalid,
}: AdminClientPickerProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;

  const selected = clients.find((client) => client.id === value) ?? null;

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const list = clients.filter((client) => clientMatchesQuery(client, query));

    return list.slice(0, MAX_VISIBLE);
  }, [clients, query]);

  function choose(client: PickerClient) {
    if (client.status !== "ACTIVE") {
      return;
    }

    onChange(client.id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (open && matches[activeIndex]) {
        event.preventDefault();
        choose(matches[activeIndex]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const activeOptionId =
    open && matches[activeIndex] ? `${listId}-${matches[activeIndex].id}` : undefined;

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-neutral-900"
      >
        Client
      </label>

      <p className="mt-1 text-sm text-neutral-500">
        Search by client name or primary contact email. The project appears in that client&apos;s Workspace automatically.
      </p>

      {selected && !open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-neutral-950 outline-none transition hover:border-neutral-300 focus-visible:border-[#f26a2e] focus-visible:ring-4 focus-visible:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
          aria-label={`Client: ${clientOptionLabel(selected)}. Change client`}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Building2 size={16} className="shrink-0 text-[#f26a2e]" aria-hidden="true" />
            <span className="truncate font-semibold">{clientOptionLabel(selected)}</span>
          </span>

          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500">
            Change
            <ChevronsUpDown size={14} aria-hidden="true" />
          </span>
        </button>
      ) : (
        <div className="relative mt-3">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-[22px] -translate-y-1/2 text-neutral-400"
          />

          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            aria-invalid={invalid || undefined}
            autoComplete="off"
            disabled={disabled}
            value={query}
            placeholder={clients.length ? "Search name or email" : "No clients yet"}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Let a click on an option land before the list closes.
              setTimeout(() => setOpen(false), 120);
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={`min-h-11 w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 ${
              invalid ? "border-red-300" : "border-neutral-200"
            }`}
          />

          {open ? (
            <ul
              id={listId}
              role="listbox"
              aria-label="Clients"
              className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
            >
              {matches.length === 0 ? (
                <li className="px-3 py-3 text-sm text-neutral-500">
                  No clients match &ldquo;{query.trim()}&rdquo;.
                </li>
              ) : (
                matches.map((client, index) => {
                  const inactive = client.status !== "ACTIVE";
                  const isSelected = client.id === value;

                  return (
                    <li
                      key={client.id}
                      id={`${listId}-${client.id}`}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={inactive || undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choose(client)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${
                        index === activeIndex ? "bg-neutral-100" : ""
                      } ${inactive ? "cursor-not-allowed text-neutral-400" : "text-neutral-900"}`}
                    >
                      <span className="truncate">{clientOptionLabel(client)}</span>

                      {inactive ? (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                          Inactive
                        </span>
                      ) : isSelected ? (
                        <Check size={15} className="shrink-0 text-[#f26a2e]" aria-hidden="true" />
                      ) : null}
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
