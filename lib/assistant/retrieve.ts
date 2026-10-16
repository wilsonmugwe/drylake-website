/*
 * Retrieval over the knowledge pack: small lexical scorer (TF with IDF, title boosted). PURE.
 *
 * Why lexical: the pack is ~45 short chunks of our own copy. Embeddings would add a second
 * provider (and a second data path) for no measurable gain at this size.
 * Contract: returns at most `limit` chunks with score > 0, best first; [] when nothing matches,
 * in which case the model is told there is no published information and must say so.
 *
 * scoreChunks() exposes the same ranking with a confidence signal (coverage, matched). Guided
 * mode (guided.ts) uses it to decide between "answer with this chunk" and "not found".
 */
import type { KnowledgeChunk } from "./knowledge.ts";

const STOPWORDS = new Set(
  "the and for with that this have from are you your what how can does about will would could should there their they them our out any all not but its it's who why when where which into than then also just like get got use used using more some need want tell please help drylake".split(
    " "
  )
);

export function tokenize(text: string, extraStopwords?: ReadonlySet<string>): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => (word.length > 2 || word === "ai") && !STOPWORDS.has(word) && !extraStopwords?.has(word))
    .map((word) => (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word));
}

export type ScoredChunk = {
  chunk: KnowledgeChunk;
  score: number;
  /* Share (0 to 1) of the query's IDF weight that this chunk matches. Query words found in no
     chunk at all carry the most weight, so padded or off-topic questions score low. */
  coverage: number;
  /* Distinct query words found in this chunk's title or body. */
  matched: number;
  /* How many of those words are in the chunk's TITLE (a title hit is the strongest single signal). */
  titleMatched: number;
};

/* Optional tuning used by guided mode. Model mode passes none, so its behaviour is unchanged. */
export type ScoreOptions = {
  /* Words too generic in this site's copy to identify any one chunk. Dropped from query, titles and bodies. */
  extraStopwords?: ReadonlySet<string>;
  /* Extra tokens appended to the QUERY (synonym concepts), computed from its plain tokens. */
  queryConcepts?: (tokens: readonly string[]) => readonly string[];
  /* Extra tokens appended to a chunk's TITLE only (never its body), so a synonym cannot match body text. */
  titleConcepts?: (chunk: KnowledgeChunk) => readonly string[];
};

export function scoreChunks(query: string, chunks: readonly KnowledgeChunk[], options: ScoreOptions = {}): ScoredChunk[] {
  const plain = tokenize(query, options.extraStopwords);
  const terms = [...new Set([...plain, ...(options.queryConcepts?.(plain) ?? [])])];
  if (terms.length === 0) return [];

  const docs = chunks.map((chunk) => ({
    chunk,
    title: new Set([...tokenize(chunk.title, options.extraStopwords), ...(options.titleConcepts?.(chunk) ?? [])]),
    body: tokenize(chunk.text, options.extraStopwords),
  }));

  const idf = new Map<string, number>();
  for (const term of terms) {
    const containing = docs.filter((doc) => doc.title.has(term) || doc.body.includes(term)).length;
    idf.set(term, Math.log(1 + (docs.length + 1) / (containing + 1)));
  }
  const totalWeight = terms.reduce((sum, term) => sum + (idf.get(term) ?? 0), 0);

  return docs
    .map((doc) => {
      let score = 0;
      let matchedWeight = 0;
      let matched = 0;
      let titleMatched = 0;
      for (const term of terms) {
        const tf = doc.body.filter((word) => word === term).length;
        const inTitle = doc.title.has(term);
        if (inTitle) titleMatched += 1;
        score += (idf.get(term) ?? 0) * (Math.min(tf, 3) + (inTitle ? 3 : 0));
        if (tf > 0 || inTitle) {
          matched += 1;
          matchedWeight += idf.get(term) ?? 0;
        }
      }
      return { chunk: doc.chunk, score, coverage: totalWeight > 0 ? matchedWeight / totalWeight : 0, matched, titleMatched };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function retrieve(query: string, chunks: readonly KnowledgeChunk[], limit = 4): KnowledgeChunk[] {
  return scoreChunks(query, chunks)
    .slice(0, limit)
    .map((entry) => entry.chunk);
}
