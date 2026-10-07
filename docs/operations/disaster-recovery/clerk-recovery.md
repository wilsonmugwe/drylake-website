# Clerk recovery

## What lives where

| Data | In Clerk only | In Supabase | Link |
|---|---|---|---|
| User accounts, emails, password hashes, MFA, sessions | Yes | No | Clerk `user_id` appears in `audit_logs.actor` style fields and `platform_admins` |
| Organisations (one per client) | Yes | `organizations` row per client | `organizations.clerk_org_id`; Clerk org private metadata holds the Supabase org id |
| Memberships (who belongs to which client) | **Yes, only Clerk** | No | Resolved at request time by `getClientWorkspace()` |
| Invitations (pending, 14-day expiry) | Yes | Audit rows `CLIENT_INVITATION_SENT` / `ACCEPTED` | Resend from Admin |
| Active organisation per session | Yes (session claim) | No | |
| Admin rights | No | `platform_admins` (by Clerk user id) | |

## Export

- **Users:** Clerk dashboard > Settings > User exports > Export users (CSV, includes hashed
  passwords), or the Backend API `getUserList()`. Source: https://clerk.com/docs/deployments/exporting-users
- **Organisations and memberships:** not in the CSV. List them with the Backend API
  (`organizations.getOrganizationList`, `getOrganizationMembershipList`). At current size the
  list is short enough to keep as a monthly note in the encrypted backup folder (W5).

## Scenarios

- **Clerk outage:** sign-in and portal stop; the public site keeps working (Clerk is only
  checked on protected routes). Nothing to restore; wait, and say so on the contact page if long.
- **Organisation deleted by mistake:** create a new Clerk organisation, update
  `organizations.clerk_org_id` for that client (one row, by an admin, audited), resend the
  invitation. Data in Supabase is untouched because it is keyed by our org id, not Clerk's.
- **Clerk instance lost or migrated:** users must re-register (or import from the CSV with
  password hashes via Clerk's migration tooling), organisations are re-created from
  `organizations`, `clerk_org_id` updated, invitations resent, `platform_admins` updated to new
  user ids. Expect one working day.
- **Admin locked out:** a second admin in `platform_admins` (W7) can act; otherwise insert the new
  user id directly in Supabase as the account owner.
