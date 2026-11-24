// Text → terms for TF-IDF: lowercase words with a light plural stem, plus adjacent bigrams
// so declared phrases like "Edge AI" match as a phrase as well as word by word.

const STOPWORDS = new Set(
  (
    "a about above after again against all am an and any are as at be because been before being below between both but by " +
    "can could did do does doing down during each few for from further had has have having he her here hers him his how i " +
    "if in into is it its itself just me more most my no nor not now of off on once only or other our ours out over own " +
    "same she should so some such than that the their them then there these they this those through to too under until up " +
    "very was we were what when where which while who whom why will with you your yours how new use using via vs also " +
    "can't don't won't we'll we're you'll it's let's get gets one two three"
  ).split(" "),
);

/** Light plural stemming: "models" → "model", "studies" → "study". Keeps "ss", "us", "is" endings. */
export function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** Words in order, stopwords kept as `null` so bigrams never jump over them. */
function words(text: string): (string | null)[] {
  return (text.normalize("NFKD").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).map((w) =>
    STOPWORDS.has(w) || (w.length < 2 && !/\d/.test(w)) ? null : stem(w),
  );
}

/** Term counts for a text: unigrams and bigrams ("edge", "ai", "edge ai"). */
export function terms(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (t: string) => counts.set(t, (counts.get(t) ?? 0) + 1);
  const seq = words(text);
  seq.forEach((w, i) => {
    if (w === null) return;
    add(w);
    const next = seq[i + 1];
    if (next) add(`${w} ${next}`);
  });
  return counts;
}
