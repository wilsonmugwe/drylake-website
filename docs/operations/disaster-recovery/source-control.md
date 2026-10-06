# Source control assumptions

Checked with the GitHub API on 2026-10-06.

| Assumption | Status | Notes |
|---|---|---|
| Remote exists and is private | **True**: `wilsonmugwe/drylake-website`, private, default branch `main` | |
| More than one full copy exists | **True**: GitHub, Wilson's machine, Ben's WSL clone | Any clone can be pushed to a new remote |
| `main` is protected (PR required, no force push) | **False.** Branch protection returns 404 and rulesets need GitHub Pro for a private repo on a free account | The team convention (PRs reviewed by Wilson, never pushed straight to `main`) is the only control. W10: either upgrade to GitHub Pro (about US$4/month) and require a PR + passing checks on `main`, or accept and note it in `decisions.md` |
| Migrations committed | **False** (one migration) | `schema-as-code.md`, W2 |
| Production configuration represented in the repo | **Partly**: `vercel.json` (region), env var names (`scripts/env-registry.mjs`), CI workflows. Dashboard-only: Vercel firewall rules, Clerk settings, Stripe webhook endpoint/events, Supabase auth/RLS | Each is documented in its own recovery doc |
| No critical state only on one machine | **True for code.** Not true for env var values (Vercel only) or uploaded documents (Supabase Storage only) | `data-inventory.md` gaps |
| Collaborators | `wilsonmugwe` (owner), `MshikadauMgigi` | Ben has push access, not admin |

## Recovery

- **GitHub account or repo lost:** push any up-to-date clone to a new private repo, reconnect it
  in Vercel (Project > Settings > Git), re-add the two Actions workflows' secrets (none today).
- **Bad force push to `main`:** recover the previous head from any clone (`git reflog` there) or
  from the last Vercel production deployment's commit SHA, and push it back via PR.
