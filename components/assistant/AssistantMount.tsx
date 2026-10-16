/*
 * Server component rendered once in the root layout. When CHAT_ASSISTANT_ENABLED is not "true"
 * it renders NOTHING: no launcher, no markup, and no client JavaScript. The launcher is imported
 * INSIDE the enabled branch, behind a build-time constant, on purpose: any import reachable from
 * the root layout lands in its shared client chunk on every page whether or not it renders
 * (measured: +1,200 bytes on the homepage against the 204,800 byte budget). Env changes need a
 * redeploy on Vercel anyway, so the build-time flag costs nothing in practice.
 */
export default async function AssistantMount() {
  // Inlined at build by next.config.ts (see there); the dead branch below is then removed.
  if (process.env.ASSISTANT_LAUNCHER_BUILD !== "true") return null;

  const { default: AssistantLauncher } = await import("./AssistantLauncher");

  return <AssistantLauncher />;
}
