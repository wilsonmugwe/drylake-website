import { clientIp, verifyTurnstile } from "@/lib/contact/turnstile";
import { ASSISTANT_ACTION } from "@/lib/contact/turnstile-action";
import { createAssistantState, handleAssistant, type HumanCheck } from "@/lib/assistant/handler";
import { getProvider } from "@/lib/assistant/provider";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/*
 * AI chat assistant endpoint. Thin wiring only: every rule lives in lib/assistant/handler.ts.
 * Returns 404 unless CHAT_ASSISTANT_ENABLED=true. Session start needs a Turnstile token (action
 * "assistant", single use via the shared replay table, like the contact form).
 */
const state = createAssistantState(process.env);

async function verifyHuman(token: string, ip: string | null): Promise<HumanCheck> {
  let claimStore: ReturnType<typeof createAdminSupabaseClient> | null = null;

  try {
    claimStore = createAdminSupabaseClient();
  } catch {
    console.error("Turnstile: Supabase not configured; assistant token replay check is per-instance only.");
  }

  const verdict = await verifyTurnstile(token, ip, claimStore, ASSISTANT_ACTION);

  if (verdict.ok) return "ok";
  return verdict.reason === "misconfigured" || verdict.reason === "unreachable" ? "unavailable" : "rejected";
}

export async function POST(request: Request) {
  try {
    return await handleAssistant(request, {
      env: process.env,
      state,
      getProvider: () => getProvider(process.env),
      verifyHuman,
      ip: clientIp,
    });
  } catch (error) {
    // Class only: the message could echo visitor words.
    console.error("Assistant route failed:", error instanceof Error ? error.name : typeof error);
    return Response.json({ error: "Unable to process your message." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
