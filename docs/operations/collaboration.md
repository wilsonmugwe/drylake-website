# Collaborate With Drylake (/collaborate)

Public page and form for collaboration proposals (technology collaboration, product
development, business partnerships, pilots, integrations, research, supplier proposals).
Separate from customer enquiries (`/contact`) and the free consultation (`/consultation`).

## Owner setup (nothing here is applied by the pull request)

1. **Apply the migration** `supabase/migrations/20261016120000_collaboration_proposals.sql` to
   the production Supabase project (SQL editor or `supabase db push`). It is re-runnable. It
   creates `public.collaboration_proposals` with RLS on, no policies, and privileges for
   `service_role` only.
2. **Environment variables** (Vercel, Production). Both are optional:
   - `COLLABORATION_EMAIL_FROM`: sender for collaboration emails. If unset, mail goes out as
     `Drylake Partnerships <address of EMAIL_FROM>`. Set it only once a partnerships mailbox
     exists and is verified in Resend. Replies always go to `hello@drylake.com.au`.
   - `COLLABORATION_ABBICARE_ENABLED`: leave **unset** (off). See below.
3. `CONTACT_TO_EMAIL` (already set) receives the notification for each proposal.
4. Add the Turnstile hostname/action: no change needed. The form uses the existing site key and
   its own action (`collaboration`), so a contact-form token cannot be replayed here.

## The owner-gated project

An organisation named in an owner decision stays **hidden** until its owners give permission.
While `COLLABORATION_ABBICARE_ENABLED` is not exactly `true`, the name appears nowhere public:
not in the page HTML, JSON-LD, `llms.txt`, the sitemap, the RSC payload or any client
JavaScript, and the API rejects it as a project value. `tests/collaboration.test.mjs` and
`tests/e2e/collaborate.spec.ts` check this against a production build.

To enable it later: set the variable to `true` and redeploy (the flag is read when the page is
built). The page then adds a neutral section (a separate organisation; website technology,
e-commerce integrations, accessibility, catalogue systems, operational improvements, relevant
partnerships) and the project option. No partnership, endorsement or case study is claimed.
Existing rows for that project stay readable in admin whatever the flag says.

## Data and access

- Table: `collaboration_proposals` (name, organisation, email, category, project, summary,
  optional website, `consent_at` set by the server, status, internal notes, `updated_by`).
- Written only by `POST /api/collaboration` (service role). Read and updated only through
  `/admin/collaborations` and `POST /api/admin/collaborations/[id]`, both gated by the
  `platform_admins` allow-list. Internal notes are never selected on the list page and are
  never sent to the browser except to a platform admin.
- Admin changes write `collaboration.updated` to `audit_logs` (status before and after, and
  whether notes changed; never names, emails or note text).
- Status values: `new`, `under_review`, `contacted`, `accepted`, `declined`. `accepted` is an
  internal label, not an agreement.

## Submission path

size and type check, field rules, rate limit (5 per 10 minutes per address, per instance),
Turnstile (own action, replay protected), insert, then two emails sent together: the
notification to `CONTACT_TO_EMAIL` and an acknowledgement to the submitter that says plainly it
is not a partnership and gives no Drylake Workspace access. The row is written before any email, so a
Resend outage never loses a proposal; an email failure is logged (redacted) and does not fail
the request.

## Tests

- `node --conditions=react-server --test tests/collaboration.test.mjs`
- `bash tests/db/run-collaboration-db-tests.sh` (needs Docker; real Postgres 17)
- `E2E_SKIP_BUILD=1 RESEND_API_KEY= npx playwright test tests/e2e/collaborate.spec.ts`
