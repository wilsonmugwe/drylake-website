"use client";

import {
  FormEvent,
  useState,
} from "react";
import {
  CalendarDays,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AdminProjectFormProps = {
  organizationId: string;
  organizationStatus: string;
};

type ApiResponse = {
  success?: boolean;
  projectId?: string;
  error?: string;
};

export default function AdminProjectForm({
  organizationId,
  organizationStatus,
}: AdminProjectFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const disabled =
    organizationStatus !== "ACTIVE";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submitting || disabled) {
      return;
    }

    setError(null);

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    const startDate =
      String(
        formData.get("startDate") ?? ""
      ).trim();

    const targetEndDate =
      String(
        formData.get("targetEndDate") ?? ""
      ).trim();

    if (
      startDate &&
      targetEndDate &&
      targetEndDate < startDate
    ) {
      setError(
        "Target end date cannot be before the start date."
      );

      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/clients/${organizationId}/projects`,
        {
          method: "POST",
          body: formData,
          credentials: "same-origin",
        }
      );

      let result: ApiResponse;

      try {
        result =
          (await response.json()) as ApiResponse;
      } catch {
        throw new Error(
          "The server returned an unexpected response."
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to create project."
        );
      }

      router.push(
        `/admin/clients/${organizationId}`
      );

      router.refresh();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to create project."
      );

      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {disabled ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Projects cannot be created while this
          client is inactive.
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-800">
            Project could not be created
          </p>

          <p className="mt-1 text-sm leading-6 text-red-700">
            {error}
          </p>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-neutral-900"
        >
          Project name
        </label>

        <p className="mt-1 text-sm text-neutral-500">
          A clear internal and client-facing name
          for the project.
        </p>

        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="off"
          placeholder="Website Redesign"
          disabled={
            disabled || submitting
          }
          className="mt-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
        />
      </div>

      <div>
        <label
          htmlFor="status"
          className="block text-sm font-semibold text-neutral-900"
        >
          Initial status
        </label>

        <p className="mt-1 text-sm text-neutral-500">
          You can change the project status later.
        </p>

        <select
          id="status"
          name="status"
          defaultValue="PLANNING"
          disabled={
            disabled || submitting
          }
          className="mt-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
        >
          <option value="PLANNING">
            Planning
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="ON_HOLD">
            On hold
          </option>
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="startDate"
            className="flex items-center gap-2 text-sm font-semibold text-neutral-900"
          >
            <CalendarDays
              size={15}
              className="text-neutral-400"
            />

            Start date
          </label>

          <p className="mt-1 text-sm text-neutral-500">
            Optional.
          </p>

          <input
            id="startDate"
            name="startDate"
            type="date"
            disabled={
              disabled || submitting
            }
            className="mt-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
          />
        </div>

        <div>
          <label
            htmlFor="targetEndDate"
            className="flex items-center gap-2 text-sm font-semibold text-neutral-900"
          >
            <CalendarDays
              size={15}
              className="text-neutral-400"
            />

            Target end date
          </label>

          <p className="mt-1 text-sm text-neutral-500">
            Optional.
          </p>

          <input
            id="targetEndDate"
            name="targetEndDate"
            type="date"
            disabled={
              disabled || submitting
            }
            className="mt-4 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100"
          />
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
        <p className="text-sm font-semibold text-neutral-900">
          Project progress
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Progress starts in automatic mode. Once
          milestones are added, Drylake calculates
          project progress from milestone completion.
          An administrator can override the calculated
          value later if required.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-7 sm:flex-row sm:justify-end">
        <Link
          href={`/admin/clients/${organizationId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            disabled || submitting
          }
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
              />

              Creating project...
            </>
          ) : (
            "Create Project"
          )}
        </button>
      </div>
    </form>
  );
}