# Master programme: requirements traceability matrix (2026-10-16)

Source brief: "Master website improvement, security, brand identity, reviews and collaboration
programme" (owner, 2026-10-16). Audited against `main` at `9566302` (PRs #72 to #80 merged).
Companion: `docs/audit/2026-10-16-improvement-program-audit.md` (the original 10-PR programme).

Confidence: **HIGH** = read in code or measured; **MEDIUM** = inferred or vendor docs;
**NONE** = not established. Status: **Implemented / Partial / Missing**.

## 1. Owner decisions recorded 2026-10-16

| Decision | Answer |
|---|---|
| Joondalup | Permitted everywhere (landing page, directory, SEO). Banned: the residential street address in any form, and any statement placing the business physically in Joondalup (it is based in Perth). Enforced by #78 |
| Chatbot AI | **Claude via AWS Bedrock, Sydney (ap-southeast-2)** so chat text stays in Australia |
| Biographies | Owner will send verified details; bios unchanged until then |
| Abbicare | Hidden behind a server flag until Abbicare confirms permission in writing |
| Tagline | "See what lies beneath. Build what comes next." **approved** for the site |

Open owner question: the site names the founders **Benedict Wambugu** and **Wilson Mugwe**
(`components/sections/Founders.tsx`, Person JSON-LD); the brief names **Benedict Gathii** and
**Wilson Mugwe Gathii**. Nothing is renamed until the owner confirms the public names.

## 2. Mapping to the original 10-PR programme

The new workstreams extend the programme; no 13 parallel PRs.

| New workstream | Programme slot | PR(s) |
|---|---|---|
| WS1 brand story, WS8 FAQs | 7 (secondary pages) + 8 (homepage) | `drylake/brand-story-faqs` (in progress) |
| WS1.4 biographies | 7b (About) | blocked on owner details |
| WS2 security | 10 | **#79 merged** |
| WS3 privacy, WS4 cookies | 10 (trust) | `drylake/privacy-cookies` (in progress) |
| WS5 chatbot | new PR 11 | after FAQs (knowledge source) |
| WS6 reviews | new PR 13 | `drylake/review-requests` (queued after collaboration) |
| WS7 collaboration | new PR 12 | `drylake/collaborate` (in progress) |
| WS9 video + flyers | new PR 14 (assets/specs) | after brand story |
| WS10 SEO + AI | 4, 5, 6 | #75, #76 merged; PR 6 next |
| WS11 email senders | 3 (email polish) | after collaboration/reviews add their senders |
| WS12 UX + conversion | 8, 9 | #77 merged; perf fix `drylake/perf-home-js-budget` (in progress); PR 9 last |
| WS13 delivery | all | this matrix |

## 3. Traceability matrix

| # | Requirement | Status | Relevant files | Existing PR | Missing | Risk | Proposed change | Test criteria |
|---|---|---|---|---|---|---|---|---|
| 1.1 | Brand meaning visible | Missing (only a code comment, `components/sections/Production.tsx:30`) | `app/about/page.tsx` | none | name story, metaphor, philosophy | Low | About section + one short homepage block, tagline approved | copy present; hero still states websites/software/automation |
| 1.2 | Understand before recommending | Partial (`components/sections/Approach.tsx` 7 stages) | Approach.tsx | none | explicit "understand first" framing | Low | light reframe of stage 1-2 | stages unchanged, framing present |
| 1.3 | Visual identity (lakebed, cracks) | Missing | design tokens, `app/globals.css` | none | texture treatment | Low (LCP) | authored decorative SVG/CSS, aria-hidden, reduced-motion safe | homepage JS unchanged; Lighthouse after merge |
| 1.4 | Full biographies | Partial: role, focus, one degree each (`Founders.tsx:3-22`); no photos by design (`:56-57`) | Founders.tsx, `lib/discovery/entity.ts` | none | verified history | **Medium** (fabrication) | wait for owner details | only owner-supplied facts |
| 2.1 | Hosting protection, headers, CSP, CSRF, rate limits | Partial: HSTS, nosniff, frame denial, CSRF same-origin, Turnstile + replay; CSP still `'unsafe-inline' https:` (S-01) | `next.config.ts`, `proxy.ts`, `lib/security/*` | **#79** | strict CSP, Vercel Firewall rules | Medium | report-only CSP rollout (owner decision S-01) | security-audit test file, headers e2e |
| 2.2 | Supabase RLS + isolation | Partial: 3/3 consultation tables RLS; ~10 core tables not in migrations, **UNVERIFIED** (S-02) | `supabase/migrations`, `docs/security/rls-and-tenant-isolation.md` | #79 | prod inventory | **Medium, NONE** | owner runs `docs/security/sql/rls-inventory.sql`, commit baseline dump | inventory grid returned |
| 2.3 | AuthN/AuthZ | Implemented server-side on all 26 route handlers (classification test, #79) | `lib/auth/*` | #79 | Clerk MFA/session settings unverified (S-03) | **Medium, NONE** | owner checklist | route-auth test |
| 2.4 | Secrets + dependencies | gitleaks 215 commits clean; `npm audit --omit=dev` 0; Dependabot weekly | `.github/dependabot.yml` | #79, #80 | Dependabot alerts, secret scanning (repo settings, admin) | Medium | owner enables free alerts | n/a |
| 2.5 | Monitoring + IR | Partial: PII redaction (S-08), IR runbook | `lib/security/redact.ts`, `docs/security/incident-response.md` | #79 | alerting, uptime monitor (S-05) | Medium | free uptime monitor on `/api/health` | n/a |
| 3 | Privacy messaging | Partial: 12-section policy, OAIC, overseas disclosure; no retention periods (deliberate, `app/privacy/page.tsx:29`) | app/privacy | none | Security & Privacy page, APP 1.4 review | Medium | in progress | processor list single source; no unsupported claims |
| 4 | Cookie controls | Public pages set no cookies; analytics cookieless; Clerk cookies only on auth routes; Turnstile on forms | `components/analytics/SiteAnalytics.tsx`, `components/auth/ClerkScope.tsx` | none | preference control, analytics opt-out | Low | in progress; banner only if optional cookies are found | e2e: opt-out stops analytics requests |
| 5 | AI chatbot + escalation | Missing (no LLM dependency) | n/a | none | everything | **Medium** (invented answers, PII, cost) | PR 11 design below | prompt-injection, refusal and grounding tests |
| 6 | Reviews | Missing; fabrication banned in code (`lib/discovery/structured-data.ts:23`) | n/a | none | request workflow, consent, admin | Medium (ACL s18) | in queue | nothing renders without approved consented reviews |
| 7 | Collaboration | Missing | n/a | none | page, form, admin, email | Low | in progress, Abbicare flag off | Abbicare absent from HTML/JS when off |
| 8 | Explicit FAQs | Partial: 5 homepage + 17 service + 16 location; 9 of 22 required topics missing | `lib/faqs.ts`, `lib/discovery/services.ts` | none | /faq hub | Low | in progress | JSON-LD equals visible text |
| 9 | Video + flyers | Missing | n/a | none | scripts, storyboards, flyer specs | Low | PR 14 produces specs and scripts; media only where actually generated | captions + transcript present |
| 10 | Search + AI discoverability | Implemented for most surfaces | `lib/discovery/*` | #75, #76 | PR 6 monitoring, robots decision D-D | Low | PR 6 | discoverability-check |
| 11 | Sender identities | Partial: `CONTACT_EMAIL_FROM`, `CONSULTATION_EMAIL_FROM` exist; **invoices and Clerk client invitations send from raw `EMAIL_FROM`** (`lib/invoices/invoice-notifications.ts:243-248`, `app/api/clerk/webhook/route.ts:142-147`) | `lib/email/*`, `scripts/env-registry.mjs` | #71 | Billing/invitation display names; Feedback, Partnerships senders | Medium (trust, deliverability) | PR 3: `BILLING_EMAIL_FROM`, `INVITATION_EMAIL_FROM` with display-name fallbacks; only verified Resend domain addresses; reply-to an existing mailbox | sender-per-path unit test |
| 12 | Conversion + UX | Implemented nav, dropdown, footer hub (#77); **homepage JS 205,298 B over the 204,800 B budget on main** (header prefetches) | `tests/e2e/performance.spec.ts` | #77 | fix | Low (prod impact) / High (CI red) | in progress | perf spec green |

## 4. Chatbot design (PR 11), per owner decision

- **Model hosting:** Claude on Amazon Bedrock in **ap-southeast-2**, behind an `LLM_GATEWAY_PROVIDER`
  interface (`bedrock-sydney` implementation; swappable). Server-side only.
- **Knowledge:** answers only from a versioned knowledge pack built from `lib/faqs.ts`, service data,
  consultation rules and the privacy page; anything else gets "I don't know, here is how to reach a
  person". Every answer marks verified company facts versus general explanation.
- **Safety:** identifies as an AI assistant on open and in every escalation; input length cap;
  prompt-injection hardening (system prompt isolation, tool allowlist, no URL fetching); output schema
  validation; never asks for sensitive information; refuses pricing, timelines and commitments.
- **Escalation:** "Speak to a representative" and "Send an enquiry" create a real enquiry through the
  existing contact pipeline (Turnstile, rate limit, Resend to the inbox), with copy stating it is a
  message, not live chat. "Book a free consultation" opens the existing booking flow; no second
  booking system.
- **Cost:** per-IP and per-day caps, max tokens per answer, monthly spend cap in AWS Budgets, model
  routing (small model by default).
- **Privacy:** no transcript storage by default; if stored, retention stated on the Security & Privacy
  page; Bedrock does not use inputs for training [MEDIUM, AWS Bedrock data-protection docs].
- **Owner setup:** AWS account, Bedrock model access for the chosen Claude model in ap-southeast-2,
  an IAM user or role limited to `bedrock:InvokeModel` on that model, credentials in Vercel
  (`AWS_REGION=ap-southeast-2`, access key pair or OIDC), and an AWS Budgets alert.

## 5. Phase order

A security + privacy (#79 merged; privacy in progress) → B brand + FAQs (in progress) → C chatbot
(after FAQs) → D collaboration (in progress) then reviews → E promotional specs, email senders, PR 6,
PR 9 regression, PR 10 readiness report. Nothing is merged or deployed without owner approval.
