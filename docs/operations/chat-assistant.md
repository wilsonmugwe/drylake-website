# AI chat assistant runbook

Workstream 5. A floating chat on the public site that answers from an approved knowledge pack and
hands people to the existing enquiry form and consultation booking. It ships **switched off**.

Status when merged: no AWS account exists yet, so real Bedrock has never been called. **Guided mode
(below) needs no AWS account and can go live first.** Everything below "Owner setup" is the checklist
for the Bedrock (AI) mode.

## What it is

| Part | Where |
|---|---|
| Launcher (the only code in the page's JavaScript, and only when built in) | `components/assistant/AssistantLauncher.tsx` |
| Chat dialog, lazy loaded on hover, focus or click | `components/assistant/AssistantPanel.tsx`, `AssistantEscalationForm.tsx` |
| API: `POST /api/assistant` (`start` then `message`) | `app/api/assistant/route.ts`, `lib/assistant/handler.ts` |
| Model gateway interface and implementations | `lib/assistant/provider.ts`, `providers/{bedrock-sydney,mock}.ts` |
| Sovereignty guard on the model id | `lib/assistant/model-id.ts` |
| Knowledge pack and retrieval | `lib/assistant/knowledge.ts`, `retrieve.ts` |
| Output checks (the guards that matter) | `lib/assistant/schema.ts` |

Flow: the visitor passes Turnstile once to start a session (HMAC token, 30 minutes). Each message is
checked (length, sensitive-data screen, limits), matched against the pack, sent to the model with the
pack excerpts, and the model's reply is validated before it is shown. "Send an enquiry" and "Speak to
a representative" post to the existing `/api/contact` pipeline with `source: "assistant"`. "Book a free
consultation" links to `/consultation`. No transcript is stored by Drylake.

## Guided mode: go live without an AI provider

`LLM_GATEWAY_PROVIDER=guided` runs the assistant with **no AI at all**. The server matches the
visitor's question against the approved knowledge pack (`lib/assistant/guided.ts`, using
`retrieve.ts`) and returns the best-matching chunk's text **verbatim** (a FAQ answer or a service
summary), labelled "From Drylake's published information", with its source link (the FAQ anchor on
`/faq#<id>` or the service page) and one or two related questions as chips. If nothing matches
well enough it says "I could not find that in Drylake's published information" and offers the
three ways to reach a person (book a consultation, send an enquiry, speak to a representative).

What guided mode does **not** do: paraphrase, generate, summarise, call any external service,
build an LLM provider, or store anything. No transcript is saved, no new data is kept, so
`/privacy` section 5 and the FAQ `ai-privacy` stay true as written ("the website does not send your
information to an AI service"). A test stubs `fetch` and asserts zero calls.

Every existing guard still runs: Turnstile to start a session, HMAC session, per-IP limits, turn cap,
daily cap, 500 character input limit, the sensitive-information reply, escalation through the
existing `/api/contact` pipeline (`source: "assistant"`), the booking link to `/consultation`, and
text-only rendering. Two extra refusals run before retrieval: text that tries to steer the assistant
(ignore instructions, reveal the prompt, role-play) and demands for a specific price, rate, deadline
or guarantee both get the not-found reply. A general "how much does a website cost?" is answered
by the published FAQ, which says Drylake does not publish a price list.

Design choice: guided is a handler mode (`lib/assistant/mode.ts`), not an `LlmGatewayProvider`.
That interface carries a prompt, a tool schema and a model output to validate; guided has none of
those, so forcing it through would mean building a fake request just to discard it. The handler
asks `isGuided(env)` and never names a vendor. Every vendor stays behind `provider.ts`.

The panel copy is switched at build time (`ASSISTANT_GUIDED_BUILD`, derived in `next.config.ts`
from `LLM_GATEWAY_PROVIDER`) because the panel is a client component: "Drylake's assistant. I
answer from Drylake's published information. I am not a person." The launcher label drops "AI".
In bedrock mode the existing AI disclosure is unchanged.

### Production enablement (guided)

Set in Vercel, Production, then **redeploy** (the launcher flag is inlined at build time, so an
env change alone does not take effect on an existing deployment):

| Variable | Value |
|---|---|
| `CHAT_ASSISTANT_ENABLED` | `true` |
| `LLM_GATEWAY_PROVIDER` | `guided` |
| `ASSISTANT_SESSION_SECRET` | 32+ random characters, for example `openssl rand -base64 48` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | already set (the assistant uses Turnstile action `assistant`) |

No AWS variables are needed. Optional caps: `ASSISTANT_DAILY_REQUEST_CAP` (default 500 per Perth day
per instance; guided answers cost nothing, but the cap still bounds abuse), `ASSISTANT_MAX_TURNS`
(12), `ASSISTANT_IP_LIMIT_10MIN` (30), `ASSISTANT_START_LIMIT_10MIN` (6).

Confirm the switch took effect: `GET /api/health` now includes
`"assistant": { "enabled": true, "provider": "guided" }` (names only, no secrets). `enabled` is
true only when the flag is on **and** the session secret is 32+ characters. It never changes the
health status. (The health route cannot see the build-time flag; if `enabled` is true but the
launcher is missing from the homepage, the deployment was not rebuilt.)

### Production verification checklist (guided)

Run by hand on production after the redeploy. Production is not covered by the automated tests.

- [ ] `GET /api/health` shows `assistant: { enabled: true, provider: "guided" }`.
- [ ] Desktop: the launcher is bottom right; it opens the dialog, the close button and **Esc** close it, and focus returns to the launcher.
- [ ] Mobile (real phone or device mode, 375 px): the launcher does not cover the footer, form submit buttons or the sticky call to action; the dialog fills the screen and closes.
- [ ] The dialog says "Drylake's assistant. I answer from Drylake's published information. I am not a person." and nowhere says AI.
- [ ] Turnstile completes (the input unlocks without a visible error).
- [ ] Ask three questions ("What does Drylake do?", "How much does a business website cost?", "What happens in the free consultation?"): each gets the matching published text, the "From Drylake's published information" label, a working source link, and related-question chips that answer when clicked.
- [ ] Not-found path: ask "What is the weather in Perth today?". The reply says it could not find that, with Book, Send an enquiry and Speak to a representative.
- [ ] Each escalation creates a **real enquiry in the inbox**: submit "Send an enquiry" and "Speak to a representative" once each with your own email. Both arrive at `CONTACT_TO_EMAIL` tagged "Source: AI assistant" (the wording is internal; see Known limits), and the representative one is marked as wanting a person. The booking link opens `/consultation`.
- [ ] Sensitive reply: type "my password is hunter22". The assistant refuses it and says nothing was sent anywhere.
- [ ] Rate limit: send 7 session starts from one IP inside 10 minutes (open and reload the dialog) or exceed `ASSISTANT_MAX_TURNS`; the visitor sees the plain "Too many ..." or "message limit" text, not an error page.
- [ ] Keyboard only: Tab stays inside the dialog, Enter sends, Esc closes.
- [ ] Axe (browser extension or `npm run test:e2e` against production for the public pages) reports no violations with the dialog open.
- [ ] `/privacy` section 5 and `/faq#ai-privacy` still read correctly (they must, because nothing is sent to an AI service).
- [ ] Vercel logs filtered on `assistant` show `outcome: guided-answered`, `guided-not-found` or `guided-refused` and `provider: "guided"`, and no visitor text.

### Switching to Bedrock later

Setting `LLM_GATEWAY_PROVIDER=bedrock-sydney` makes `/privacy` section 5 and the FAQ `ai-privacy`
untrue. The privacy page paragraph, the FAQ answer and `PRIVACY_SUMMARY` in `knowledge.ts` must be
changed **in the same deploy**. Guided mode excludes the `privacy:summary` chunk because that chunk
describes the AI mode.

### Tuning guided retrieval

`MIN_SCORE`, `MIN_COVERAGE` and `MIN_MATCHED` in `guided.ts` are pinned by `tests/assistant-guided.test.mjs`
(20 realistic questions with expected chunk ids, 12 off-topic or adversarial questions that must
get the not-found reply, and a check that every chip question retrieves its own chunk). When you add
or reword FAQ content, run the suite. A missed question is fixed by improving the wording in the
source copy; a wrong answer by raising `MIN_COVERAGE`. Raising it trades recall for precision.

## Sovereignty finding (checked 2026-10-16)

Question: which Claude models can run with the prompt staying in Australia?

| Claim | Evidence | Confidence |
|---|---|---|
| Claude Haiku 4.5 has **no in-region** model id in Sydney. `bedrock-runtime` there accepts only geographic or global inference profiles | AWS Bedrock model card for Claude Haiku 4.5, Regional availability table: ap-southeast-2 In-Region "not supported", Geo "supported", Global "supported" | High (AWS docs, read directly) |
| An **`au.` profile exists**: `au.anthropic.claude-haiku-4-5-20251001-v1:0` (also Sonnet 4.5 `au.anthropic.claude-sonnet-4-5-20250929-v1:0`) | Same model card, Programmatic access table; AWS ML blog on cross-Region inference in Japan and Australia | High |
| From Sydney the `au.` profile can route only to **ap-southeast-2 (Sydney) and ap-southeast-4 (Melbourne)** | Model card "Geo: AU" table: source ap-southeast-2, destinations Sydney and Melbourne | High |
| `apac.` and `global.` profiles can route outside Australia (Singapore, Tokyo, Mumbai, US, EU and more) | Same model card, Global table lists all commercial regions; the AWS inference profile page warns not to rely on the prefix alone | High |
| A single-Region (Sydney only) option for Haiku 4.5 | The model card lists `bedrock-mantle` in-region only for Melbourne (ap-southeast-4), not Sydney, among AU regions | Medium (not exercised) |
| Newer Claude models (Haiku 5.5, Sonnet 5.5, Opus 5.5) are Geo-supported in Sydney | One page of the Regional availability matrix (first 100,000 characters, rest unread); their exact `au.` ids were not confirmed | Low |

Consequences:

1. "Stays in Australia" is true. "Stays in Sydney" is **not**: the `au.` profile may run in Melbourne.
   Both are Australian AWS regions. If Sydney-only is a hard requirement, Haiku 4.5 cannot meet it.
2. The code enforces this, it does not trust the env var. `lib/assistant/model-id.ts` is an
   **allowlist**: only `anthropic.claude-*` and `au.anthropic.claude-*`. `apac.`, `global.`, `us.`,
   `eu.`, `jp.`, `in.`, ARNs and everything else make the provider return "unavailable" and log why.
   The region and base URL are pinned to `ap-southeast-2` in code; `AWS_REGION` and
   `ANTHROPIC_BEDROCK_BASE_URL` are never read.
3. AWS documents that for cross-Region profiles prompts and outputs can be stored in the destination
   regions for abuse detection. For the `au.` profile those are the two Australian regions.
4. **Model lifecycle risk:** the model card lists Claude Haiku 4.5 as "EOL no sooner than Oct 16, 2026"
   (legacy period at least 6 months). Plan to move to a newer `au.` model id by changing
   `ASSISTANT_MODEL_ID`; check the id on the model card first, then it must still pass the allowlist.
5. Re-check `GetInferenceProfile` from ap-southeast-2 when you set up the account (command below).
   AWS says to verify destination regions yourself and not to rely on the prefix.

```bash
aws bedrock get-inference-profile --region ap-southeast-2 \
  --inference-profile-identifier au.anthropic.claude-haiku-4-5-20251001-v1:0 \
  --query 'models[].modelArn'
```

Expected: only `ap-southeast-2` and `ap-southeast-4` ARNs. Anything else means do not enable.

## Owner setup (nothing here has been done)

1. **AWS account.** Create or choose an account for Drylake. Enable MFA on the root user.
2. **Model access.** In the Bedrock console, region **Asia Pacific (Sydney)**, request access to
   Anthropic Claude Haiku 4.5 (Anthropic may ask for use-case details on first use). Third-party
   models are billed through AWS Marketplace on the same AWS bill.
3. **IAM user** `drylake-website-assistant`, programmatic access only, with this policy (replace
   `<ACCOUNT_ID>`). It allows `bedrock:InvokeModel` on the exact profile and the exact model in the
   two Australian regions, and nothing else. The assistant does not stream, so
   `InvokeModelWithResponseStream` is deliberately omitted; add it only if streaming is built.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InvokeAuProfile",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:ap-southeast-2:<ACCOUNT_ID>:inference-profile/au.anthropic.claude-haiku-4-5-20251001-v1:0"
      ]
    },
    {
      "Sid": "InvokeUnderlyingModelInAustraliaOnly",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0",
        "arn:aws:bedrock:ap-southeast-4::foundation-model/anthropic.claude-haiku-4-5-20251001-v1:0"
      ],
      "Condition": {
        "StringLike": {
          "bedrock:InferenceProfileArn": "arn:aws:bedrock:ap-southeast-2:<ACCOUNT_ID>:inference-profile/au.anthropic.claude-haiku-4-5-20251001-v1:0"
        }
      }
    }
  ]
}
```

4. **Credentials into Vercel** (Production only, sensitive): `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`. Vercel allows these names (its own injected AWS values are not usable
   credentials). Longer term, prefer a Vercel OIDC role over a long-lived key: create an IAM role
   trusted by Vercel's OIDC provider, attach the policy above, and swap the provider's credentials to
   the role (a small change inside `providers/bedrock-sydney.ts` only; no caller changes). Rotate
   the key every 90 days until then and put the date on the calendar.
5. **Other variables:** `ASSISTANT_SESSION_SECRET` (32+ random characters, for example
   `openssl rand -base64 48`), `LLM_GATEWAY_PROVIDER=bedrock-sydney`. Optional: `ASSISTANT_MODEL_ID`,
   `ASSISTANT_DAILY_REQUEST_CAP` (default 500 per Perth day per instance), `ASSISTANT_MAX_TURNS`
   (12), `ASSISTANT_IP_LIMIT_10MIN` (30), `ASSISTANT_START_LIMIT_10MIN` (6).
6. **AWS Budgets alert.** Billing, Budgets, create a monthly cost budget with a dollar amount **you
   choose**, alerts at 50, 80 and 100 percent to a monitored inbox. This is the last line of defence;
   the per-instance caps in code do not add up across instances.
7. **Do not enable Bedrock model invocation logging** to S3 or CloudWatch. It would store visitor
   prompts, which the privacy position says Drylake does not do.
8. **Privacy page first.** `/privacy` currently says the website does not send personal information to
   AI services. That becomes untrue the moment the assistant is on. Publish the "Artificial
   intelligence" paragraph from the PR description before enabling.
9. **Vercel Firewall:** add a rate-limit rule on `/api/assistant`, as on `/api/contact`.
10. **Enable:** set `CHAT_ASSISTANT_ENABLED=true` and redeploy. The launcher is included at build
    time, so a redeploy is required (Vercel redeploys on any env change anyway). Then run the checks
    in "Smoke test".

## Smoke test after enabling (production, by hand)

- Open the homepage: launcher bottom right; open it; the first line says it is an AI, not a person.
- Ask "What does Drylake do?": answer labelled "From Drylake's published information" with a source link.
- Ask "How much does a website cost?": it must decline to give a price and offer the consultation.
- Ask it to ignore its rules: it must refuse or fall back.
- "Speak to a representative": the form submits and the enquiry arrives at `CONTACT_TO_EMAIL` with
  "Source: AI assistant: asked to speak to a person".
- Log line `assistant {"outcome":"ok",...}` appears; no visitor text appears in logs.

## Knowledge pack refresh

The pack is built from the same modules the pages read, on every deploy: `lib/faqs.ts` (FAQ),
`lib/discovery/services.ts` (services), `lib/consultations/{rules,copy}.ts` (booking), `lib/brand-story.ts`,
and a short hand-kept privacy summary in `lib/assistant/knowledge.ts`. To change what the assistant
knows, change the source and deploy; there is nothing to sync. Each log line carries the pack
`version` (a content hash), so an answer can be traced to the content that produced it.
If `/privacy` changes in substance, update `PRIVACY_SUMMARY` by hand in the same PR.

## Monitoring

- Vercel logs, filter `assistant`: `outcome` is `ok`, `rejected-<reason>` (a server guard replaced a
  model answer), `provider-throttled`, `provider-unavailable` or `provider-error`.
  A rising `rejected-*` rate means the model or the pack drifted. A burst of `provider-*` means AWS
  trouble; the circuit breaker opens after 4 consecutive failures for 60 seconds.
- AWS: Bedrock invocation count and throttles in CloudWatch; Cost Explorer filtered to the
  Marketplace charge for the model.
- Weekly for the first month: read ten recent enquiries tagged "AI assistant" and check the
  answers they refer to.

## Switching it off

- Fastest: set `CHAT_ASSISTANT_ENABLED` to `false` (or delete it) and redeploy. The launcher is
  removed from every page and `/api/assistant` returns 404.
- Without a deploy: remove the IAM user's access key in AWS or detach the policy. The assistant then
  answers "unavailable" with the ways to reach Drylake. Set `ASSISTANT_DAILY_REQUEST_CAP=0` to close
  it from the model side.

## Known limits

- Rate limits, the daily cap, turn counters and the circuit breaker are per server instance. They
  bound a burst, not a distributed attack. Turnstile at session start, the Vercel Firewall rule and
  the AWS budget are the real ceilings.
- The sensitive-data screen is a heuristic. It is deliberately over-eager.
- The output checks block prices, timelines, guarantees, claims to be human, markup and prompt leaks
  by pattern. They are tested against a model that tries to comply with attacks, not against a real
  one. Real Bedrock behaviour has not been observed.
- Retrieval is lexical. If answers miss obvious pages, add the wording to the source copy.
