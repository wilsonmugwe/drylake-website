# AI chat assistant runbook

Workstream 5. A floating chat on the public site that answers from an approved knowledge pack and
hands people to the existing enquiry form and consultation booking. It ships **switched off**.

Status when merged: no AWS account exists yet, so real Bedrock has never been called. Everything
below "Owner setup" is the checklist to turn it on.

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
