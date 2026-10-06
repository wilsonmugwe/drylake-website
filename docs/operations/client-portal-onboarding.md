# Client portal onboarding and access (operations)

Last reviewed 2026-10-06.

## The model

Human-facing: email. Security: organisation membership.

```
Admin creates client (name, contact name, contact email)
  -> Clerk organisation + organizations row (clerk_org_id) + invitation to the email
Client accepts the invitation (or signs in with that verified email later)
  -> Clerk organisation membership (org:member)
Client signs in -> getClientWorkspace() (lib/auth/client-context.ts)
  -> membership -> active Clerk org -> organizations.clerk_org_id
  -> RLS re-read of the organisation with the client's Clerk token
  -> ready: dashboard. Projects and issued invoices appear by organization_id.
```

Nobody types, copies or sees an organisation id. An email address never grants access:
the only thing it does is let Clerk's verified owner of an address complete an invitation
a Drylake admin issued to that address.

## Workspace states (lib/auth/access.ts, decideClientWorkspace)

| State | Meaning | What the client sees |
|---|---|---|
| ready | ACTIVE client, membership, RLS accepted the token | the portal; empty states if there is no content yet |
| access-pending / activate-membership | member, session has no active org | auto-activates, reloads |
| access-pending / choose-membership | several workspaces | chooser |
| access-pending / accept-invitation | signed in without redeeming the invitation | auto-completes, activates, reloads |
| access-pending / not-linked | Clerk org with no Drylake row | "We are finishing your portal access" |
| access-pending / authorization-pending | RLS returned no row for a ready member | same; logs `client.org_rls_miss` |
| blocked | client INACTIVE or ARCHIVED | paused / closed |
| no-organisation | no membership, no pending invitation | "No client workspace on this account" |
| lookup-failed | Clerk or Supabase request failed, or no token | "We could not open your workspace" |

Projects, invoices, documents and updates never change the state.

## Audit actions

`CLIENT_INVITATION_ACCEPTED` is written when a signed-in user's pending invitation is
completed (`method: signed-in-completion`). If `audit_logs.action` has a CHECK constraint,
it must allow this value. Read-only check:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.audit_logs'::regclass and contype = 'c';
```

## Production acceptance

1. Admin: create Client A (name, contact name, contact email you can receive). Expect
   the "invitation sent" banner.
2. In a private window, open the invitation email and accept. Expect the client
   dashboard with "No active projects yet." (never a setup screen).
3. Admin: create Project A for Client A, picking "Client A — email". Reload the client
   dashboard: Project A is listed.
4. Admin: create Client B and Project B. Client A pasting `/client/projects/<B id>`
   gets not found.
5. Admin: issue a client-visible invoice for Client A. Client Billing lists it. Pasting
   a Client B invoice URL shows "Invoice unavailable."
6. Signed-in path: invite a second address, sign up at `/sign-up` WITHOUT the invitation
   link, with that same address. Expect "Connecting your workspace" then the dashboard.
7. Client: Start a conversation, send a message. Expect "Message sent" and the email in
   the CONTACT_TO_EMAIL inbox with "Signed-in Drylake account" rows. No mail app opens.
8. Vercel logs: no `client.org_rls_miss`, no `Client workspace resolution failed`.
