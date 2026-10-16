/*
 * Collaborate With Drylake (/collaborate, /api/collaboration, /admin/collaborations).
 *
 * Pure-logic tests (validation, project options, sender, email rendering, copy) run the real
 * modules. Route and page behaviour is pinned at source level, the same way the other route
 * tests in this repo do it, plus a scan of the production build when one exists (the browser
 * level checks are in tests/e2e/collaborate.spec.ts). The migration is tested against a real
 * Postgres by tests/db/run-collaboration-db-tests.sh.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BASE_PROJECTS,
  COLLABORATION_CATEGORIES,
  COLLABORATION_LIMITS,
  PROPOSAL_STATUS_VALUES,
} from "../lib/collaboration/catalog.ts";
import { ACK_COPY, BRONNIE, COLLABORATE_AUDIENCES, COLLABORATE_INTRO, COLLABORATE_NOT_THIS, FORM_MICROCOPY } from "../lib/collaboration/copy.ts";
import { ABBICARE_NOTE, abbicareEnabled, projectOptions } from "../lib/collaboration/projects.ts";
import { normaliseWebsite, validateProposal, validateProposalUpdate } from "../lib/collaboration/validate.ts";
import { renderProposalAcknowledgement, renderProposalNotification } from "../lib/email/collaboration-email.ts";
import { collaborationFromAddress } from "../lib/email/collaboration-sender.ts";
import { PUBLIC_PAGES } from "../lib/discovery/entity.ts";
import { PAGE_SEO } from "../lib/seo-pages.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const code = (rel) => stripComments(read(rel));
const EM_DASH = "—";

const ALLOWED_OFF = ["drylake", "bronnie", "other"];
const ALLOWED_ON = ["drylake", "bronnie", "abbicare", "other"];

const VALID = {
  name: "Quinn Tester",
  organisation: "Example Pty Ltd",
  email: "Quinn@Example.com",
  category: "pilot_project",
  project: "bronnie",
  summary: "We would like to pilot the platform with our front desk team next quarter.",
  website: "",
  consent: true,
  turnstileToken: "token",
};

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

describe("validateProposal", () => {
  it("accepts a complete proposal and normalises it", () => {
    const result = validateProposal(VALID, ALLOWED_OFF);
    assert.ok(result.ok);
    assert.equal(result.fields.email, "quinn@example.com");
    assert.equal(result.fields.website, null);
  });

  it("requires the privacy acknowledgement to be exactly true", () => {
    for (const consent of [undefined, false, "true", "on", 1, null]) {
      const result = validateProposal({ ...VALID, consent }, ALLOWED_OFF);
      assert.equal(result.ok, false, String(consent));
      assert.equal(result.field, "consent");
    }
  });

  it("requires name, organisation, email and a long-enough summary", () => {
    for (const [key, field] of [["name", "name"], ["organisation", "organisation"], ["email", "email"]]) {
      const result = validateProposal({ ...VALID, [key]: "   " }, ALLOWED_OFF);
      assert.equal(result.ok, false, key);
      assert.equal(result.field, field);
    }
    const short = validateProposal({ ...VALID, summary: "too short" }, ALLOWED_OFF);
    assert.equal(short.ok, false);
    assert.equal(short.field, "summary");
  });

  it("rejects oversize fields", () => {
    const cases = {
      name: "n".repeat(COLLABORATION_LIMITS.name + 1),
      organisation: "o".repeat(COLLABORATION_LIMITS.organisation + 1),
      summary: "s".repeat(COLLABORATION_LIMITS.summary + 1),
    };
    for (const [key, value] of Object.entries(cases)) {
      assert.equal(validateProposal({ ...VALID, [key]: value }, ALLOWED_OFF).ok, false, key);
    }
    assert.equal(validateProposal({ ...VALID, email: `${"a".repeat(COLLABORATION_LIMITS.email)}@example.com` }, ALLOWED_OFF).ok, false);
    assert.equal(validateProposal({ ...VALID, website: `https://example.com/${"p".repeat(COLLABORATION_LIMITS.website)}` }, ALLOWED_OFF).ok, false);
  });

  it("rejects a malformed email, an unknown category and an unknown project", () => {
    assert.equal(validateProposal({ ...VALID, email: "not-an-email" }, ALLOWED_OFF).field, "email");
    assert.equal(validateProposal({ ...VALID, category: "free_money" }, ALLOWED_OFF).field, "category");
    assert.equal(validateProposal({ ...VALID, project: "secret" }, ALLOWED_OFF).field, "project");
  });

  it("accepts every published category and base project", () => {
    for (const category of COLLABORATION_CATEGORIES) {
      assert.ok(validateProposal({ ...VALID, category: category.value }, ALLOWED_OFF).ok, category.value);
    }
    for (const project of BASE_PROJECTS) {
      assert.ok(validateProposal({ ...VALID, project: project.value }, ALLOWED_OFF).ok, project.value);
    }
  });

  it("accepts the gated project only when it is allowed", () => {
    assert.equal(validateProposal({ ...VALID, project: "abbicare" }, ALLOWED_OFF).ok, false);
    assert.ok(validateProposal({ ...VALID, project: "abbicare" }, ALLOWED_ON).ok);
  });

  it("refuses control characters everywhere and line breaks in single-line fields", () => {
    assert.equal(validateProposal({ ...VALID, summary: `${VALID.summary}\u0000` }, ALLOWED_OFF).ok, false);
    assert.equal(validateProposal({ ...VALID, name: "Quinn\r\nBcc: x@example.com" }, ALLOWED_OFF).ok, false);
    assert.equal(validateProposal({ ...VALID, organisation: "Example\nPty" }, ALLOWED_OFF).ok, false);
    assert.ok(validateProposal({ ...VALID, summary: `${VALID.summary}\nSecond paragraph.` }, ALLOWED_OFF).ok);
  });

  it("rejects non-object bodies", () => {
    for (const body of [null, "x", 5, [], undefined]) {
      assert.equal(validateProposal(body, ALLOWED_OFF).ok, false);
    }
  });
});

describe("website field", () => {
  it("adds https to a bare hostname and keeps full URLs", () => {
    assert.equal(normaliseWebsite("example.com.au"), "https://example.com.au/");
    assert.equal(normaliseWebsite("http://example.com/path?a=1"), "http://example.com/path?a=1");
  });

  it("rejects dangerous or malformed values", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "ftp://example.com", "https://user:pw@example.com", "localhost", "exa mple.com", "https://example.", ""]) {
      assert.equal(normaliseWebsite(bad), null, bad);
    }
  });

  it("is optional but must be valid when given", () => {
    const ok = validateProposal({ ...VALID, website: "example.com.au" }, ALLOWED_OFF);
    assert.ok(ok.ok);
    assert.equal(ok.fields.website, "https://example.com.au/");
    const bad = validateProposal({ ...VALID, website: "javascript:alert(1)" }, ALLOWED_OFF);
    assert.equal(bad.ok, false);
    assert.equal(bad.field, "website");
  });
});

describe("validateProposalUpdate (admin)", () => {
  it("accepts a known status and/or notes", () => {
    assert.deepEqual(validateProposalUpdate({ status: "contacted" }, PROPOSAL_STATUS_VALUES), { ok: true, update: { status: "contacted" } });
    assert.deepEqual(validateProposalUpdate({ notes: "  Call Tuesday " }, PROPOSAL_STATUS_VALUES), { ok: true, update: { notes: "Call Tuesday" } });
    assert.deepEqual(validateProposalUpdate({ notes: "   " }, PROPOSAL_STATUS_VALUES), { ok: true, update: { notes: null } });
  });

  it("rejects unknown statuses, oversize notes, empty and non-object bodies", () => {
    assert.equal(validateProposalUpdate({ status: "won" }, PROPOSAL_STATUS_VALUES).ok, false);
    assert.equal(validateProposalUpdate({ notes: "x".repeat(COLLABORATION_LIMITS.notes + 1) }, PROPOSAL_STATUS_VALUES).ok, false);
    assert.equal(validateProposalUpdate({}, PROPOSAL_STATUS_VALUES).ok, false);
    assert.equal(validateProposalUpdate(null, PROPOSAL_STATUS_VALUES).ok, false);
    assert.equal(validateProposalUpdate({ notes: 5 }, PROPOSAL_STATUS_VALUES).ok, false);
  });

  it("offers exactly the five statuses from the brief", () => {
    assert.deepEqual([...PROPOSAL_STATUS_VALUES], ["new", "under_review", "contacted", "accepted", "declined"]);
  });
});

describe("owner-gated project flag", () => {
  it("is off unless exactly true", () => {
    for (const value of [undefined, "", "false", "0", "1", "yes", "TRUEISH"]) {
      assert.equal(abbicareEnabled({ COLLABORATION_ABBICARE_ENABLED: value }), false, String(value));
    }
    assert.equal(abbicareEnabled({ COLLABORATION_ABBICARE_ENABLED: "true" }), true);
    assert.equal(abbicareEnabled({ COLLABORATION_ABBICARE_ENABLED: " TRUE " }), true);
  });

  it("offers Drylake, BRONNIE and Other only while off", () => {
    assert.deepEqual(projectOptions({}).map((o) => o.value), ["drylake", "bronnie", "other"]);
    assert.ok(!JSON.stringify(projectOptions({})).toLowerCase().includes("abbicare"));
  });

  it("adds the gated project before Other while on", () => {
    assert.deepEqual(projectOptions({ COLLABORATION_ABBICARE_ENABLED: "true" }).map((o) => o.value), ["drylake", "bronnie", "abbicare", "other"]);
  });

  it("uses neutral wording when shown: separate organisation, no partnership claimed", () => {
    const text = JSON.stringify(ABBICARE_NOTE);
    assert.match(text, /separate organisation/);
    assert.match(text, /does not mean there is a partnership, endorsement or case study/);
    for (const topic of ["Website technology", "Next.js with WordPress and WooCommerce", "Accessibility and user experience", "Product catalogue systems", "Operational improvements", "Relevant partnerships"]) {
      assert.ok(text.includes(topic), topic);
    }
    assert.ok(!text.includes(EM_DASH));
  });

  it("is registered as an optional, server-only env var, off by default", async () => {
    const { ENV_REGISTRY } = await import("../scripts/env-registry.mjs");
    for (const name of ["COLLABORATION_ABBICARE_ENABLED", "COLLABORATION_EMAIL_FROM"]) {
      const entry = ENV_REGISTRY.find((e) => e.name === name);
      assert.ok(entry, name);
      assert.equal(entry.required, false);
      assert.equal(entry.exposure, "server");
    }
  });
});

describe("the gated project never reaches client code or the public page source", () => {
  const CLIENT_REACHABLE = [
    "components/collaboration/CollaborationForm.tsx",
    "lib/collaboration/catalog.ts",
    "lib/collaboration/copy.ts",
    "lib/collaboration/validate.ts",
  ];

  for (const file of CLIENT_REACHABLE) {
    it(`${file} does not name it`, () => {
      assert.ok(!/abbicare/i.test(read(file)), file);
    });
  }

  it("the page names it only through the server-only projects module, inside a flag check", () => {
    const page = code("app/collaborate/page.tsx");
    assert.ok(!/abbicare/i.test(page.replace(/ABBICARE_NOTE|abbicareEnabled/g, "")), "no literal name in the page");
    assert.match(page, /showGated \? \(/);
    assert.match(read("lib/collaboration/projects.ts"), /import "server-only"/);
  });

  it("no client component or the public page imports the server-only modules", () => {
    for (const file of walk(join(ROOT, "components"), (f) => f.endsWith(".tsx")).map((f) => relative(ROOT, f).replaceAll("\\", "/"))) {
      const source = read(file);
      if (!source.startsWith('"use client"')) continue;
      assert.ok(!/collaboration\/(projects|admin-labels)/.test(source), `${file} imports a server-only collaboration module`);
    }
    const page = read("app/collaborate/page.tsx");
    assert.ok(!page.includes("admin-labels"));
  });

  const built = join(ROOT, ".next");
  it("a production build (flag unset) has no trace of it in client chunks or public pages", { skip: existsSync(built) ? false : "no .next build in this checkout" }, () => {
    const staticFiles = walk(join(built, "static"), (f) => /\.(js|css|html|json|txt)$/.test(f));
    // The admin client panel receives labels as props, so even the admin chunks stay clean.
    for (const file of staticFiles) {
      assert.ok(!/abbicare/i.test(readFileSync(file, "utf8")), `client asset mentions it: ${relative(ROOT, file)}`);
    }
    const pages = [
      join(built, "server/app/collaborate.html"),
      join(built, "server/app/collaborate.rsc"),
      join(built, "server/app/llms.txt.body"),
      join(built, "server/app/llms-full.txt.body"),
      join(built, "server/app/sitemap.xml.body"),
    ].filter(existsSync);
    assert.ok(pages.length > 0, "expected prerendered output for /collaborate");
    for (const file of pages) {
      assert.ok(!/abbicare/i.test(readFileSync(file, "utf8")), `public output mentions it: ${relative(ROOT, file)}`);
    }
  });
});

describe("collaboration sender", () => {
  it("falls back to a Partnerships display name on the verified EMAIL_FROM address", () => {
    assert.equal(collaborationFromAddress({ EMAIL_FROM: "Drylake Billing <billing@mail.drylake.com.au>" }), "Drylake Partnerships <billing@mail.drylake.com.au>");
    assert.equal(collaborationFromAddress({ EMAIL_FROM: "billing@mail.drylake.com.au" }), "Drylake Partnerships <billing@mail.drylake.com.au>");
  });

  it("lets COLLABORATION_EMAIL_FROM win and fails loudly with no address", () => {
    assert.equal(collaborationFromAddress({ COLLABORATION_EMAIL_FROM: "Drylake Partnerships <partners@drylake.com.au>", EMAIL_FROM: "a@b.au" }), "Drylake Partnerships <partners@drylake.com.au>");
    assert.throws(() => collaborationFromAddress({}), /Missing EMAIL_FROM/);
  });

  it("replies go to the existing inbox and the sender is never assumed to be a new mailbox", () => {
    const source = code("lib/email/collaboration.ts");
    assert.match(source, /replyTo: CONTACT_EMAIL/);
    assert.match(source, /replyTo: proposal\.email/);
    assert.ok(!/partnerships@/i.test(source));
  });
});

describe("collaboration emails", () => {
  const proposal = {
    id: "5b0f3c1a-7c1d-4f43-9d6a-2f6f0b8a1e11",
    name: "Quinn <b>Tester</b>",
    organisation: "Example & Co",
    email: "quinn@example.com",
    category: "integration",
    project: "bronnie",
    summary: "Line one.\nLine two with <script>alert(1)</script>.",
    website: "https://example.com/",
    receivedAt: "2026-10-16T08:00:00.000Z",
  };

  it("the internal notification carries every field, links to admin and escapes HTML", () => {
    const { subject, html, text } = renderProposalNotification(proposal, "https://drylake.com.au");
    assert.match(subject, /Example & Co/);
    assert.ok(!/[\r\n]/.test(subject));
    for (const needle of ["quinn@example.com", "Integration proposal", "BRONNIE", "https://example.com/", "Line two"]) {
      assert.ok(text.includes(needle), `text: ${needle}`);
    }
    assert.match(html, /\/admin\/collaborations\/5b0f3c1a-7c1d-4f43-9d6a-2f6f0b8a1e11/);
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(!html.includes("<b>Tester</b>"));
  });

  it("the acknowledgement says it is not a partnership or an acceptance and gives no Drylake Workspace access", () => {
    const { subject, html, text } = renderProposalAcknowledgement(proposal, "https://drylake.com.au");
    assert.equal(subject, ACK_COPY.subject);
    for (const body of [html, text]) {
      assert.match(body, /not a formal partnership/);
      assert.match(body, /does not give you access to Drylake Workspace/);
      assert.ok(!/<script>/.test(body));
    }
    assert.ok(!/approved|accepted your|welcome aboard|congratulations/i.test(text));
  });

  it("uses no em dash and makes no price or partnership claim", () => {
    for (const email of [renderProposalNotification(proposal, "https://drylake.com.au"), renderProposalAcknowledgement(proposal, "https://drylake.com.au")]) {
      for (const part of [email.subject, email.html, email.text]) {
        assert.ok(!part.includes(EM_DASH));
      }
    }
  });
});

describe("visitor copy", () => {
  const strings = JSON.stringify({ COLLABORATE_INTRO, COLLABORATE_AUDIENCES, COLLABORATE_NOT_THIS, BRONNIE, FORM_MICROCOPY, ACK_COPY });
  const pageSource = read("app/collaborate/page.tsx") + read("components/collaboration/CollaborationForm.tsx");

  it("has no em dash", () => {
    assert.ok(!strings.includes(EM_DASH));
    assert.ok(!pageSource.includes(EM_DASH));
    assert.ok(!JSON.stringify(PAGE_SEO.collaborate).includes(EM_DASH));
  });

  it("lists every audience the brief names", () => {
    for (const item of ["Technology collaboration", "Product development partnerships", "Business partnerships", "Pilot projects", "Integration proposals", "Research and innovation", "supplier and service-provider proposals"]) {
      assert.ok(COLLABORATE_AUDIENCES.some((a) => a.toLowerCase().includes(item.toLowerCase())), item);
    }
  });

  it("describes BRONNIE with the owner sentence and separates today, in development and planned", () => {
    assert.equal(BRONNIE.description, "BRONNIE is an AI-powered platform being developed by Drylake.");
    assert.deepEqual(BRONNIE.stages.map((stage) => stage.heading), ["Available today", "In development", "Planned"]);
    assert.match(BRONNIE.stages[0].text, /No BRONNIE feature is generally available yet/);
    assert.match(BRONNIE.stages[1].text, /multi-tenant/);
    for (const fact of ["customer operations", "intelligent enquiry handling", "routing", "appointment coordination"]) {
      assert.ok(BRONNIE.stages[1].text.includes(fact), fact);
    }
    assert.match(BRONNIE.stages[2].text, /arranged by discussion/);
    assert.match(BRONNIE.status, /not claiming any customers, completed pilots, results or deployments/);
    for (const topic of ["Pilots", "Product feedback", "Early access", "Integrations", "Automation use cases", "Technical collaboration", "Commercial discussions"]) {
      assert.ok(BRONNIE.interestedIn.includes(topic), topic);
    }
  });

  it("claims no customers, partners, deployments, awards or prices", () => {
    const claims = /trusted by|our (customers|clients|partners)|in production with|live (customers|deployments)|award|case study of|\$\s?\d|per month|inc-?GST|ex-?GST/i;
    assert.ok(!claims.test(strings), strings.match(claims)?.[0]);
    // "production-ready" may appear only inside the denial.
    for (const match of strings.matchAll(/production-ready/g)) {
      assert.match(strings.slice(Math.max(0, match.index - 40), match.index), /Nothing about it is $/);
    }
  });

  it("states that a proposal is an enquiry, not a formal partnership, and links the privacy policy", () => {
    assert.match(FORM_MICROCOPY.notFormal, /enquiry/);
    assert.match(FORM_MICROCOPY.notFormal, /not a formal partnership/);
    assert.match(FORM_MICROCOPY.notFormal, /does not give you access to Drylake Workspace/);
    const form = read("components/collaboration/CollaborationForm.tsx");
    assert.match(form, /href="\/privacy"/);
    assert.match(form, /name="consent"[\s\S]{0,120}required/);
  });

  it("keeps customer enquiries and the free consultation distinct from this page", () => {
    const page = read("app/collaborate/page.tsx");
    assert.match(page, /CONTACT_PATH/);
    assert.match(page, /CONSULTATION_PATH/);
    assert.ok(!/Start Free Consultation/.test(page));
  });

  it("is registered for search, the sitemap and the footer", () => {
    assert.ok(PUBLIC_PAGES.some((p) => p.path === "/collaborate"));
    assert.equal(PAGE_SEO.collaborate.path, "/collaborate");
    assert.ok(PAGE_SEO.collaborate.title.length <= 65);
    assert.ok(PAGE_SEO.collaborate.description.length >= 140 && PAGE_SEO.collaborate.description.length <= 160, String(PAGE_SEO.collaborate.description.length));
    assert.ok(existsSync(join(ROOT, "public/og/collaborate.png")), "share card exists");
    assert.match(read("lib/navigation/services-menu.ts"), /href: "\/collaborate"/);
  });

  it("is server-rendered: the page is not a client component", () => {
    assert.ok(!read("app/collaborate/page.tsx").trimStart().startsWith('"use client"'));
  });
});

describe("POST /api/collaboration", () => {
  const route = code("app/api/collaboration/route.ts");
  const at = (needle) => {
    const index = route.indexOf(needle);
    assert.ok(index >= 0, `${needle} missing`);
    return index;
  };

  it("checks size, type, fields, rate limit and Turnstile before writing, in that order", () => {
    assert.ok(at("readJsonBody(") < at("validateProposal("));
    assert.ok(at("validateProposal(") < at("limiter.take("));
    assert.ok(at("limiter.take(") < at("verifyTurnstile("));
    assert.ok(at("verifyTurnstile(") < at('.from("collaboration_proposals")'));
    assert.ok(at('.from("collaboration_proposals")') < at("notifyProposal("));
  });

  it("limits request size, answers 429 and uses its own Turnstile action", () => {
    assert.match(route, /MAX_COLLABORATION_REQUEST_BYTES/);
    assert.match(route, /createRateLimiter\(5, 10 \* 60_000\)/);
    assert.match(route, /429/);
    assert.match(route, /verifyTurnstile\(fields\.turnstileToken, clientIp\(request\), supabase, COLLABORATION_ACTION\)/);
    assert.equal(COLLABORATION_ACTION_VALUE(), "collaboration");
  });

  it("accepts the gated project only through the server flag", () => {
    assert.match(route, /projectOptions\(process\.env\)/);
    assert.match(route, /validateProposal\(read\.body, allowedProjects\)/);
  });

  it("sets consent_at on the server and never trusts a client timestamp", () => {
    assert.match(route, /consent_at: receivedAt/);
    assert.ok(!/body\.consent_at|fields\.consent/.test(route));
  });

  it("saves the row before any email, and an email failure does not fail the request", () => {
    assert.match(route, /Promise\.allSettled\(\[notifyProposal\(proposal\), acknowledgeProposal\(proposal\)\]\)/);
  });

  it("logs error classes and redacted provider text, never the submitted fields", () => {
    const logs = route.match(/console\.(error|warn|log)\([^;]*\);/gs) ?? [];
    assert.ok(logs.length >= 3);
    for (const log of logs) {
      assert.ok(!/fields\.|proposal\.|read\.body|\.summary|\.email/.test(log), log);
    }
    assert.match(route, /redactSensitive\(/);
  });

  it("is classified in the route-auth test as public, with Turnstile and a rate limit", () => {
    assert.match(read("tests/security-audit-2026-10-16.test.mjs"), /"app\/api\/collaboration\/route\.ts": "public: Turnstile/);
  });

  function COLLABORATION_ACTION_VALUE() {
    return read("lib/collaboration/catalog.ts").match(/COLLABORATION_ACTION = "([a-z]+)"/)?.[1];
  }
});

describe("admin routes and pages", () => {
  it("the update route authorises before reading input or creating the service-role client", () => {
    const route = code("app/api/admin/collaborations/[proposalId]/route.ts");
    const gate = route.indexOf("authorizeAdminApi(");
    assert.ok(gate >= 0);
    assert.ok(gate < route.indexOf("readJsonBody("));
    assert.ok(gate < route.indexOf("createAdminSupabaseClient()"));
    assert.match(route, /isUuid\(proposalId\)/);
  });

  it("every change is audit-logged with state only, never names, emails or note text", () => {
    const route = code("app/api/admin/collaborations/[proposalId]/route.ts");
    assert.match(route, /writeAuditLog\(/);
    assert.match(route, /action: "collaboration\.updated"/);
    const metadata = route.slice(route.indexOf("metadata: {"), route.indexOf("});", route.indexOf("metadata: {")));
    const keys = [...metadata.matchAll(/^\s+(\w+):/gm)].map((m) => m[1]);
    assert.deepEqual(keys, ["status_from", "status_to", "notes_changed"]);
    assert.match(route, /updated_by: gate\.userId/);
  });

  it("both admin pages call requirePlatformAdmin before creating the service-role client", () => {
    for (const file of ["app/admin/collaborations/page.tsx", "app/admin/collaborations/[proposalId]/page.tsx"]) {
      const source = code(file);
      const gate = source.indexOf("requirePlatformAdmin(");
      assert.ok(gate >= 0, file);
      assert.ok(gate < source.indexOf("createAdminSupabaseClient()"), file);
      assert.match(source, /export const dynamic = "force-dynamic"/);
    }
  });

  it("the list page filters by project and status, validated against known values, and omits notes", () => {
    const source = code("app/admin/collaborations/page.tsx");
    assert.match(source, /readOption\(params, "status", PROPOSAL_STATUS_VALUES\)/);
    assert.match(source, /readOption\(params, "project"/);
    assert.ok(!/internal_notes/.test(source));
    assert.match(source, /ilikePattern\(/);
  });

  it("the detail page shows contact details, status and notes, and the panel posts to the admin route", () => {
    const page = code("app/admin/collaborations/[proposalId]/page.tsx");
    for (const needle of ["proposal.email", "proposal.status", "internal_notes", "AdminCollaborationPanel"]) {
      assert.ok(page.includes(needle), needle);
    }
    assert.match(code("components/admin/AdminCollaborationPanel.tsx"), /\/api\/admin\/collaborations\/\$\{proposalId\}/);
  });

  it("is in the admin navigation", () => {
    assert.match(read("components/admin/admin-nav.ts"), /href: "\/admin\/collaborations"/);
  });

  it("the migration is service-role only with RLS on and no policies", () => {
    const sql = read("supabase/migrations/20261016120000_collaboration_proposals.sql");
    assert.match(sql, /enable row level security/);
    assert.match(sql, /revoke all on public\.collaboration_proposals from %I/);
    assert.match(sql, /grant select, insert, update on public\.collaboration_proposals to service_role/);
    assert.match(sql, /set search_path = ''/);
    assert.ok(!/create policy/i.test(sql));
    for (const status of ["new", "under_review", "contacted", "accepted", "declined"]) assert.ok(sql.includes(`'${status}'`));
    assert.ok(!sql.includes(EM_DASH));
  });
});
