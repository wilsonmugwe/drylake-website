import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";
import CookieSettings from "@/components/privacy/CookieSettings";
import ProcessorList from "@/components/privacy/ProcessorList";
import StorageInventory from "@/components/privacy/StorageInventory";
import JsonLd from "@/components/seo/JsonLd";
import Container from "@/components/ui/Container";
import { DRYLAKE_BUSINESS } from "@/lib/business";
import { pageLastUpdated } from "@/lib/discovery/entity";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";
import { OVERSEAS_COUNTRIES_KNOWN } from "@/lib/privacy/processors";
import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import { BUSINESS_PHONE, CONTACT_EMAIL } from "@/lib/site";

/*
 * Security and Privacy (privacy workstream, 2026-10-16): the plain-language companion to the
 * Privacy Policy. Every statement here is something the code, the vendor's own documentation or
 * the owner has confirmed. Nothing is claimed that cannot be shown:
 *   - no certification or grade claims and no blanket encryption claim (UNSUPPORTED in tests/privacy-cookies.test.mjs bans them);
 *   - at-rest encryption is attributed to the provider that documents it, never to Drylake;
 *   - retention periods are stated only where one is implemented; otherwise the honest answer is
 *     "until you ask us to delete it or we no longer need it" (owner to decide, see the PR);
 *   - providers and regions come from lib/privacy/processors.ts, the same list the policy renders;
 *   - cookies come from lib/privacy/storage-inventory.ts, backed by docs/privacy/2026-10-16-cookie-audit.md.
 * Facts to re-check before editing: the consultation link expiry (30 days after the booked time,
 * supabase/migrations/20261013120000_consultation_bookings.sql) and "two administrators" (the two founders).
 */
const SEO = PAGE_SEO.securityPrivacy;

export const metadata: Metadata = pageMetadata(SEO);

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Security and privacy", path: SEO.path },
];

const SECTIONS = [
  { id: "what-we-collect", title: "What we collect and why" },
  { id: "consultations", title: "How we use consultation information" },
  { id: "who-can-access", title: "Who can access client information" },
  { id: "providers", title: "Providers that handle information" },
  { id: "cookies", title: "Cookies and analytics" },
  { id: "protection", title: "How we protect information" },
  { id: "your-rights", title: "Access, correction and deletion" },
  { id: "keeping", title: "How long we keep information" },
  { id: "incidents", title: "If something goes wrong" },
  { id: "concerns", title: "Questions and complaints" },
] as const;

const linkClass = "font-medium text-black underline underline-offset-4";

export default function SecurityPrivacyPage() {
  return (
    <>
      <JsonLd
        nodes={[
          webPageNode({ path: SEO.path, name: SEO.title, description: SEO.description, breadcrumb: CRUMBS }),
          breadcrumbNode(SEO.path, CRUMBS),
        ]}
      />
      <Navbar />

      <main id="main-content" tabIndex={-1} className="bg-white text-black outline-none">
        <Container className="pb-(--section-y-compact) pt-(--page-top) sm:pt-44">
          <p className="section-label text-black/60">Trust</p>
          <h1 className="type-section mt-6">Security and privacy</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-black/65">
            In plain language: what {DRYLAKE_BUSINESS.legalName}, trading as Drylake, collects when you enquire,
            book a consultation or work with us, who can see it, which providers handle it, and how to ask us to
            show, correct or delete it. The full legal wording is in our{" "}
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>
            .
          </p>

          <nav aria-label="On this page" className="mt-8 max-w-2xl">
            <p className="tech-label text-black/60">On this page</p>
            <ul className="mt-2 grid gap-x-8 sm:grid-cols-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-[44px] items-center text-sm font-medium text-black/75 underline-offset-4 hover:text-black hover:underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>

        <section className="bg-[#f2f0e9] py-(--section-y-compact) sm:py-20">
          <Container>
            <div className="max-w-3xl space-y-12 text-base leading-7 text-black/65">
              <Block id="what-we-collect" title={SECTIONS[0].title}>
                <ul className="list-disc space-y-3 pl-5">
                  <li>
                    <Strong>Enquiry form.</Strong> Your name, email address, company (optional), the area you need help
                    with and your message. We use it to reply to you. It is delivered to our business email.
                  </li>
                  <li>
                    <Strong>Consultation booking.</Strong> Your name, email address, phone number and business name
                    (both optional), what you tell us about your business, and the time you chose. We use it to hold
                    the booking and email you about it.
                  </li>
                  <li>
                    <Strong>Client Workspace.</Strong> For clients, the names, work emails and roles of the people at
                    your organisation, plus project information, documents and invoices we share with you.
                  </li>
                  <li>
                    <Strong>Payments.</Strong> Card payments are made on Stripe&apos;s checkout. We receive confirmation
                    that a payment happened, not your card number.
                  </li>
                  <li>
                    <Strong>Website analytics.</Strong> Anonymous counts of page views and a few events, such as a
                    booking being started. See Cookies and analytics below, where you can switch this off.
                  </li>
                </ul>
                <p className="mt-4">
                  We do not sell personal information and we do not use it for advertising. No artificial intelligence
                  service receives personal information from our website or Workspace.
                </p>
              </Block>

              <Block id="consultations" title={SECTIONS[1].title}>
                <p>
                  What you tell us when you book is used to arrange, hold and prepare for your consultation. In
                  practice that means confirming the time by email, sending a reminder before the meeting, letting you
                  reschedule or cancel, and reading your notes so the conversation starts in the right place.
                </p>
                <p className="mt-3">
                  Your confirmation email contains a private link to manage the booking. Anyone with the link can
                  change or cancel that one booking, so please do not forward it. The link stops working 30 days after
                  the booked time. Booking details are not used for marketing. If you want a booking record deleted,
                  ask us (see below).
                </p>
              </Block>

              <Block id="who-can-access" title={SECTIONS[2].title}>
                <p>
                  Today, two people at Drylake, our co-founders, can administer client information. Access is checked
                  on our servers by role, not just hidden in the screen: administrators can manage client records, and
                  a client user can see only their own organisation&apos;s projects, documents and invoices. Changes made
                  by administrators are recorded in an audit log.
                </p>
              </Block>

              <Block id="providers" title={SECTIONS[3].title}>
                <p>
                  We use these service providers. Each handles personal information on our behalf, only to provide its
                  service. We list a region only where we have confirmed it; otherwise we say so.
                </p>
                <ProcessorList />
                <p className="mt-4">
                  Some of these providers store or process information outside Australia. The one we can name with
                  confidence is {OVERSEAS_COUNTRIES_KNOWN.join(", ")} (Clerk). For the others the region is not stated
                  above, so information may be handled in other countries. We take reasonable steps to make sure
                  overseas providers handle it consistently with the Australian Privacy Principles.
                </p>
              </Block>

              <Block id="cookies" title={SECTIONS[4].title}>
                <p>
                  We checked this in a real browser. Our public pages set no cookies and store nothing in your browser.
                  Cookies appear only if you open the sign-in screen, and they are needed for signing in. We use no
                  advertising or cross-site tracking, so there is no cookie banner to dismiss. The one optional
                  technology is Vercel Web Analytics, which does not use cookies and does not follow you across sites.
                  It is on by default because it holds no personal information about you; you can switch it off here at
                  any time.
                </p>
                <div id="cookie-settings" className="mt-6 scroll-mt-28">
                  <h3 className="text-base font-semibold text-black">Cookie and analytics settings</h3>
                  <div className="mt-3">
                    <CookieSettings />
                  </div>
                </div>
                <h3 className="mt-8 text-base font-semibold text-black">Everything we found, by category</h3>
                <StorageInventory />
              </Block>

              <Block id="protection" title={SECTIONS[5].title}>
                <ul className="list-disc space-y-2 pl-5">
                  <li>Our pages and forms are served over HTTPS, and requests for http addresses are redirected to https.</li>
                  <li>Sign-in is handled by Clerk, so we do not store your password.</li>
                  <li>Each client organisation&apos;s information is kept separate, and access is checked by role on our servers.</li>
                  <li>Client documents are kept in private storage, not at public web addresses.</li>
                  <li>Our contact and booking forms use a bot check and rate limits to reduce abuse.</li>
                  <li>Card numbers go to Stripe and never reach us.</li>
                </ul>
                <p className="mt-3">
                  Supabase documents that it encrypts the database and file storage we use while the data is stored.
                  That protection belongs to the provider, and we describe it as theirs. No system is completely
                  secure, so we do not promise that nothing can ever go wrong.
                </p>
                <p className="mt-3">
                  If you find a security problem, tell us at{" "}
                  <a href={`mailto:${CONTACT_EMAIL}?subject=Security`} className={linkClass}>
                    {CONTACT_EMAIL}
                  </a>{" "}
                  with &quot;Security&quot; in the subject. Our{" "}
                  <a href="/.well-known/security.txt" className={linkClass}>
                    security.txt
                  </a>{" "}
                  says the same.
                </p>
              </Block>

              <Block id="your-rights" title={SECTIONS[6].title}>
                <p>
                  You can ask what personal information we hold about you, ask us to correct it, or ask us to delete
                  it. Email{" "}
                  <a href={`mailto:${CONTACT_EMAIL}?subject=Privacy`} className={linkClass}>
                    {CONTACT_EMAIL}
                  </a>{" "}
                  with &quot;Privacy&quot; in the subject, or call{" "}
                  <a href={BUSINESS_PHONE.href} className={linkClass}>
                    {BUSINESS_PHONE.display}
                  </a>
                  . We may ask you to confirm who you are before we share or change anything. We will reply within a
                  reasonable time. If we cannot do what you ask, for example because the law requires us to keep an
                  invoice, we will tell you why. If you use Drylake Workspace through your employer, start with them or
                  with us and we will sort out who holds the information.
                </p>
              </Block>

              <Block id="keeping" title={SECTIONS[7].title}>
                <ul className="list-disc space-y-2 pl-5">
                  <li>
                    <Strong>Enquiries and consultation bookings:</Strong> until you ask us to delete them or we no
                    longer need them. We have not set an automatic deletion period.
                  </li>
                  <li>
                    <Strong>Client records in Workspace:</Strong> while we work together, and afterwards for as long as
                    we need them for support, disputes and record keeping.
                  </li>
                  <li>
                    <Strong>Invoices and payment records:</Strong> for as long as Australian tax and company
                    record-keeping laws require.
                  </li>
                  <li>
                    <Strong>Website analytics:</Strong> anonymous counts only, held by Vercel under its own plan. There
                    is no profile of you.
                  </li>
                </ul>
              </Block>

              <Block id="incidents" title={SECTIONS[8].title}>
                <p>
                  If personal information we hold is lost, or seen or changed by someone who should not have access, we
                  look into it straight away to find out what happened and who is affected. Where it is likely to cause
                  serious harm, we tell the people affected, with advice on what to do next, and we notify the Office of
                  the Australian Information Commissioner, as the Notifiable Data Breaches scheme requires. If it
                  involves a client&apos;s information, we also tell that client.
                </p>
              </Block>

              <Block id="concerns" title={SECTIONS[9].title}>
                <p>
                  If you have a concern about how we handle your information, contact us first using the details above
                  and we will look into it and reply. If you are not satisfied with our response, you can complain to the
                  Office of the Australian Information Commissioner at{" "}
                  <a href="https://www.oaic.gov.au" className={linkClass}>
                    oaic.gov.au
                  </a>
                  .
                </p>
              </Block>

              <p className="border-t border-black/10 pt-8 text-sm text-black/60">
                Last updated: {pageLastUpdated("/security-privacy")}
              </p>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-black">{children}</strong>;
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-xl font-semibold tracking-[-0.025em] text-black">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
