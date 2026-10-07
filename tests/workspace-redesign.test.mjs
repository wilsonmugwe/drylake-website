/*
 * PR 4: Drylake Workspace (client experience redesign).
 *
 * (1) Product language: no user-visible "Client Portal" anywhere; "portal" never appears in
 *     a string a Workspace user reads (routes, file names and identifiers are allowed).
 * (2) Brand: the Workspace shell renders the canonical wordmark (PR 1's DrylakeWordmark).
 * (3) Mobile navigation is a real modal dialog: semantics, Escape, Tab trap, focus return,
 *     scroll lock released.
 * (4) Every data view has an intentional empty state.
 * (5) Derived views (overdue, attention, activity, briefing) only re-arrange loaded rows.
 * (6) Presentation details that are easy to regress: titles, primary-button contrast.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  activityFeed,
  attentionItems,
  briefingSentence,
  effectiveInvoiceStatus,
  perthToday,
} from "../components/client/workspace-derive.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
/* Source without comments, so prose in comments never counts as UI copy. */
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

function walk(dir, predicate, out = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;

    if (statSync(join(ROOT, rel)).isDirectory()) {
      if (entry !== "node_modules") walk(rel, predicate, out);
    } else if (predicate(rel)) {
      out.push(relative(ROOT, join(ROOT, rel)).replaceAll("\\", "/"));
    }
  }

  return out;
}

const SOURCE = /\.(ts|tsx|mjs|js)$/;

describe("product language: Drylake Workspace, not Client Portal", () => {
  const files = [
    ...walk("app", (f) => SOURCE.test(f)),
    ...walk("components", (f) => SOURCE.test(f)),
    ...walk("lib", (f) => SOURCE.test(f)),
  ];

  it("scans the app, components and lib trees", () => assert.ok(files.length > 100));

  it('no code string says "Client Portal" (any case)', () => {
    // Spaces only: hyphenated forms (the `client-portal` CSS hook) are identifiers, not copy.
    const offenders = files.filter((file) => /\bclient\s+portal\b/i.test(code(file)));

    assert.deepEqual(offenders, []);
  });

  /*
   * Every quoted string and JSX text node in the Workspace (and the admin copy that talks
   * about it) is checked for the word "portal". Paths ("/portal/..."), module names
   * ("./portal-ui") and identifiers (portalUrl, getPortalContext) are not copy.
   */
  const workspaceFiles = [
    ...walk("components/client", (f) => /\.tsx?$/.test(f)),
    ...walk("app/client", (f) => /\.tsx?$/.test(f)),
    ...walk("app/portal", (f) => /\.tsx?$/.test(f)),
    ...walk("components/admin", (f) => /\.tsx$/.test(f)),
    ...walk("app/admin", (f) => /\.tsx$/.test(f)),
    "lib/clients/status.ts",
    "lib/email/invoice-email.ts",
  ];

  for (const file of workspaceFiles) {
    it(`${file}: no "portal" in user-visible copy`, () => {
      const source = code(file);
      const strings = [
        ...source.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g),
      ].map((m) => m[1] ?? m[2] ?? m[3]);
      const jsxText = [...source.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)].map((m) => m[1]);

      const offenders = [...strings, ...jsxText].filter(
        (text) =>
          /\bportal\b/i.test(
            text
              .replace(/\/portal\b[\w/-]*/gi, "") // routes
              .replace(/[#.\w]*(?:-portal|portal-)[\w-]*/gi, "") // CSS/anchor hooks, module names
          ) &&
          !/^[\w./@-]+$/.test(text.trim()) // a bare identifier, path or import specifier
      );

      assert.deepEqual(offenders, [], `${file} shows "portal" to a reader`);
    });
  }

  it("every Workspace route title is absolute and names Drylake Workspace", () => {
    for (const page of [
      "app/client/page.tsx",
      "app/client/billing/page.tsx",
      "app/client/billing/[invoiceId]/page.tsx",
      "app/client/projects/[projectId]/page.tsx",
      "app/portal/workspaces/page.tsx",
    ]) {
      assert.match(read(page), /title: \{ absolute: "[^"]+ \| Drylake Workspace" \}/, page);
    }
  });

  it('the public entry label stays "Client Login"', async () => {
    const { CLIENT_LOGIN } = await import("../lib/navigation/site-nav.ts");
    assert.equal(CLIENT_LOGIN.label, "Client Login");
  });

  it("messages sent from the Workspace are tagged Drylake Workspace in the inbox", () => {
    assert.match(code("components/client/MessageDrylake.tsx"), /projectType: `Drylake Workspace: \$\{topic\}`/);
  });
});

describe("the Workspace shell carries the canonical wordmark", () => {
  const rail = code("components/client/ClientRail.tsx");

  it("imports PR 1's DrylakeWordmark (no local re-implementation)", () => {
    assert.match(rail, /import DrylakeWordmark from "@\/components\/brand\/DrylakeWordmark"/);
    assert.ok(!/WORDMARK_LETTERS_PATH|<path\b/.test(rail), "the rail draws no wordmark geometry itself");
  });

  it("renders the lockup in the desktop rail, the mobile bar and the drawer", () => {
    const lockups = rail.match(/<DrylakeWordmark lockup tone="dark"/g) ?? [];
    assert.ok(lockups.length >= 2, "Brand (rail + mobile bar) and the drawer header");
    assert.match(rail, /function ClientSidebar[\s\S]*<Brand \/>/);
    assert.match(rail, /function ClientMobileNav[\s\S]*<Brand compact \/>/);
  });

  it("the shell mounts both navigations", () => {
    const shell = code("components/client/ClientShell.tsx");
    assert.match(shell, /<ClientMobileNav/);
    assert.match(shell, /<ClientSidebar/);
    assert.match(shell, /href="#portal-main"[\s\S]*Skip to content/);
  });

  it("the brand link is named Drylake Workspace", () => {
    assert.match(rail, /WORKSPACE_NAME = "Drylake Workspace"/);
    assert.match(rail, /<span className="sr-only">\{WORKSPACE_NAME\}, overview<\/span>/);
  });
});

describe("mobile navigation is a modal dialog", () => {
  const rail = code("components/client/ClientRail.tsx");
  const markup = rail.slice(rail.indexOf("export function ClientMobileNav"));
  // The dialog behaviour lives in ONE hook shared with Admin (polish PR); the markup stays here.
  const drawer = code("components/shell/useModalDrawer.ts");
  const mobile = `${markup}
${drawer}`;

  it("the Workspace drawer uses the shared drawer contract", () => {
    assert.match(markup, /useModalDrawer\(\)/);
    assert.match(markup, /onKeyDown=\{onKeyDown\}/);
    assert.match(markup, /ref=\{panelRef\}/);
  });

  it("toggle exposes state and controls the drawer", () => {
    assert.match(mobile, /ref=\{toggleRef\}/);
    assert.match(mobile, /aria-haspopup="dialog"/);
    assert.match(mobile, /aria-expanded=\{open\}/);
    assert.match(mobile, /aria-controls="workspace-drawer"/);
  });

  it("drawer has dialog semantics", () => {
    assert.match(mobile, /id="workspace-drawer"\s+role="dialog"\s+aria-modal="true"\s+aria-label="Workspace menu"/);
  });

  it("focus moves in on open (the close button)", () => {
    assert.match(mobile, /querySelector<HTMLElement>\("\[data-autofocus\]"\)\?\.focus\(\)/);
    assert.match(mobile, /data-autofocus\s+aria-label="Close Workspace menu"/);
  });

  it("Escape closes; a nested open <dialog> keeps its own keys", () => {
    assert.match(mobile, /event\.key === "Escape"[\s\S]{0,80}close\(\)/);
    assert.match(mobile, /closest\("dialog\[open\]"\)/);
  });

  it("Tab and Shift+Tab are trapped inside the drawer", () => {
    assert.match(mobile, /event\.key !== "Tab"/);
    assert.match(mobile, /event\.shiftKey && document\.activeElement === first[\s\S]*last\.focus\(\)/);
    assert.match(mobile, /!event\.shiftKey && document\.activeElement === last[\s\S]*first\.focus\(\)/);
  });

  it("focus returns to the toggle when the drawer closes", () => {
    assert.match(mobile, /if \(wasOpen\.current\) \{\s*wasOpen\.current = false;\s*toggleRef\.current\?\.focus\(\);/);
  });

  it("page scroll is locked while open and always released", () => {
    assert.match(mobile, /root\.style\.overflow = "hidden"/);
    assert.match(mobile, /return \(\) => \{[\s\S]*root\.style\.overflow = previousOverflow;/);
  });

  it("navigating closes the drawer (it is open only for the path it opened on)", () => {
    assert.match(mobile, /const open = openAt !== null && openAt === pathname/);
  });

  it("the scrim closes it and the drawer motion respects reduced motion", () => {
    assert.match(mobile, /className="cp-scrim[^"]*" onClick=\{close\}/);
    const css = read("app/globals.css");
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.cp-drawer,\s*\.cp-scrim \{\s*animation: none;/);
  });
});

describe("every data view has an intentional empty state", () => {
  const cases = {
    "components/client/ClientDashboardView.tsx": [
      /No active projects yet\./,
      /No activity yet\./,
      /No documents yet\./,
      /Nothing needs your attention\./,
      /Nothing is in progress yet\./, // whole workspace empty: WelcomePanel
    ],
    "components/client/ClientBillingView.tsx": [/No invoices yet\./, /Nothing to pay right now\./],
    "components/client/ClientProjectView.tsx": [/No milestones yet\./, /No updates yet\./, /No documents yet\./],
  };

  for (const [file, patterns] of Object.entries(cases)) {
    it(file, () => {
      const source = code(file);
      for (const pattern of patterns) assert.match(source, pattern, `${file}: ${pattern}`);
    });
  }

  it("empty states offer a real next step (Start a conversation), never a fabricated item", () => {
    for (const file of Object.keys(cases)) {
      assert.match(code(file), /<MessageDrylake variant="(inline|cta)"/, file);
    }
    assert.match(code("components/client/portal-ui.tsx"), /action\?: ReactNode/);
  });

  it("every failed section shows an error state, not an empty one", () => {
    for (const file of Object.keys(cases)) {
      assert.match(code(file), /<ErrorState subject=/, file);
    }
  });
});

describe("derived views only re-arrange loaded rows", () => {
  const inv = (id, status, dueDate, issuedAt = "2026-09-01", totalCents = 10000) => ({
    id,
    invoiceNumber: `INV-${id}`,
    status,
    currency: "AUD",
    totalCents,
    dueDate,
    issuedAt,
  });

  it("OPEN past its due date (Perth) reads OVERDUE; other statuses pass through", () => {
    assert.equal(effectiveInvoiceStatus(inv("1", "OPEN", "2026-10-06"), "2026-10-07"), "OVERDUE");
    assert.equal(effectiveInvoiceStatus(inv("1", "OPEN", "2026-10-07"), "2026-10-07"), "OPEN");
    assert.equal(effectiveInvoiceStatus(inv("1", "OPEN", null), "2026-10-07"), "OPEN");
    assert.equal(effectiveInvoiceStatus(inv("1", "PAID", "2026-01-01"), "2026-10-07"), "PAID");
    assert.equal(effectiveInvoiceStatus(inv("1", "OVERDUE", "2099-01-01"), "2026-10-07"), "OVERDUE");
  });

  it("perthToday is the Perth calendar date", () => {
    // 2026-10-06T17:30Z is 01:30 on 7 Oct in Perth (UTC+8).
    assert.equal(perthToday(new Date("2026-10-06T17:30:00Z")), "2026-10-07");
  });

  it("attention lists only payable invoices, overdue first, then by due date", () => {
    const items = attentionItems(
      [
        inv("a", "OPEN", "2026-11-01"),
        inv("b", "PAID", "2026-09-01"),
        inv("c", "OPEN", "2026-10-01"),
        inv("d", "OPEN", "2026-10-20"),
        inv("e", "VOID", null),
        inv("f", "OPEN", null),
      ],
      "2026-10-07"
    );
    assert.deepEqual(
      items.map((i) => [i.invoice.id, i.status]),
      [["c", "OVERDUE"], ["d", "OPEN"], ["a", "OPEN"], ["f", "OPEN"]]
    );
  });

  it("the activity feed merges real rows newest first and invents nothing", () => {
    const feed = activityFeed({
      updates: [
        { id: "u1", projectId: "p1", projectName: "Ops platform", title: "Discovery done", publishedAt: "2026-10-03T02:00:00Z" },
        { id: "u2", projectId: "p1", projectName: "Ops platform", title: "Unpublished", publishedAt: null },
      ],
      documents: [
        { id: "d1", name: "Spec.pdf", projectName: "Ops platform", mimeType: "application/pdf", sizeBytes: 1, createdAt: "2026-10-05T00:00:00Z" },
      ],
      invoices: [inv("i1", "OPEN", "2026-10-30", "2026-10-01T00:00:00Z")],
    });

    assert.deepEqual(
      feed.map((item) => [item.kind, item.title, item.href]),
      [
        ["document", "Spec.pdf", "/api/client/documents/d1/download"],
        ["update", "Discovery done", "/client/projects/p1"],
        ["invoice", "Invoice INV-i1 issued", "/client/billing/i1"],
      ]
    );
    assert.equal(activityFeed({ updates: [], documents: [], invoices: [] }).length, 0);
  });

  it("the briefing line states counts, and leaves out what failed to load", () => {
    assert.equal(
      briefingSentence({ openProjects: 2, overdue: 1, awaitingPayment: 2 }),
      "2 projects are in progress, and 1 invoice is overdue."
    );
    assert.equal(
      briefingSentence({ openProjects: 1, overdue: 0, awaitingPayment: 0 }),
      "1 project is in progress, and nothing is waiting on you."
    );
    assert.equal(
      briefingSentence({ openProjects: null, overdue: 0, awaitingPayment: 3 }),
      "3 invoices are awaiting payment."
    );
    assert.match(briefingSentence({ openProjects: null, overdue: null, awaitingPayment: null }), /could not load/);
  });
});

describe("presentation details", () => {
  const css = read("app/globals.css");

  it("the Workspace primary action is ink with white text (no white-on-orange)", () => {
    assert.match(css, /\.cp-button-primary \{\s*background: #0b0b0a;\s*color: #ffffff !important;/);
  });

  it("muted Workspace text meets 4.5:1 on white", () => {
    assert.match(css, /--cp-ink-muted: #6b6963;/);
  });

  it("no em dash in any Workspace string", () => {
    for (const file of walk("components/client", (f) => /\.tsx?$/.test(f))) {
      assert.ok(!code(file).includes("—"), file);
    }
  });

  it("the pay button and its server-verified flow are untouched in the invoice view", () => {
    const view = code("components/client/ClientInvoiceView.tsx");
    assert.match(view, /const payable = isPayableInvoice\(invoice\.status\) && !confirming;/);
    assert.match(view, /\{payable \? \(\s*<div className="mt-6">\s*<PayInvoiceButton invoiceId=\{invoice\.id\} amount=\{total\} \/>/);
  });
});
