/*
 * API catalogue (RFC 9727) served at /.well-known/api-catalog. PURE (tests import it).
 *
 * Lists ONLY what exists: the public health endpoint (app/api/health) as the status link and
 * llms-full.txt (app/llms-full.txt) as the service documentation. Drylake has no public
 * partner API yet; add one here only when it is live and documented.
 */

import { SITE_URL } from "./entity.ts";

export const API_CATALOG_CONTENT_TYPE =
  'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"';

export function apiCatalog() {
  return {
    linkset: [
      {
        anchor: `${SITE_URL}/api/`,
        status: [{ href: `${SITE_URL}/api/health` }],
        "service-doc": [{ href: `${SITE_URL}/llms-full.txt`, type: "text/plain" }],
      },
    ],
  };
}
