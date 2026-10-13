import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Container from "@/components/ui/Container";
import { DRYLAKE_BUSINESS } from "@/lib/business";
import { BUSINESS_PHONE, CONTACT_EMAIL, PUBLIC_LOCATION } from "@/lib/site";

import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";
import { pageLastUpdated } from "@/lib/discovery/entity";

/*
 * Privacy Policy (website audit, 2026-10-10). Written against what the code actually does, not
 * a template, so APP 1.4 is met: the kinds of information held, how it is collected, why,
 * access and correction, complaints, and overseas disclosure with likely countries.
 *
 * Facts this page relies on (re-check before changing any of them):
 *   - enquiry fields: lib/contact/validate-enquiry.ts (name, email, company, two topic picks,
 *     message); delivered by email through Resend; only a one-way hash of the Turnstile token
 *     is stored (lib/contact/consumed-tokens.ts), not the enquiry;
 *   - Workspace: Clerk sign-in; organisations, projects, documents, invoices and audit_logs in
 *     Supabase; card payments through Stripe Checkout;
 *   - public pages set no cookies (curl, 2026-10-10); Vercel Web Analytics is cookieless;
 *   - no AI service receives personal information from the website or Workspace (grep, 2026-10-10);
 *   - Clerk is US hosted (clerk.com/security, checked 2026-10-08), hence "including the United
 *     States". Supabase and Resend regions are NOT verified, so no data-residency claim is made.
 * Deliberately no retention periods: none are verified. Legal wording is for Wilson/Ben approval.
 */
const SEO = PAGE_SEO.privacy;

export const metadata: Metadata = pageMetadata(SEO);

const PRIVACY_CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
];

const linkClass = "font-medium text-black underline underline-offset-4";

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({
            path: SEO.path,
            name: SEO.title,
            description: SEO.description,
            breadcrumb: PRIVACY_CRUMBS,
          }),
          breadcrumbNode("/privacy", PRIVACY_CRUMBS),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-(--section-y-compact) pt-(--page-top) sm:pt-44">
          <p className="section-label text-black/60">Legal</p>

          <h1 className="type-section mt-6">
            Privacy Policy
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-black/60">
            How Drylake handles personal information collected through our
            website, Drylake Workspace and our services.
          </p>
        </Container>

        <section className="bg-[#f2f0e9] py-(--section-y-compact) sm:py-20">
          <Container>
            <div className="max-w-3xl space-y-10 text-base leading-7 text-black/65">
              <PolicySection title="1. About this policy">
                <p>
                  This Privacy Policy explains how {DRYLAKE_BUSINESS.legalName} (ABN{" "}
                  {DRYLAKE_BUSINESS.abn}), trading as Drylake, collects, uses, stores and
                  discloses personal information. It applies to drylake.com.au, to Drylake
                  Workspace (the signed-in area where clients follow their projects, documents
                  and invoices) and to our dealings with clients and prospective clients. We
                  handle personal information in line with the Australian Privacy Principles in
                  the Privacy Act 1988 (Cth).
                </p>
              </PolicySection>

              <PolicySection title="2. Information we collect">
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <strong className="font-semibold text-black">Enquiries.</strong> When you use
                    our contact form: your name, email address, company (optional), the area you
                    need help with, the kind of help you want and your message. If you email or
                    call us, we collect what you choose to tell us.
                  </li>
                  <li>
                    <strong className="font-semibold text-black">Consultation bookings.</strong>{" "}
                    When you book a free consultation: your name, email address, phone number and
                    business name (both optional), what you tell us about your business or project,
                    and the time you chose. We keep a record of changes to the booking (rescheduled,
                    cancelled or completed) and of the emails we send you about it.
                  </li>
                  <li>
                    <strong className="font-semibold text-black">Clients.</strong> The names,
                    work email addresses and roles of the people at a client organisation, and
                    the project information, documents and invoices we share through Drylake
                    Workspace.
                  </li>
                  <li>
                    <strong className="font-semibold text-black">Sign-in.</strong> If you are
                    invited to Drylake Workspace, the account details needed to sign you in
                    securely and a record of sign-in activity.
                  </li>
                  <li>
                    <strong className="font-semibold text-black">Payments.</strong> When you pay
                    an invoice by card, the payment is made on Stripe&apos;s secure checkout. We
                    receive confirmation of the payment, not your full card details.
                  </li>
                  <li>
                    <strong className="font-semibold text-black">Technical information.</strong>{" "}
                    Information your browser sends when you visit, such as IP address, browser
                    type and pages viewed, used to run, secure and measure the website.
                  </li>
                </ul>
                <p className="mt-3">
                  We collect personal information directly from you, or from your organisation
                  when it invites you to Drylake Workspace. You do not have to give us your
                  details, but without them we may not be able to reply to you or provide our
                  services.
                </p>
              </PolicySection>

              <PolicySection title="3. How we use information">
                <p>
                  We use personal information to reply to enquiries, arrange and hold
                  consultations (including confirmation and reminder emails), assess and deliver
                  projects, give clients access to Drylake Workspace, issue invoices and record
                  payments, keep our systems secure, and meet our legal and record-keeping
                  obligations. We do not sell personal information and we do not use it for
                  advertising.
                </p>
              </PolicySection>

              <PolicySection title="4. Cookies and analytics">
                <p>
                  Our public pages do not set cookies. We use Vercel Web Analytics to count
                  visits and enquiries in aggregate; it does not use cookies. Signing in to
                  Drylake Workspace uses cookies that are needed to keep you signed in. We use
                  Cloudflare Turnstile on the contact and booking forms to check that a submission
                  comes from a person rather than an automated program.
                </p>
              </PolicySection>

              <PolicySection title="5. Artificial intelligence">
                <p>
                  Our website and Drylake Workspace do not send your personal information to AI
                  services. If a client project involves AI processing of the client&apos;s
                  data, how that works is agreed in writing with the client for that project.
                </p>
              </PolicySection>

              <PolicySection title="6. Service providers">
                <p>
                  We use service providers to run our website, Drylake Workspace and business
                  systems. They handle personal information on our behalf, only as needed to
                  provide their service:
                </p>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  <li>Vercel: website hosting and aggregate visit analytics</li>
                  <li>Clerk: Drylake Workspace sign-in and account security</li>
                  <li>Supabase: database and document storage for Drylake Workspace, and consultation bookings</li>
                  <li>Stripe: card payments for invoices</li>
                  <li>Resend: delivery of enquiry notifications, consultation emails, invitations and invoice emails</li>
                  <li>Cloudflare: protection of the contact and booking forms against automated abuse</li>
                  <li>Microsoft 365: our business email</li>
                </ul>
                <p className="mt-3">
                  We may also disclose personal information where the law requires or allows
                  it, or with your consent.
                </p>
              </PolicySection>

              <PolicySection title="7. Overseas disclosure">
                <p>
                  Some of these providers store or process information outside Australia,
                  including in the United States. Where we use an overseas provider, we take
                  reasonable steps to ensure it handles personal information consistently with
                  the Australian Privacy Principles.
                </p>
              </PolicySection>

              <PolicySection title="8. Security">
                <p>
                  We use encrypted connections, sign-in controls, role-based access so each
                  person sees only their own organisation&apos;s information, and a record of
                  administrative changes. No method of transmitting or storing information is
                  completely secure, and if a data breach is likely to cause serious harm we
                  will notify you and the Office of the Australian Information Commissioner as
                  the law requires.
                </p>
              </PolicySection>

              <PolicySection title="9. Keeping and deleting information">
                <p>
                  We keep personal information only for as long as we need it for the purposes
                  above, or as long as the law requires. Invoices and payment records are kept
                  for as long as Australian tax and company record-keeping laws require. When we
                  no longer need information, we take reasonable steps to delete or de-identify
                  it. You can ask us to delete your information, and we will do so unless the
                  law requires us to keep it.
                </p>
              </PolicySection>

              <PolicySection title="10. Access and correction">
                <p>
                  You can ask for access to the personal information we hold about you, or ask
                  us to correct it. We will respond within a reasonable time and tell you if
                  there is a lawful reason we cannot give access.
                </p>
              </PolicySection>

              <PolicySection title="11. Questions and complaints">
                <p>
                  Contact {DRYLAKE_BUSINESS.legalName} about privacy, including access,
                  correction, deletion or a complaint:
                </p>
                <ul className="mt-3 space-y-1">
                  <li>
                    Email:{" "}
                    <a href={`mailto:${CONTACT_EMAIL}?subject=Privacy`} className={linkClass}>
                      {CONTACT_EMAIL}
                    </a>{" "}
                    (please put &quot;Privacy&quot; in the subject line)
                  </li>
                  <li>
                    Phone:{" "}
                    <a href={BUSINESS_PHONE.href} className={linkClass}>
                      {BUSINESS_PHONE.display}
                    </a>
                  </li>
                  <li>
                    Location: {PUBLIC_LOCATION}. We have no public office; if you need to write to us
                    by post, email us and we will give you a postal address.
                  </li>
                </ul>
                <p className="mt-3">
                  We will look into a complaint and reply to you. If you are not satisfied with
                  our response, you can complain to the Office of the Australian Information
                  Commissioner at{" "}
                  <a href="https://www.oaic.gov.au" className={linkClass}>
                    oaic.gov.au
                  </a>
                  .
                </p>
              </PolicySection>

              <PolicySection title="12. Changes to this policy">
                <p>
                  We may update this policy when our services, systems or legal obligations
                  change. The date below shows when it last changed.
                </p>
              </PolicySection>

              <p className="border-t border-black/10 pt-8 text-sm text-black/60">
                Last updated: {pageLastUpdated("/privacy")}
              </p>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-black">
        {title}
      </h2>

      <div className="mt-3">{children}</div>
    </section>
  );
}
