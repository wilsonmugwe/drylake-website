import { llmsText } from "@/lib/discovery/llms";

/* Static at build time: the content only changes when lib/discovery/entity.ts changes. */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsText(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
