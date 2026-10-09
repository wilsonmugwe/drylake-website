import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Container from "@/components/ui/Container";
import { DRYLAKE_BUSINESS } from "@/lib/business";
import { CONTACT_EMAIL } from "@/lib/site";

import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";

/*
 * Website and Drylake Workspace terms (portfolio parity check, 2026-10-08: pre-launch checklist #18
 * needs Privacy AND Terms; Drylake Workspace takes payments and holds documents). Deliberately narrow:
 * project work is governed by each client's signed Proposal / Statement of Work and Master
 * Services Agreement (drylake-ops/06-legal/02), and these terms defer to it on any conflict.
 * Wording mirrors the MSA (WA law, ACL non-excludable rights, liability limited as the law
 * permits). No em dashes; no prices; GST stated as registered (D31).
 */
const SEO = PAGE_SEO.terms;

export const metadata: Metadata = pageMetadata(SEO);

const TERMS_CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Terms of Use", path: "/terms" },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({
            path: SEO.path,
            name: SEO.title,
            description: SEO.description,
            breadcrumb: TERMS_CRUMBS,
          }),
          breadcrumbNode("/terms", TERMS_CRUMBS),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-(--section-y-compact) pt-(--page-top) sm:pt-44">
          <p className="section-label text-black/60">Legal</p>

          <h1 className="type-section mt-6">Terms of Use</h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/60">
            The terms for using the Drylake website and Drylake Workspace.
          </p>
        </Container>

        <section className="bg-[#f2f0e9] py-(--section-y-compact) sm:py-20">
          <Container>
            <div className="max-w-3xl space-y-10 text-base leading-7 text-black/65">
              <TermsSection title="1. About these terms">
                <p>
                  These terms apply to your use of drylake.com.au and Drylake Workspace, the area where
                  clients follow their projects, documents and invoices. Both are operated by Drylake Pty Ltd (ABN 70 702 662 557), a company
                  based in Perth, Western Australia. By using them you agree to these terms.
                </p>
              </TermsSection>

              <TermsSection title="2. Project work is agreed separately">
                <p>
                  Software, automation, integration and website work is provided under a written
                  proposal or statement of work and our Master Services Agreement, signed by you and
                  Drylake. Those documents set the scope, fees, payment terms, ownership of the work
                  and each party&apos;s responsibilities. If anything in these terms conflicts with
                  a signed agreement, the signed agreement applies.
                </p>
                <p className="mt-3">
                  Information on this website describes what we do in general terms. It is not an
                  offer, a quote or a commitment to deliver a particular result.
                </p>
              </TermsSection>

              <TermsSection title="3. Using the website">
                <p>
                  You may use the website to learn about Drylake and to contact us. You must not use
                  it unlawfully, interfere with its operation or security, try to gain access to
                  parts of it you are not authorised to use, send automated requests at a volume that
                  affects other visitors, or submit content that is false, harmful or contains
                  malicious code.
                </p>
              </TermsSection>

              <TermsSection title="4. Drylake Workspace">
                <ul className="list-disc space-y-2 pl-5">
                  <li>Access is by invitation, for people at organisations Drylake works with.</li>
                  <li>
                    Keep your sign-in details secure. You are responsible for activity under your
                    account, and you must tell us promptly at{" "}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                      {CONTACT_EMAIL}
                    </a>{" "}
                    if you think someone else has used it.
                  </li>
                  <li>
                    Your organisation&apos;s administrator controls who in your organisation has
                    access. Tell us when someone should no longer have it.
                  </li>
                  <li>
                    We may suspend access where we reasonably need to protect the security of the
                    Workspace, your information or other clients, and we will tell you why.
                  </li>
                </ul>
              </TermsSection>

              <TermsSection title="5. Invoices and payments">
                {/* Read from lib/business.ts so this sentence can never contradict ABN Lookup. */}
                <p>
                  {DRYLAKE_BUSINESS.gstRegistered
                    ? "Drylake is registered for GST. Our invoices are tax invoices showing the amount excluding GST, the GST and the total."
                    : "Drylake is not currently registered for GST and does not charge GST. Invoice amounts are in Australian dollars."}{" "}
                  Payment terms are those in your signed agreement.
                </p>
                <p className="mt-3">
                  Card payments made through the Workspace are processed by Stripe. Drylake does not
                  receive or store your full card details. An invoice shows as paid once Stripe
                  confirms the payment to us.
                </p>
              </TermsSection>

              <TermsSection title="6. Intellectual property">
                <p>
                  The content, design and code of this website belong to Drylake or are used with
                  permission. You may view and share pages for your own reference, but not copy or
                  republish them as your own. Ownership of work we create for you is set out in your
                  signed agreement.
                </p>
              </TermsSection>

              <TermsSection title="7. Third-party services and links">
                <p>
                  The website and Workspace rely on third-party services, including for sign-in,
                  payments, email and protection against automated abuse. Links to other websites are
                  provided for convenience and do not mean we endorse them.
                </p>
              </TermsSection>

              <TermsSection title="8. Australian Consumer Law and our liability">
                <p>
                  Nothing in these terms excludes, restricts or modifies any right or remedy you have
                  under the Australian Consumer Law or any other law that cannot lawfully be
                  excluded.
                </p>
                <p className="mt-3">
                  To the extent the law allows, Drylake is not liable for indirect or consequential
                  loss arising from your use of the website, or from the website or Workspace being
                  temporarily unavailable. Liability for project work is governed by your signed
                  agreement.
                </p>
              </TermsSection>

              <TermsSection title="9. Privacy">
                <p>
                  How we handle personal information is explained in our{" "}
                  <Link href="/privacy" className="underline underline-offset-4">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </TermsSection>

              <TermsSection title="10. Changes to these terms">
                <p>
                  We may update these terms. The date below shows when they last changed. Changes do
                  not alter a signed agreement.
                </p>
              </TermsSection>

              <TermsSection title="11. Governing law">
                <p>
                  These terms are governed by the laws of Western Australia, and the courts of
                  Western Australia have jurisdiction.
                </p>
              </TermsSection>

              <TermsSection title="12. Contact">
                <p>
                  Questions about these terms:{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </TermsSection>

              <p className="border-t border-black/10 pt-8 text-sm text-black/60">
                Last updated: 8 October 2026
              </p>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function TermsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-black">{title}</h2>

      <div className="mt-3">{children}</div>
    </section>
  );
}
