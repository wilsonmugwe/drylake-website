import { robotsGroups, robotsText } from "@/lib/discovery/crawlers";
import { PRIVATE_PREFIXES, SITE_URL } from "@/lib/discovery/entity";

/*
 * Renders robotsGroups(PRIVATE_PREFIXES) (lib/discovery/crawlers.ts), the same data the tests
 * evaluate with an RFC 9309 matcher, plus the Content-Signal line in the "*" group. Search
 * engines, AI search crawlers, user fetchers and Google-Extended use the "*" group (whole
 * public site, private surfaces disallowed); model-training tokens get "Disallow: /".
 *
 * A route handler rather than app/robots.ts because MetadataRoute.Robots cannot emit the
 * Content-Signal directive. robotsText keeps the output otherwise identical to what Next rendered.
 *
 * No trailing slashes on the private prefixes: "Disallow: /client/" does not match "/client"
 * itself. Private pages also send noindex (meta + X-Robots-Tag); robots.txt is not access control.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(robotsText(robotsGroups(PRIVATE_PREFIXES), `${SITE_URL}/sitemap.xml`), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
