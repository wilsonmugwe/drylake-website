/*
 * Homepage clarity (2026-10-10). Pins the brief:
 *   TILES      Quotes top left, Invoices top right, Scheduling bottom left, One system (ochre)
 *              middle right, Enquiries bottom right; each plate is its own click target and opens
 *              a same-page card (problem + how we help). Behaviour in tests/e2e/homepage-clarity.spec.ts.
 *   HEADLINE   "Less paperwork. Less chasing. More time for your business." (third line muted).
 *   SYSTEMS    everyday labels, eight boxes, one plain sentence under the diagram.
 *   FOUNDATION six rows in everyday words; monitoring and backups only "where included".
 *   WHY        five reasons; the Workspace row names only what the Workspace shows.
 *   JOURNEY    seven stages from first conversation to launch, no promise the agreement does not make.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SYSTEM_NODES } from "../components/visuals/horizon-geometry.ts";
import {
  LAKEBED_PHONE_VIEW,
  LAKEBED_PLATES,
  LAKEBED_POPOVERS,
  LAKEBED_TILE_VIEW,
  platePolygon,
} from "../components/visuals/lakebed-geometry.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const code = (rel) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
/* DrylakeMark is a .tsx module (JSX), so its plate data is read from source, like the other suites. */
const MARK = read("components/brand/DrylakeMark.tsx");
const TILE_PLATES = [...MARK.match(/TILE_PLATES = \[([\s\S]*?)\] as const/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const TILE_OCHRE_PLATE = Number(MARK.match(/TILE_OCHRE_PLATE = (\d+)/)[1]);
const flat = (s) => s.replace(/&apos;/g, "'").replace(/\{" "\}/g, " ").replace(/\s+/g, " ");

/* Centroid of a plate path, in tile units. */
function centroid(d) {
  const nums = [];
  let x = 0;
  let y = 0;
  const tokens = d.match(/[MHVLZ]|-?\d+(?:\.\d+)?/g);
  let cmd = "";
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (/[MHVLZ]/.test(t)) {
      cmd = t;
      continue;
    }
    if (cmd === "H") x = Number(t);
    else if (cmd === "V") y = Number(t);
    else {
      x = Number(t);
      y = Number(tokens[(i += 1)]);
    }
    nums.push([x, y]);
  }
  return nums.reduce(([ax, ay], [px, py]) => [ax + px / nums.length, ay + py / nums.length], [0, 0]);
}

describe("TILES", () => {
  const where = (label) => centroid(TILE_PLATES[LAKEBED_PLATES.findIndex((p) => p.label === label)]);

  it("labels sit where the brief puts them", () => {
    const [qx, qy] = where("Quotes");
    const [ix, iy] = where("Invoices");
    const [sx, sy] = where("Scheduling");
    const [ex, ey] = where("Enquiries");
    assert.ok(qx < 50 && qy < 50, "Quotes top left");
    assert.ok(ix > 50 && iy < 50, "Invoices top right");
    assert.ok(sx < 50 && sy > 50, "Scheduling bottom left");
    assert.ok(ex > 50 && ey > 50, "Enquiries bottom right");
    assert.ok(ey > where("One system")[1], "One system sits above Enquiries, middle right");
    assert.equal(LAKEBED_PLATES[TILE_OCHRE_PLATE].label, "One system");
    assert.ok(!LAKEBED_PLATES.some((p) => p.label === "Tasks"), "Tasks is retired");
  });

  it("every card carries the approved problem and how we help", () => {
    const byLabel = Object.fromEntries(LAKEBED_PLATES.map((p, i) => [p.label, LAKEBED_POPOVERS[i]]));
    assert.deepEqual(byLabel.Quotes, {
      problem: "Preparing quotes takes too long.",
      help: "Create, send and keep track of quotes without losing paperwork.",
    });
    assert.deepEqual(byLabel.Invoices, {
      problem: "Keeping track of invoices and payments is frustrating.",
      help: "Keep invoices and payment information organised in one place.",
    });
    assert.deepEqual(byLabel.Scheduling, {
      problem: "Appointments get missed, double-booked or forgotten.",
      help: "Make it easier to manage bookings, availability and reminders.",
    });
    assert.deepEqual(byLabel.Enquiries, {
      problem: "Customer messages get buried in emails or missed.",
      help: "Keep enquiries together so it’s easier to respond and follow up.",
    });
    assert.deepEqual(byLabel["One system"], {
      problem: "Your business information is spread across too many places.",
      help: "Bring the tools you rely on together so your business runs more smoothly.",
    });
  });

  it("each plate's outline is its click target, in both view boxes", () => {
    for (const view of [LAKEBED_TILE_VIEW, LAKEBED_PHONE_VIEW]) {
      for (const d of TILE_PLATES) {
        const poly = platePolygon(d, view);
        assert.match(poly, /^polygon\((\d+(\.\d+)?% \d+(\.\d+)?%, ){2,}\d+(\.\d+)?% \d+(\.\d+)?%\)$/);
        for (const pct of poly.match(/\d+(\.\d+)?(?=%)/g).map(Number)) assert.ok(pct >= 0 && pct <= 100);
      }
    }
    // M8 8 H44 ... in the desktop box (-6..106): (8 + 6) / 112 = 12.5%.
    assert.ok(platePolygon(TILE_PLATES[0], LAKEBED_TILE_VIEW).startsWith("polygon(12.5% 12.5%, 44.64% 12.5%"));
  });

  it("the island opens a card in place: native popover, no link, no navigation, no modal", () => {
    const src = code("components/visuals/LakeBedInteractive.tsx");
    assert.match(src, /popover="auto"/);
    assert.match(src, /popoverTarget=\{cardId\}\s*popoverTargetAction="hide"/);
    assert.doesNotMatch(src, /<Link\b|<a\b|router\.|location\.|window\.open|showModal|aria-modal="true"/);
    assert.match(src, /clipPath: platePolygon\(TILE_PLATES\[i\], view\)/);
    assert.match(src, /The problem/);
    assert.match(src, /How we help/);
  });

  it("the card is styled and positioned to stay inside the viewport", () => {
    const css = read("app/public-site.css");
    const rule = css.slice(css.indexOf(".lb-pop {"), css.indexOf("}", css.indexOf(".lb-pop {")));
    assert.match(rule, /width: min\(19rem, calc\(100vw - 24px\)\)/);
    assert.match(rule, /max-height: calc\(100svh - 24px\)/);
    assert.match(css, /\.lb-pop:popover-open \{/);
    assert.match(code("components/visuals/LakeBedInteractive.tsx"), /Math\.min\(Math\.max\(/);
  });
});

describe("HEADLINE", () => {
  const problems = flat(code("components/sections/Problems.tsx"));

  it("is the three approved lines, the third muted grey", () => {
    assert.match(
      problems,
      /<h2 className="type-section"> <span className="block">Less paperwork\.<\/span> <span className="block">Less chasing\.<\/span> <span className="block text-balance text-black\/50">More time for your business\.<\/span> <\/h2>/
    );
    assert.doesNotMatch(problems, /workarounds/);
  });

  it("keeps the white (paper) section", () => {
    assert.match(problems, /<section id="problems" className="surface-paper/);
  });
});

describe("SYSTEMS", () => {
  it("eight everyday labels", () => {
    assert.deepEqual(
      SYSTEM_NODES.map((n) => n.label),
      ["Website", "Customer details", "Emails", "Customers", "Bookkeeping", "Documents", "Payments", "Team"]
    );
  });

  it("explains the diagram in one sentence under it", () => {
    const src = flat(code("components/sections/Integrations.tsx"));
    const after = src.slice(src.indexOf("</figcaption>"));
    assert.match(
      after,
      /Your website, customer details, emails and payments shouldn't all be disconnected\. We help bring them together so you spend less time switching between systems\./
    );
  });
});

describe("FOUNDATION", () => {
  const src = code("components/sections/Production.tsx");
  const rows = [
    ["Secure login", "Only authorised people can access your system."],
    ["Who can see what", "You decide what each team member can access."],
    ["Fewer mistakes", "Catch missing or incorrect information early."],
    ["Connected tools", "Your systems share information so you don't have to enter it twice."],
    ["Keeping things running", "Spot problems early and help keep your system working smoothly, where monitoring is included."],
    ["Backups and recovery", "Help protect your information and recover it if something goes wrong, where backups are included."],
  ];

  it("six rows in order, in everyday words", () => {
    let at = 0;
    for (const [name, text] of rows) {
      const n = src.indexOf(`name: "${name}"`, at);
      assert.ok(n > at - 1, name);
      assert.ok(src.indexOf(`text: "${text}"`, n) > n, text);
      at = n;
    }
    for (const jargon of ["Authentication", "Permissions", "Data validation", "Integrations\"", "Monitoring\""]) {
      assert.ok(!src.includes(`name: "${jargon.replace('"', "")}"`), jargon);
    }
  });
});

describe("WHY", () => {
  const src = flat(code("components/sections/Founders.tsx"));

  it("five reasons on the homepage variant", () => {
    for (const title of [
      "Talk to the people building it",
      "Practical, not complicated",
      "Built properly",
      "You always know where things stand",
      "See your project online",
    ]) {
      assert.ok(src.includes(`title: "${title}"`), title);
    }
    assert.match(src, /\{!page && \(/);
    assert.match(src, /03 \/ Why Drylake/);
  });

  it("claims nothing it cannot show: no satisfaction, ratings or results", () => {
    assert.doesNotMatch(src, /satisf|5-star|testimonial|\d+%|best in|#1|award/i);
  });
});

describe("JOURNEY", () => {
  const src = flat(code("components/sections/Approach.tsx"));

  it("seven stages, in order, under the approved heading and intro", () => {
    assert.match(src, /From first conversation <br className="hidden sm:block" \/> <span className="text-black\/50">to launch\.<\/span>/);
    assert.match(src, /Getting started shouldn't be complicated\. Here's what working with Drylake looks like\./);
    const titles = [...src.matchAll(/title: "([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(titles, [
      "Let's talk",
      "We work out what's needed",
      "You receive a proposal",
      "We get everything set up",
      "We build your solution",
      "We test everything",
      "We launch and hand over",
    ]);
  });

  it("makes no promise the agreement does not", () => {
    assert.doesNotMatch(src, /unlimited|free (ongoing )?support|guarantee|within \d+ (days|weeks)|you own all|ownership transfers/i);
    assert.match(src, /hosting, maintenance or ongoing support are set out in your proposal and agreement/);
  });

  it("is the only process section on the homepage (no repeat of the old four stages)", () => {
    // superseded by tests/home-exposed-ground.test.mjs (Exposed Ground homepage, D54, 2026-10-17)
    const page = read("app/page.tsx");
    assert.equal((page.match(/<HomeApproach\b/g) ?? []).length, 1);
    assert.equal((page.match(/<Approach\b/g) ?? []).length, 0);
  });
});

describe("portfolio copy rules on everything changed", () => {
  it("no em dash in any changed public file", () => {
    for (const file of [
      "components/visuals/lakebed-geometry.ts",
      "components/visuals/LakeBedInteractive.tsx",
      "components/sections/Hero.tsx",
      "components/sections/Problems.tsx",
      "components/sections/Integrations.tsx",
      "components/sections/Production.tsx",
      "components/sections/Founders.tsx",
      "components/sections/Approach.tsx",
    ]) {
      assert.doesNotMatch(read(file), /—/, file);
    }
  });
});
