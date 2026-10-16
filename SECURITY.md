# Security policy

Drylake Pty Ltd publishes its security contact in the standard place:
[https://drylake.com.au/.well-known/security.txt](https://drylake.com.au/.well-known/security.txt)
(source: `public/.well-known/security.txt`).

## Reporting a vulnerability

Email **hello@drylake.com.au** with "Security" in the subject. Please include what you found,
where, and how to reproduce it. Do not include real customer data.

Please do not:

- test with other people's accounts or data;
- run automated scanners or load tests against production;
- publish details before we have had a reasonable chance to fix the issue.

We will acknowledge a report within 2 business days and tell you when it is fixed.

## Scope

The website at https://drylake.com.au, including the client portal and the admin area. Findings
in Clerk, Supabase, Stripe, Vercel, Resend or Cloudflare themselves should go to those vendors.

## For maintainers

- Security audit and remediation record: `docs/security/2026-10-16-security-audit.md`
- Incident response runbook: `docs/security/incident-response.md`
- Owner verification steps: `docs/security/manual-verification-checklist.md`
