import { llmsFullText } from "@/lib/discovery/llms";

/* Static at build time: generated from lib/discovery/services.ts, the same source as the pages. */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFullText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
