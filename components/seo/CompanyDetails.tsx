import Container from "@/components/ui/Container";
import { ENTITY } from "@/lib/discovery/entity";

/*
 * Plain, visible company facts on /about, so a person or a retrieval system can establish
 * in one place that Drylake is the brand, DRYLAKE PTY LTD the legal entity, drylake.com.au
 * the official site and Perth WA the location. Values come from lib/discovery/entity.ts,
 * the same source as the structured data and llms.txt.
 */
export default function CompanyDetails() {
  const rows: Array<[string, string]> = [
    ["Brand", ENTITY.brand],
    ["Legal entity", ENTITY.legalName],
    ["ABN", ENTITY.abn],
    ["ACN", ENTITY.acn],
    ["Location", `${ENTITY.locality}, ${ENTITY.region}, ${ENTITY.country}`],
    ["Official website", "drylake.com.au"],
    ["What we do", "Custom software, client and staff portals, business automation, systems integration and applied AI"],
  ];

  return (
    <section aria-labelledby="company-details-heading" className="bg-white py-(--section-y-compact)">
      <Container>
        <div className="grid gap-8 sm:gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 id="company-details-heading" className="text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Company details
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-black/60">{ENTITY.legalSummary}</p>
          </div>

          <dl className="divide-y divide-black/10 border-y border-black/10">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr] sm:gap-6">
                <dt className="text-sm font-medium text-black/55">{label}</dt>
                <dd className="text-base text-black">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
