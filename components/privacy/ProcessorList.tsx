import { PROCESSORS, processorRegionText } from "@/lib/privacy/processors";

/*
 * The list of service providers that handle personal information for Drylake. Rendered by BOTH
 * the Privacy Policy and the Security and Privacy page from lib/privacy/processors.ts, so the two
 * cannot disagree (tests/privacy-cookies.test.mjs). Server component: static, citable HTML.
 * `compact` drops the per-provider "information handled" line for the policy, which already lists the
 * kinds of information in section 2; the provider names, purposes and regions are identical.
 */
export default function ProcessorList({ compact = false }: { compact?: boolean }) {
  return (
    <ul className="mt-4 divide-y divide-black/10 border-y border-black/10" data-testid="processor-list">
      {PROCESSORS.map((processor) => (
        <li key={processor.name} className="py-4" data-processor={processor.name}>
          <p className="font-semibold text-black">{processor.name}</p>
          <p className="mt-1 text-sm leading-6 text-black/70">{processor.purpose}</p>
          {!compact && (
            <p className="mt-1 text-sm leading-6 text-black/65">
              <span className="font-medium text-black/80">Information handled:</span> {processor.handles}
            </p>
          )}
          <p className="mt-1 text-sm leading-6 text-black/65">
            <span className="font-medium text-black/80">Where:</span> {processorRegionText(processor)}
          </p>
        </li>
      ))}
    </ul>
  );
}
