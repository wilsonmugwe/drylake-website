import { jsonLd } from "@/lib/discovery/structured-data";

/* Server-rendered JSON-LD @graph (crawlers and AI retrievers read it from the initial HTML). */
export default function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(nodes) }}
    />
  );
}
