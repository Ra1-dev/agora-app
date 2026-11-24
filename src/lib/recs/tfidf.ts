// TF-IDF over session text (kickoff: title, abstract, track label, speaker topic tags).
import { terms } from "./tokenize";

export type SessionDoc = {
  id: string | number;
  title: string;
  abstract: string;
  trackName: string;
  speakerTags: readonly string[];
  speakerNames: readonly string[];
};

export type SparseVector = Map<string, number>;

export type TfidfIndex = {
  idf: Map<string, number>;
  vectors: Map<SessionDoc["id"], SparseVector>;
  docCount: number;
};

/** Field weights: titles and curated speaker tags say more about a session than its abstract. */
export const FIELD_WEIGHTS = { title: 2, abstract: 1, track: 1, tags: 2, speakers: 1 } as const;

function addInto(target: Map<string, number>, source: Map<string, number>, weight: number) {
  for (const [term, count] of source) target.set(term, (target.get(term) ?? 0) + count * weight);
}

function docTermCounts(doc: SessionDoc): Map<string, number> {
  const counts = new Map<string, number>();
  addInto(counts, terms(doc.title), FIELD_WEIGHTS.title);
  addInto(counts, terms(doc.abstract), FIELD_WEIGHTS.abstract);
  addInto(counts, terms(doc.trackName), FIELD_WEIGHTS.track);
  for (const tag of doc.speakerTags) addInto(counts, terms(tag), FIELD_WEIGHTS.tags);
  for (const name of doc.speakerNames) addInto(counts, terms(name), FIELD_WEIGHTS.speakers);
  return counts;
}

function normalize(vector: SparseVector): SparseVector {
  let sum = 0;
  for (const v of vector.values()) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vector;
  for (const [k, v] of vector) vector.set(k, v / norm);
  return vector;
}

/** Sublinear TF × smoothed IDF, L2-normalised. Terms outside the vocabulary are dropped. */
export function vectorize(index: Pick<TfidfIndex, "idf">, counts: Map<string, number>): SparseVector {
  const vector: SparseVector = new Map();
  for (const [term, count] of counts) {
    const idf = index.idf.get(term);
    if (idf === undefined || count <= 0) continue;
    vector.set(term, (1 + Math.log(count)) * idf);
  }
  return normalize(vector);
}

export function buildIndex(docs: readonly SessionDoc[]): TfidfIndex {
  const counts = docs.map((doc) => [doc.id, docTermCounts(doc)] as const);
  const df = new Map<string, number>();
  for (const [, c] of counts) for (const term of c.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  const n = docs.length;
  const idf = new Map<string, number>();
  for (const [term, d] of df) idf.set(term, Math.log((1 + n) / (1 + d)) + 1);
  const index: TfidfIndex = { idf, vectors: new Map(), docCount: n };
  for (const [id, c] of counts) index.vectors.set(id, vectorize(index, c));
  return index;
}

/** Cosine similarity of two L2-normalised vectors. */
export function cosine(a: SparseVector, b: SparseVector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, v] of small) {
    const w = large.get(term);
    if (w !== undefined) dot += v * w;
  }
  return dot;
}

/** Query vector for free text (search) or one declared interest. */
export function textVector(index: TfidfIndex, text: string): SparseVector {
  return vectorize(index, terms(text));
}
