import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
} from "lucide-react";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Project | Drylake",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

type ClientProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return "Not set";

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "Not published";

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ClientProjectPage({
  params,
}: ClientProjectPageProps) {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/client");
  }

  if (!orgId) {
    redirect("/client");
  }

  const { projectId } = await params;
  const supabase = createServerSupabaseClient();

  // ---------------------------------------------------------
  // Organisation
  //
  // RLS also enforces that this organisation matches the
  // active Clerk organisation.
  // ---------------------------------------------------------

  const { data: organization, error: organizationError } =
    await supabase
      .from("organizations")
      .select("id, name, status")
      .eq("clerk_org_id", orgId)
      .eq("status", "ACTIVE")
      .maybeSingle();

  if (organizationError) {
    console.error("Client organisation lookup failed:", {
      code: organizationError.code,
      message: organizationError.message,
    });

    throw new Error("Unable to load client organisation.");
  }

  if (!organization) {
    notFound();
  }

  // ---------------------------------------------------------
  // Project
  //
  // We explicitly constrain by organisation_id even though
  // RLS provides the primary tenant-isolation boundary.
  // ---------------------------------------------------------

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      `
        id,
        organization_id,
        name,
        status,
        progress_override,
        start_date,
        target_end_date
      `
    )
    .eq("id", projectId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (projectError) {
    console.error("Client project lookup failed:", {
      code: projectError.code,
      message: projectError.message,
    });

    throw new Error("Unable to load project.");
  }

  if (!project) {
    notFound();
  }

  // ---------------------------------------------------------
  // Milestones
  // ---------------------------------------------------------

  const { data: milestones, error: milestonesError } =
    await supabase
      .from("milestones")
      .select(
        `
          id,
          title,
          description,
          status,
          position,
          due_date,
          completed_at
        `
      )
      .eq("project_id", project.id)
      .order("position", { ascending: true });

  if (milestonesError) {
    console.error("Client milestones failed:", {
      code: milestonesError.code,
      message: milestonesError.message,
    });
  }

  // ---------------------------------------------------------
  // Published client updates only.
  //
  // The query intentionally applies the visibility conditions
  // in addition to the database RLS policy.
  // ---------------------------------------------------------

  const { data: updates, error: updatesError } =
    await supabase
      .from("project_updates")
      .select(
        `
          id,
          title,
          body,
          published_at,
          created_at
        `
      )
      .eq("project_id", project.id)
      .eq("visible_to_client", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false });

  if (updatesError) {
    console.error("Client project updates failed:", {
      code: updatesError.code,
      message: updatesError.message,
    });
  }

  const milestoneList = milestones ?? [];
  const updateList = updates ?? [];

  const completedMilestones = milestoneList.filter(
    (milestone) => milestone.status === "COMPLETED"
  ).length;

  const automaticProgress =
    milestoneList.length > 0
      ? Math.round(
          (completedMilestones / milestoneList.length) * 100
        )
      : 0;

  const displayedProgress =
    project.progress_override !== null
      ? project.progress_override
      : automaticProgress;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:px-12">
        <header className="border-b border-white/10 pb-6">
          <Link
            href="/client"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
        </header>

        <section className="py-12 sm:py-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f26a2e]">
            {organization.name}
          </p>

          <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
            {project.name}
          </h1>

          <span className="mt-5 inline-flex rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-white/50">
            {project.status.replaceAll("_", " ")}
          </span>
        </section>

        {/* Project overview */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-white/35">
              Progress
            </p>

            <p className="mt-5 text-4xl font-medium">
              {displayedProgress}%
            </p>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#f26a2e]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, displayedProgress)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <CalendarDays
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Start Date
            </p>

            <p className="mt-2 text-lg font-medium">
              {formatDate(project.start_date)}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.025] p-6">
            <Clock3
              size={19}
              className="text-[#f26a2e]"
            />

            <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/35">
              Target Completion
            </p>

            <p className="mt-2 text-lg font-medium">
              {formatDate(project.target_end_date)}
            </p>
          </div>
        </section>

        {/* Milestones */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
            <div>
              <h2 className="font-medium">
                Milestones
              </h2>

              <p className="mt-1 text-xs text-white/35">
                Project delivery checkpoints
              </p>
            </div>

            <span className="text-xs uppercase tracking-[0.15em] text-white/30">
              {completedMilestones}/{milestoneList.length} completed
            </span>
          </div>

          {milestonesError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load milestones.
              </p>
            </div>
          ) : milestoneList.length > 0 ? (
            milestoneList.map((milestone) => {
              const completed =
                milestone.status === "COMPLETED";

              return (
                <div
                  key={milestone.id}
                  className="flex gap-4 border-b border-white/10 px-6 py-5 last:border-b-0 sm:px-8"
                >
                  {completed ? (
                    <CheckCircle2
                      size={19}
                      className="mt-0.5 shrink-0 text-[#f26a2e]"
                    />
                  ) : (
                    <Circle
                      size={19}
                      className="mt-0.5 shrink-0 text-white/25"
                    />
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-medium">
                        {milestone.title}
                      </p>

                      <span className="text-[0.65rem] uppercase tracking-[0.1em] text-white/30">
                        {milestone.status.replaceAll("_", " ")}
                      </span>
                    </div>

                    {milestone.description ? (
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
                        {milestone.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs text-white/30">
                      {milestone.due_date
                        ? `Due ${formatDate(milestone.due_date)}`
                        : "No due date"}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <p className="text-sm text-white/40">
                No milestones have been published for this project yet.
              </p>
            </div>
          )}
        </section>

        {/* Updates */}
        <section className="mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025]">
          <div className="border-b border-white/10 px-6 py-5 sm:px-8">
            <h2 className="font-medium">
              Project Updates
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Latest updates from Drylake
            </p>
          </div>

          {updatesError ? (
            <div className="px-6 py-8 sm:px-8">
              <p className="text-sm text-red-400">
                Unable to load project updates.
              </p>
            </div>
          ) : updateList.length > 0 ? (
            updateList.map((update) => (
              <article
                key={update.id}
                className="border-b border-white/10 px-6 py-6 last:border-b-0 sm:px-8"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-medium">
                    {update.title}
                  </h3>

                  <span className="text-xs text-white/30">
                    {formatDateTime(update.published_at)}
                  </span>
                </div>

                <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-white/50">
                  {update.body}
                </p>
              </article>
            ))
          ) : (
            <div className="px-6 py-10 sm:px-8">
              <p className="text-sm text-white/40">
                No project updates have been published yet.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}