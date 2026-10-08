import { API_CATALOG_CONTENT_TYPE, apiCatalog } from "@/lib/discovery/api-catalog";

/* RFC 9727 API catalogue. Static: it only changes when lib/discovery/api-catalog.ts changes. */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(apiCatalog()), {
    headers: {
      "Content-Type": API_CATALOG_CONTENT_TYPE,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
