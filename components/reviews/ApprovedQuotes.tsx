import Container from "@/components/ui/Container";
import { getApprovedQuotes } from "@/lib/reviews/public";
import { reviewPlatformUrl } from "@/lib/reviews/testimonials";

/*
 * Words from people Drylake has worked with, shown ONLY when there is something real to show:
 * feedback the person submitted, agreed to publish, and an admin approved. With none, this renders
 * nothing at all: no heading, no empty frame, no placeholder, no rating. It never shows stars,
 * an average or a count, and emits no Review or AggregateRating markup (a business marking up
 * reviews about itself on its own site is self-serving under Google's guidelines).
 *
 * Server component: no client JavaScript. The optional external-platform link appears only
 * alongside real quotes, and only when REVIEW_PLATFORM_URL is set to a valid https URL.
 */
export default async function ApprovedQuotes() {
  const quotes = await getApprovedQuotes();
  if (quotes.length === 0) return null;

  const platform = reviewPlatformUrl(process.env.REVIEW_PLATFORM_URL);

  return (
    <section aria-labelledby="approved-quotes-heading" className="border-t border-black/10 bg-white py-14 text-black sm:py-20">
      <Container>
        <h2 id="approved-quotes-heading" className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          What people say
        </h2>
        <ul className="mt-8 grid gap-6 md:grid-cols-2">
          {quotes.map((quote) => (
            <li key={`${quote.byline}-${quote.quote.slice(0, 24)}`}>
              <figure className="h-full border border-black/10 bg-[#f4f2ec] p-6">
                <blockquote className="text-base leading-7 text-black/80">{quote.quote}</blockquote>
                <figcaption className="mt-4 text-sm font-medium text-black/70">{quote.byline}</figcaption>
              </figure>
            </li>
          ))}
        </ul>
        {platform ? (
          <p className="mt-6 text-sm text-black/65">
            More from other people on{" "}
            <a className="underline underline-offset-2 hover:text-black" href={platform.href} target="_blank" rel="noopener noreferrer">
              {platform.host}
            </a>
            .
          </p>
        ) : null}
      </Container>
    </section>
  );
}
