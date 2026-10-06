# RLS and tenant isolation

## What the repo can and cannot prove

**Can prove (and tests do):** every client surface resolves the workspace from the Clerk
session through one resolver; every client query adds an explicit `organization_id` filter;
the resolver ignores rows outside the user's Clerk memberships; drafts, hidden documents and
unpublished updates are filtered in code; admin pages and routes authorise before the
service role runs; email addresses never grant access.

**Cannot prove:** what the database itself enforces. RLS policies, grants,
`current_clerk_org_id()` and the invoice-numbering function exist only in Supabase (one
migration is committed). Until `sql/rls-inventory.sql` is run and its results match the
expected matrix below, database-layer isolation is **asserted, not verified**.

## Table inventory and expected policy matrix

"Client" = the `authenticated` role carrying a Clerk token whose org claim maps to the row's
organisation. "Service" = server-side service-role client (bypasses RLS, used only after the
checks in service-role-audit.md).

| Table | Holds | Read by client (RLS) | Expected SELECT | Expected INSERT / UPDATE / DELETE for client | anon |
|---|---|---|---|---|---|
| `organizations` | client companies | yes (workspace verify, checkout) | own row only (`clerk_org_id = current_clerk_org_id()`) | none | none |
| `projects` | projects | yes | own organisation's projects | none | none |
| `milestones` | project milestones | yes | milestones of own projects | none | none |
| `documents` | document metadata | yes (download, project page) | own projects AND `visible_to_client = true` (code also filters) | none | none |
| `project_updates` | updates | yes | own projects AND published + visible (code also filters) | none | none |
| `invoices` | invoices | yes | own organisation AND `status <> 'DRAFT'` AND `visible_to_client` (code also filters) | none (PAID is written only by the webhook via service role) | none |
| `invoice_notifications` | email send log | no | none | none | none |
| `audit_logs` | append-only audit | no | none | none | none |
| `platform_admins` | admin allow-list | no | none (service role reads it) | none | none |
| `turnstile_token_claims` | spent Turnstile tokens | no | none | none | none |
| storage `client-documents` | uploaded files | no (signed URLs only) | none; bucket `public = false` | none | none |

**Status of each row: UNVERIFIED** until Wilson returns the SQL results. Any of the
following in the results is a finding to fix before more clients are onboarded:
- `rls_enabled = false` on any table above;
- any grant to `anon` on a client-data table;
- any client INSERT / UPDATE / DELETE policy on the tables above;
- a policy keyed on a column rather than `current_clerk_org_id()`;
- `client-documents` bucket `public = true`, or a storage policy granting `authenticated` reads;
- a SECURITY DEFINER function executable by `anon`.

Do not weaken any policy to make a check pass. If a policy is wrong, the fix is a migration
reviewed in its own PR.

## Inactive and archived organisations

The application refuses INACTIVE and ARCHIVED clients in the resolver
(`isClientOperational`) and checkout requires `status = 'ACTIVE'`. Whether RLS also refuses
them is part of the SQL check (look for `status` in the organisations policy). Recommended,
not required: an RLS condition `status = 'ACTIVE'` so a direct API call with a valid token
for an archived client also returns nothing.

## Tenant-isolation tests

Automated (run on every `npm test`):

| Test file | Proves |
|---|---|
| `tests/tenant-isolation.test.mjs` | resolver never yields another tenant's workspace even when passed its rows; every admin page and route has its own check; client surfaces resolve from the session and never take an org id from the URL |
| `tests/invoice-payment-flow.test.mjs` | a member of Acme resolves to Acme only; Beta's issued invoice is not found for Acme; drafts and hidden invoices are invisible |
| `tests/security-hardening.test.mjs` | admin checks precede input parsing and service-role use; service role confined; PAID written in one place |

What these cannot do is run a real Postgres query with Client A's token against Client B's
UUID. That is the production step S4 in
[production-security-acceptance.md](production-security-acceptance.md), using two test
client workspaces and each other's real record IDs. PR 3 proposes a scratch database so this
can become automated.
