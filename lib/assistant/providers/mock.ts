/*
 * Deterministic provider for tests and e2e. Impossible to enable in production: getProvider()
 * refuses it when VERCEL_ENV=production, and this module re-checks on every call.
 *
 * Behaviour: reads the <chunk id="..."> ids the handler put in the prompt and answers from the
 * first one (basis "published"). Deliberately misbehaves on trigger words so e2e can prove the
 * server guards: "MOCK_PRICE" returns a made-up price, "MOCK_HTML" returns a script tag.
 */
import type { LlmGatewayProvider } from "../provider.ts";

export const mockProvider: LlmGatewayProvider = {
  name: "mock",
  async generate(request) {
    if (process.env.VERCEL_ENV === "production") return { ok: false, kind: "unavailable" };

    const ids = [...request.user.matchAll(/<chunk id="([^"]+)"/g)].map((m) => m[1]);
    const visitor = request.user.match(/<visitor_message[^>]*>\n([\s\S]*?)\n<\/visitor_message>/)?.[1] ?? "";

    if (visitor.includes("MOCK_PRICE")) {
      return { ok: true, output: { answer: "A website costs $4,000 and takes 3 weeks.", basis: "published", sources: ids.slice(0, 1), intent: null } };
    }
    if (visitor.includes("MOCK_HTML")) {
      return { ok: true, output: { answer: "<script>alert(1)</script>", basis: "general", sources: [], intent: null } };
    }
    if (visitor.toLowerCase().includes("book")) {
      return { ok: true, output: { answer: "You can book a free 30-minute consultation.", basis: "published", sources: ["consultation:rules"], intent: "open_booking" } };
    }
    if (ids.length === 0) {
      return { ok: true, output: { answer: "I don't know. I can pass your question to the team.", basis: "unknown", sources: [], intent: "open_enquiry" } };
    }
    return { ok: true, output: { answer: "Here is what Drylake publishes on that. Open the page below for the full answer.", basis: "published", sources: ids.slice(0, 1), intent: null } };
  },
};
