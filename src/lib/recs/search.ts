// Program search (FR-10, FR-11): sessions by title, abstract, topic tags, track and speaker names,
// ranked by relevance. TF-IDF handles whole words; substring matches catch half-typed queries.
import { cosine, textVector, type SessionDoc, type TfidfIndex } from "./tfidf";

export type SearchHit = { sessionId: SessionDoc["id"]; score: number };

const BOOST = { speaker: 0.6, title: 0.5, tag: 0.3, track: 0.3, abstract: 0.1 } as const;

export function searchSessions(index: TfidfIndex, docs: readonly SessionDoc[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const vector = textVector(index, q);
  const hits: SearchHit[] = [];
  for (const doc of docs) {
    const docVector = index.vectors.get(doc.id);
    let score = docVector && vector.size > 0 ? cosine(docVector, vector) : 0;
    if (doc.speakerNames.some((n) => n.toLowerCase().includes(q))) score += BOOST.speaker;
    if (doc.title.toLowerCase().includes(q)) score += BOOST.title;
    if (doc.speakerTags.some((t) => t.toLowerCase().includes(q))) score += BOOST.tag;
    if (doc.trackName.toLowerCase() === q) score += BOOST.track;
    else if (doc.abstract.toLowerCase().includes(q)) score += BOOST.abstract;
    if (score > 0) hits.push({ sessionId: doc.id, score });
  }
  return hits.sort((a, b) => b.score - a.score || String(a.sessionId).localeCompare(String(b.sessionId)));
}
