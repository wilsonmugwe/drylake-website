/*
 * How a client is identified to a Drylake admin when assigning work to it: by name and
 * primary contact email, never by an organisation id. PURE (tests/client-workspace.test.mjs).
 *
 * The admin picks a human-readable row; the form submits that row's organisation id
 * (loaded server-side from the organizations table), and the server stores it as
 * projects.organization_id. That relationship alone puts the project in the client's
 * portal: there is no second "link to portal" step.
 */

export type ClientIdentity = {
  name: string;
  contactEmail?: string | null;
};

/* "Acme Pty Ltd — alex@acme.com.au" (admin-only surface). Name alone when no contact. */
export function clientOptionLabel(client: ClientIdentity): string {
  const email = client.contactEmail?.trim();
  return email ? `${client.name} — ${email}` : client.name;
}

/* Search matches the client name or the primary contact email, case-insensitively. */
export function clientMatchesQuery(client: ClientIdentity, query: string): boolean {
  const term = query.trim().toLowerCase();

  if (!term) {
    return true;
  }

  return (
    client.name.toLowerCase().includes(term) ||
    (client.contactEmail ?? "").toLowerCase().includes(term)
  );
}
