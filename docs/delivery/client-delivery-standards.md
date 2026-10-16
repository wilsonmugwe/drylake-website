# Client delivery standards

The checks Drylake runs before handing over any client website or web application. Public FAQ
answers on `/faq` describe these, so a claim there is only true while this standard is followed.
`tests/delivery-standards.test.mjs` pins the widths below to the ones the site's own e2e suite uses
(`tests/e2e/helpers.ts` `WIDTH_MATRIX`), so the two cannot drift apart.

## 1. Responsive testing (required, every delivery)

Backs the FAQ "Will the website work properly on phones?".

Every public page and every form is checked at these widths before launch:

`320, 360, 375, 390, 393, 414, 430, 768, 1024, 1440`

At each width the page must have:
- no horizontal scrolling;
- no clipped headings or text;
- tap targets at least 44 px high below 1024 px wide (24 px above);
- the primary call to action visible without scrolling at 375 x 667 and 1440 x 900;
- working navigation, menus and forms.

How:
- automated, where the project has a test suite (Playwright, Drylake's own `tests/e2e/responsive-matrix.spec.ts` as the pattern);
- otherwise a recorded manual pass in Chrome device mode;
- plus one real iPhone (Safari) and one real Android phone (Chrome) for every form and checkout flow.

Evidence: screenshots or the test report, attached to the handover.

## 2. Accessibility (required)

axe has no serious or critical violations on key pages. Every control is keyboard reachable with a
visible focus ring, and images carry alt text (decorative images get `alt=""`).

## 3. Search foundations (required) and Google Search Console (available service)

Required on every public site:
- unique titles and descriptions;
- self-canonical URLs;
- `sitemap.xml` and `robots.txt`;
- crawlable, server-rendered content.

**Google Search Console setup is an available service, not a default deliverable.** It is included
only when the proposal says so, because it needs the client's Google account and DNS access.

## 4. AI in client projects (required when AI is used)

Before any AI feature handles client or customer data, record in the proposal:
- the provider and the model;
- the hosting region, verified on the provider's own documentation at the time. Australian-region
  availability differs by provider and model. Example: on Amazon Bedrock, some Claude models are
  offered through an Australia-only route that serves Sydney and Melbourne, while others are not.
- what data the feature sees, and the minimum it needs;
- whether the provider stores or trains on inputs;
- where a person reviews results before they affect a customer, money or a decision.

Never publish an absolute privacy claim ("no data leaves Australia", "AI never sees personal
information") without auditing the actual data flow first.

## 5. Performance (required)

Lighthouse mobile performance of at least 90, measured on the deployed site, not a local build.
