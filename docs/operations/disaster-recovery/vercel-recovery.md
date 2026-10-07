# Vercel recovery

Source: https://vercel.com/docs/instant-rollback (read 2026-10-06).

## Roll back a bad deployment

- Dashboard: Project > Production Deployment tile > **Instant Rollback**, pick the last good
  deployment, confirm. Takes effect immediately.
- Pro/Enterprise can roll back to any deployment that was ever production; **Hobby only to the
  immediately previous one**. Confirm the plan (W8).
- A rollback reuses the old build **and its environment variables at build time**; it does not
  pick up env changes made since.
- **After a rollback, Vercel stops auto-assigning production.** New pushes to `main` will NOT go
  live until someone clicks **Undo Rollback** or runs `vercel promote <deployment-url>`. Write
  this on the incident note so the fix deploy is not silently ignored.

## Redeploy

- From Git: revert the bad commit on `main` (PR, review, merge); Vercel builds it.
- From the dashboard: Deployments > a good deployment > Redeploy (optionally without build cache).

## Domains

`drylake.com.au` (apex A record `216.198.79.1`) and `www` (CNAME to a `vercel-dns-017.com` host,
308 to apex) are configured in Vercel > Project > Domains and at Synergy DNS
(`dns-and-domain-recovery.md`). If the project were re-created, add both domains, then copy the
records Vercel shows into Synergy.

## Environment variables

- Names, exposure and purpose: `scripts/env-registry.mjs`. Audit any environment with
  `vercel env pull .env.check --environment=production && node scripts/check-env.mjs .env.check`
  (prints names only), then delete `.env.check`.
- Values are not stored anywhere else on purpose. If lost, reissue at each vendor
  (`secrets-recovery-inventory.md`), set them in Vercel, redeploy.
- Region: `vercel.json` pins functions to `syd1`; `tests/deploy-region.test.mjs` guards it.

## Build or deploy failure

1. Read the build log in Vercel (most failures are type errors or a missing env var at build).
2. Reproduce locally: `npm ci && npm test && npx tsc --noEmit && npm run build`.
3. Production keeps serving the last good deployment while a build fails; there is no outage
   unless someone promotes a broken build.
