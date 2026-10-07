import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Container from "@/components/ui/Container";

import { pageMetadata } from "@/lib/seo";
import { PAGE_SEO } from "@/lib/seo-pages";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbNode, webPageNode } from "@/lib/discovery/structured-data";

const SEO = PAGE_SEO.privacy;

export const metadata: Metadata = pageMetadata(SEO);

const PRIVACY_CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy" },
];

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
            How Drylake handles information provided through our website and
            services.
          </p>
        </Container>

        <section className="bg-[#f2f0e9] py-(--section-y-compact) sm:py-20">
          <Container>
            <div className="max-w-3xl space-y-10 text-base leading-7 text-black/65">
              <PolicySection title="1. About this policy">
                <p>
                  This Privacy Policy explains how Drylake Pty Ltd (ABN 70 702
                  662 557) collects, uses, stores and handles personal
                  information provided through our website and in connection
                  with our services.
                </p>
              </PolicySection>

              <PolicySection title="2. Information we may collect">
                <p>
                  We may collect information that you provide directly to us,
                  including your name, email address, company or organisation,
                  project requirements, enquiry details and other information
                  you choose to provide.
                </p>
              </PolicySection>

              <PolicySection title="3. How we use information">
                <p>
                  We may use information to respond to enquiries, assess
                  potential projects, communicate with clients, provide and
                  improve our services, maintain the security of our systems,
                  and meet applicable legal or regulatory obligations.
                </p>
              </PolicySection>

              <PolicySection title="4. Website and security information">
                <p>
                  Our website and service providers may process technical
                  information required to operate, secure and protect the
                  website, such as request information, security events and
                  information used to detect automated or malicious activity.
                </p>
              </PolicySection>

              <PolicySection title="5. Service providers">
                <p>
                  We may use trusted service providers to host, secure,
                  communicate through and operate our website and business
                  systems. These providers may process information on our behalf
                  where necessary to provide those services.
                </p>
              </PolicySection>

              <PolicySection title="6. Disclosure">
                <p>
                  We do not sell personal information. Information may be
                  disclosed to service providers where required to operate our
                  business, where required by law, or where otherwise authorised
                  or permitted.
                </p>
              </PolicySection>

              <PolicySection title="7. Data security">
                <p>
                  We take reasonable technical and organisational measures to
                  protect information against unauthorised access, misuse,
                  interference, loss and unauthorised disclosure or alteration.
                  No method of electronic transmission or storage can be
                  guaranteed to be completely secure.
                </p>
              </PolicySection>

              <PolicySection title="8. Retention">
                <p>
                  We retain information for as long as reasonably necessary for
                  the purposes for which it was collected, for legitimate
                  business requirements, and where required by law.
                </p>
              </PolicySection>

              <PolicySection title="9. Access and correction">
                <p>
                  You may contact Drylake if you wish to request access to, or
                  correction of, personal information that we hold about you,
                  subject to applicable law.
                </p>
              </PolicySection>

              <PolicySection title="10. Privacy enquiries">
                <p>
                  Privacy enquiries may be directed to Drylake Pty Ltd. A
                  dedicated privacy contact email will be published once
                  Drylake&apos;s business email service is activated.
                </p>
              </PolicySection>

              <PolicySection title="11. Changes to this policy">
                <p>
                  We may update this Privacy Policy from time to time to reflect
                  changes to our services, systems, business practices or legal
                  obligations.
                </p>
              </PolicySection>

              <p className="border-t border-black/10 pt-8 text-sm text-black/60">
                Last updated: 28 September 2026
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