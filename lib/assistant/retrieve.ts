/*
 * Retrieval over the knowledge pack: small lexical scorer (TF with IDF, title boosted). PURE.
 *
 * Why lexical: the pack is ~45 short chunks of our own copy. Embeddings would add a second
 * provider (and a second data path) for no measurable gain at this size.
 * Contract: returns at most `limit` chunks with score > 0, best first; [] when nothing matches,
 * in which case the model is told there is no published information and must say so.
 */
import type { KnowledgeChunk } from "./knowledge.ts";

const STOPWORDS = new Set(
  "the and for with that this have from are you your what how can does about will would could should there their they them our out any all not but its it's who why when where which into than then also just like get got use used using more some need want tell please help drylake".split(
    " "
  )
);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map((word) => (word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word));
}

export function retrieve(query: string, chunks: readonly KnowledgeChunk[], limit = 4): KnowledgeChunk[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0) return [];

  const docs = chunks.map((chunk) => ({
    chunk,
    title: new Set(tokenize(chunk.title)),
    body: tokenize(chunk.text),
  }));

  const idf = new Map<string, number>();
  for (const term of terms) {
    const containing = docs.filter((doc) => doc.title.has(term) || doc.body.includes(term)).length;
    idf.set(term, Math.log(1 + (docs.length + 1) / (containing + 1)));
  }

  return docs
    .map((doc) => {
      let score = 0;
      for (const term of terms) {
        const tf = doc.body.filter((word) => word === term).length;
        score += (idf.get(term) ?? 0) * (Math.min(tf, 3) + (doc.title.has(term) ? 3 : 0));
      }
      return { chunk: doc.chunk, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.chunk);
}
