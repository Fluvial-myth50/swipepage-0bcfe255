import type { Book, Event } from "./store";

export type Rec = {
  score: number; // 0–100 predicted interest
  reasons: string[]; // human-readable "why", strongest first
  tier: "hot" | "warm" | "cold";
};

export type RecoState = {
  recs: Record<string, Rec>;
  genreAffinity: Record<string, number>; // 0–1 taste share per genre
  globalAvgDwell: number;
  signals: number; // how much evidence the model has
};

// Model weights — dwell time is the strongest signal, then pull direction,
// then ownership, bookmarking and genre taste.
const W = { dwell: 0.4, pull: 0.2, own: 0.15, mark: 0.1, genre: 0.15 };

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export function computeReco(books: Book[], events: Event[]): RecoState {
  const dwells = events.filter((e) => e.type === "dwell");
  const globalAvgDwell = dwells.length ? dwells.reduce((a, e) => a + e.seconds, 0) / dwells.length : 0;
  const signals = events.filter((e) => e.type !== "ad" && e.type !== "publish").length;

  type Acc = {
    dwellSum: number; dwellCount: number; next: number; prev: number;
    own: number; marked: boolean; purchases: number;
  };
  const acc: Record<string, Acc> = {};
  for (const b of books) acc[b.id] = { dwellSum: 0, dwellCount: 0, next: 0, prev: 0, own: 0, marked: false, purchases: 0 };

  for (const e of events) {
    const a = acc[e.bookId];
    if (!a) continue;
    if (e.type === "dwell") { a.dwellSum += e.seconds; a.dwellCount++; }
    else if (e.type === "swipe") e.direction === "next" ? a.next++ : a.prev++;
    else if (e.type === "purchase") { a.own = Math.max(a.own, e.tier === "deluxe" ? 1 : 0.6); a.purchases++; }
    else if (e.type === "bookmark") a.marked = true;
  }

  // Genre taste: share of total dwell seconds, with a boost for purchases.
  const genreDwell: Record<string, number> = {};
  let totalDwell = 0;
  for (const e of dwells) {
    const g = books.find((b) => b.id === e.bookId)?.genre;
    if (!g) continue;
    genreDwell[g] = (genreDwell[g] ?? 0) + e.seconds;
    totalDwell += e.seconds;
  }
  const genreAffinity: Record<string, number> = {};
  for (const b of books) {
    const share = totalDwell ? (genreDwell[b.genre] ?? 0) / totalDwell : 0;
    const boost = 0.25 * (acc[b.id]?.purchases ?? 0);
    genreAffinity[b.genre] = clamp(Math.max(genreAffinity[b.genre] ?? 0, share + boost));
  }

  const recs: Record<string, Rec> = {};
  for (const b of books) {
    const a = acc[b.id];
    if (!a) continue;
    const avgDwell = a.dwellCount ? a.dwellSum / a.dwellCount : 0;
    const ratio = globalAvgDwell ? avgDwell / globalAvgDwell : 0;
    // Neutral 0.5 when the model has no evidence at all; unknown-per-book is
    // slightly below neutral so observed interest always outranks silence.
    const dwellNorm = globalAvgDwell ? clamp((ratio - 0.6) / 1.4) : 0.5;
    const swipes = a.next + a.prev;
    const pullNorm = swipes ? (a.next - a.prev) / swipes / 2 + 0.5 : 0.5;
    const markNorm = a.marked ? 1 : 0;
    const genreNorm = genreAffinity[b.genre] ?? 0;

    const score = Math.round(100 * (W.dwell * dwellNorm + W.pull * pullNorm + W.own * a.own + W.mark * markNorm + W.genre * genreNorm));

    const reasons: [number, string][] = [];
    if (a.dwellCount && ratio > 1.05) reasons.push([W.dwell, `You lingered ${Math.round(avgDwell)}s here — ${ratio.toFixed(1)}× your average`]);
    if (a.dwellCount && ratio <= 1.05 && ratio > 0) reasons.push([W.dwell * 0.6, `Held your attention ${Math.round(avgDwell)}s`]);
    if (swipes >= 2 && a.next > a.prev) reasons.push([W.pull, `You keep swiping forward from this one`]);
    if (swipes >= 2 && a.prev > a.next) reasons.push([W.pull * 0.7, `You usually double back past this one`]);
    if (a.own === 1) reasons.push([W.own, `You bought the Deluxe edition`]);
    else if (a.own > 0) reasons.push([W.own, `You bought it`]);
    if (a.marked) reasons.push([W.mark, `You bookmarked it`]);
    if (totalDwell && genreNorm > 0.25) reasons.push([W.genre, `${b.genre} is your most-read genre`]);
    reasons.sort((x, y) => y[0] - x[0]);

    const tier: Rec["tier"] = score >= 65 ? "hot" : score >= 40 ? "warm" : "cold";
    const cold = signals < 3;
    recs[b.id] = {
      score,
      reasons: cold ? ["Keep swiping — I'm still learning what you like"] : reasons.slice(0, 3).map(([, r]) => r),
      tier: cold ? "cold" : tier,
    };
  }

  return { recs, genreAffinity, globalAvgDwell, signals };
}
