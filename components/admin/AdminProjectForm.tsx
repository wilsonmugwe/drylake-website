"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import AdminClientPicker, {
  type PickerClient,
} from "@/components/admin/AdminClientPicker";
import AdminDateInput from "@/components/admin/AdminDateInput";

/*
 * Create Project form, used from two places:
 *   - a client workspace: `organizationId` is fixed (client preselected), and
 *   - the global /admin/projects/new page: `clients` is passed and the admin searches
 *     for the client first.
 * Both post the same FormData (name, status, startDate, targetEndDate) to the existing
 * per-client endpoint /api/admin/clients/[organizationId]/projects, so the API contract
 * and its server-side validation are unchanged.
 */
type AdminProjectFormProps =
  | {
      mode: "client";
      organizationId: string;
      organizationStatus: string;
    }
  | {
      mode: "global";
      clients: PickerClient[];
      initialClientId?: string | null;
    };

type ApiResponse = {
  success?: boolean;
  projectId?: string;
  error?: string;
};

const INPUT_CLASS =
  "mt-3 min-h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-[#f26a2e] focus:ring-4 focus:ring-[#f26a2e]/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400";

export default function AdminProjectForm(props: AdminProjectFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState(false);
  const [startDate, setStartDate] = useState("");

  const [pickedClientId, setPickedClientId] = useState<string | null>(
    props.mode === "global" ? props.initialClientId ?? null : null
  );

  const organizationId =
    props.mode === "client" ? props.organizationId : pickedClientId;

  const inactive =
    props.mode === "client" && props.organizationStatus !== "ACTIVE";

  const noClients = props.mode === "global" && props.clients.length === 0;

  const locked = inactive || noClients;

  const cancelHref =
    props.mode === "client"
      ? `/admin/clients/${props.organizationId}`
      : "/admin/projects";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || locked) {
      return;
    }

    setError(null);

    if (!organizationId) {
      setClientError(true);
      setError("Choose the client this project belongs to.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const start = String(formData.get("startDate") ?? "").trim();
    const end = String(formData.get("targetEndDate") ?? "").trim();

    if (start && end && end < start) {
      setError("Target completion date cannot be before the start date.");
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
        result = (await response.json()) as ApiResponse;
      } catch {
        throw new Error("The server returned an unexpected response.");
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to create project.");
      }

      // Global flow lands on the new project; the client flow returns to the client.
      router.push(
        props.mode === "global" && result.projectId
          ? `/admin/projects/${result.projectId}`
          : `/admin/clients/${organizationId}`
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
      className="space-y-7 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8"
    >
      {inactive ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Projects cannot be created while this client is inactive.
        </div>
      ) : null}

      {noClients ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          There are no clients yet.{" "}
          <Link href="/admin/clients/new" className="font-semibold underline">
            Create a client
          </Link>{" "}
          first, then add their project.
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

          <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
        </div>
      ) : null}

      {props.mode === "global" ? (
        <AdminClientPicker
          clients={props.clients}
          value={pickedClientId}
          invalid={clientError}
          disabled={submitting || noClients}
          onChange={(clientId) => {
            setPickedClientId(clientId);
            setClientError(false);
            setError(null);
          }}
        />
      ) : null}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-neutral-900"
        >
          Project name
        </label>

        <p className="mt-1 text-sm text-neutral-500">
          A clear internal and client-facing name for the project.
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
          disabled={locked || submitting}
          className={INPUT_CLASS}
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
          disabled={locked || submitting}
          className={INPUT_CLASS}
        >
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On hold</option>
        </select>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <AdminDateInput
          id="startDate"
          name="startDate"
          label="Start date"
          disabled={locked || submitting}
          onChange={setStartDate}
        />

        <AdminDateInput
          id="targetEndDate"
          name="targetEndDate"
          label="Target completion date"
          min={startDate || undefined}
          disabled={locked || submitting}
        />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-[#f4f4f1] p-5">
        <p className="text-sm font-semibold text-neutral-900">
          Project progress
        </p>

        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Progress starts in automatic mode. Once milestones are added, Drylake
          calculates project progress from milestone completion. An
          administrator can override the calculated value later if required.
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-7 sm:flex-row sm:justify-end">
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-950"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={locked || submitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
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
