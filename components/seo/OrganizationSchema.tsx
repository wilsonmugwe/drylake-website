import { siteGraph } from "@/lib/discovery/structured-data";

import JsonLd from "./JsonLd";

/*
 * Site-wide identity graph: Organization (#organization), WebSite (#website) and the
 * founders, built from lib/discovery/entity.ts. Every page's own graph references these @ids.
 */
export default function OrganizationSchema() {
  return <JsonLd nodes={siteGraph()} />;
}
