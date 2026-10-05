"use client";

import { CalendarDays } from "lucide-react";
import { useRef } from "react";

/*
 * The one date field for every admin form.
 *
 * Contract: it is a native <input type="date"> under the hood, so the submitted value is
 * always YYYY-MM-DD under the `name` the caller passes. API field names and server-side
 * validation therefore stay exactly as they were. The native control keeps the platform
 * date picker on iOS and Android and full keyboard entry on desktop; the button opens the
 * picker where the browser supports showPicker().
 */
type AdminDateInputProps = {
  id: string;
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | null;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
};

type PickerInput = HTMLInputElement & { showPicker?: () => void };

export default function AdminDateInput({
  id,
  name,
  label,
  hint,
  defaultValue,
  min,
  max,
  required,
  disabled,
  onChange,
}: AdminDateInputProps) {
  const inputRef = useRef<PickerInput>(null);
  const hintId = hint ? `${id}-hint` : undefined;

  function openPicker() {
    const input = inputRef.current;

    if (!input || disabled) {
      return;
    }

    try {
      input.showPicker?.();
    } catch {
      // showPicker throws without a user gesture in some browsers; focusing still lets
      // the user type the date or open the native picker themselves.
    }

    input.focus();
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-neutral-900"
      >
        {label}
        {required ? null : (
          <span className="ml-1.5 font-normal text-neutral-400">
            (optional)
          </span>
        )}
      </label>

      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-neutral-500">
          {hint}
        </p>
      ) : null}

      <div className="relative mt-3">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="date"
          defaultValue={defaultValue ?? undefined}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          aria-describedby={hintId}
          onChange={(event) => onChange?.(event.target.value)}
          className="admin-date-input min-h-11 w-full rounded-xl border border-neutral-200 bg-white py-3 pl-4 pr-12 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
        />

        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-neutral-400 transition hover:text-[#f26a2e] focus-visible:text-[#f26a2e] disabled:cursor-not-allowed disabled:hover:text-neutral-400"
        >
          <CalendarDays size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
