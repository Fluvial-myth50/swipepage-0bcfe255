import type { Book, Event, FeedMode } from "./store";

/**
 * SwipePage recommendation model.
 *
 * Everything is derived from the session's event log, so the feed reacts the
 * moment a reader does something:
 *
 * 1. Each time a card is shown is a *visit*. Seconds spent on it, opening the
 *    full book, saving it and buying it all raise that book's engagement.
 *    Swiping away within a few seconds is a *quick skip* and lowers it.
 * 2. Genre taste blends the genres picked at sign-up (a prior) with the
 *    engagement of every book read in that genre, so real behaviour
 *    overrides the sign-up choices after a few cards.
 * 3. Authors and themes (Gothic, sea voyage, detective…) the reader engaged
 *    with boost other books that share them, across genres.
 * 4. Unseen books are ranked by predicted interest, with a small penalty for
 *    repeating the same genre too many times in a row, and every fifth card
 *    is an exploration pick from the least-seen genre so the feed never
 *    collapses into one shelf.
 */

export type Rec = {
  score: number; // 0–100 predicted interest
  reasons: string[]; // human-readable "why", strongest first
  tier: "hot" | "warm" | "cold";
};

export type BookStats = {
  visits: number; dwell: number; skips: number;
  opened: boolean; bookmarked: boolean; purchased: boolean;
  engagement: number; // 0–1
  lastSeen: number; // timestamp of the latest event for this book
};

export type RecoState = {
  recs: Record<string, Rec>;
  stats: Record<string, BookStats>;
  genreAffinity: Record<string, number>; // 0–1 predicted taste per genre
  authorAffinity: Record<string, number>; // 0–1, only for authors already read
  themeAffinity: Record<string, number>; // 0–1, only for themes already read
  globalAvgDwell: number; // average seconds per visit
  signals: number; // completed visits + explicit actions
};

export const QUICK_SKIP_SECONDS = 3;
export const EXPLORE_EVERY = 5;
export const DWELL_HALF_LIFE = 25; // seconds of reading that count as "strong" interest
const MAX_VISIT_SECONDS = 180; // ignore a card left open on screen
const PRIOR_WEIGHT = 2; // how many books the sign-up choice is "worth"
export const PRIOR_PICKED = 0.65, PRIOR_OTHER = 0.35, PRIOR_NEUTRAL = 0.5;
const AUTHOR_WEIGHT = 0.4, THEME_WEIGHT = 0.35;

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const dwellScore = (seconds: number) => 1 - Math.exp(-seconds / DWELL_HALF_LIFE);
const matchesGenre = (genre: string, picks: string[]) => picks.some((g) => g.toLowerCase() === genre.toLowerCase());
export const themesOf = (b: Book) => (b.tags ?? []).filter((t) => t !== b.genre);

/** Stable pseudo-random number in [0, 1) so ties don't always follow catalogue order. */
function jitter(id: string, seed: string) {
  let h = 2166136261;
  for (const c of id + "|" + seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

function emptyStats(): BookStats {
  return { visits: 0, dwell: 0, skips: 0, opened: false, bookmarked: false, purchased: false, engagement: 0, lastSeen: 0 };
}

type Visit = { bookId: string; seconds: number; mode: FeedMode };

/**
 * Replays the event log (stored newest-first) into reading visits. Each visit
 * runs from a card being shown until the next card, and ends as a quick skip
 * when the reader swipes on within QUICK_SKIP_SECONDS.
 */
function replay(events: Event[], onVisit: (v: Visit, skipped: boolean) => void, onOther: (e: Event) => void) {
  let visit = null as Visit | null;
  const close = (skipped = false) => {
    const v = visit;
    visit = null;
    if (v && (v.seconds > 0 || skipped)) onVisit(v, skipped);
  };
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    const v = visit as Visit | null;
    switch (e.type) {
      case "view": close(); visit = { bookId: e.bookId, seconds: 0, mode: e.mode ?? "personal" }; break;
      case "dwell":
        if (v?.bookId === e.bookId) v.seconds += e.seconds;
        else { close(); visit = { bookId: e.bookId, seconds: e.seconds, mode: "personal" }; }
        break;
      case "swipe":
        if (v?.bookId !== e.bookId) break;
        close(e.direction === "next" && v.seconds < QUICK_SKIP_SECONDS);
        break;
      default: onOther(e);
    }
  }
  close();
}

/** Per-book statistics from the event log. */
export function bookStats(books: Book[], events: Event[]): Record<string, BookStats> {
  const stats: Record<string, BookStats> = {};
  for (const b of books) stats[b.id] = emptyStats();
  for (const e of events) { const s = stats[e.bookId]; if (s && e.at > s.lastSeen) s.lastSeen = e.at; }
  replay(events, (v, skipped) => {
    const s = stats[v.bookId]; if (!s) return;
    if (skipped) s.skips++;
    else { s.visits++; s.dwell += Math.min(v.seconds, MAX_VISIT_SECONDS); }
  }, (e) => {
    const s = stats[e.bookId]; if (!s) return;
    if (e.type === "open") s.opened = true;
    else if (e.type === "bookmark") s.bookmarked = !s.bookmarked; // the button toggles
    else if (e.type === "purchase") s.purchased = true;
  });
  for (const s of Object.values(stats)) {
    s.engagement = clamp(dwellScore(s.dwell) + (s.opened ? 0.3 : 0) + (s.bookmarked ? 0.2 : 0) + (s.purchased ? 0.4 : 0) - 0.25 * s.skips);
  }
  return stats;
}

export type ModeResult = { cards: number; avgSeconds: number; skipRate: number };

/** Compares how long cards held attention in the personalised vs random feed. */
export function compareModes(events: Event[]): Record<FeedMode, ModeResult> {
  const acc: Record<FeedMode, { cards: number; seconds: number; skips: number }> = { personal: { cards: 0, seconds: 0, skips: 0 }, random: { cards: 0, seconds: 0, skips: 0 } };
  replay(events, (v, skipped) => {
    const a = acc[v.mode];
    a.cards++; a.seconds += Math.min(v.seconds, MAX_VISIT_SECONDS); if (skipped) a.skips++;
  }, () => {});
  const out = {} as Record<FeedMode, ModeResult>;
  for (const m of ["personal", "random"] as const) {
    const a = acc[m];
    out[m] = { cards: a.cards, avgSeconds: a.cards ? a.seconds / a.cards : 0, skipRate: a.cards ? a.skips / a.cards : 0 };
  }
  return out;
}

const seen = (s: BookStats | undefined) => !!s && (s.visits > 0 || s.skips > 0 || s.opened || s.bookmarked || s.purchased);

export function computeReco(books: Book[], events: Event[], picks: string[] = []): RecoState {
  const stats = bookStats(books, events);
  const visits = Object.values(stats).reduce((a, s) => a + s.visits, 0);
  const totalDwell = Object.values(stats).reduce((a, s) => a + s.dwell, 0);
  const signals = Object.values(stats).reduce((a, s) => a + s.visits + s.skips + (s.opened ? 1 : 0) + (s.bookmarked ? 1 : 0) + (s.purchased ? 1 : 0), 0);

  type Sum = Record<string, { sum: number; n: number }>;
  const add = (m: Sum, k: string, v: number) => { m[k] ??= { sum: 0, n: 0 }; m[k]!.sum += v; m[k]!.n++; };
  const genreSum: Sum = {}, authorSum: Sum = {}, themeSum: Sum = {};
  for (const b of books) {
    genreSum[b.genre] ??= { sum: 0, n: 0 };
    const s = stats[b.id];
    if (!seen(s)) continue;
    add(genreSum, b.genre, s!.engagement);
    add(authorSum, b.author, s!.engagement);
    for (const t of themesOf(b)) add(themeSum, t, s!.engagement);
  }
  // Genre taste: Bayesian average of the sign-up prior and observed engagement.
  const genreAffinity: Record<string, number> = {};
  for (const [g, { sum, n }] of Object.entries(genreSum)) {
    const prior = picks.length ? (matchesGenre(g, picks) ? PRIOR_PICKED : PRIOR_OTHER) : PRIOR_NEUTRAL;
    genreAffinity[g] = (PRIOR_WEIGHT * prior + sum) / (PRIOR_WEIGHT + n);
  }
  const mean = (m: Sum) => Object.fromEntries(Object.entries(m).map(([k, { sum, n }]) => [k, sum / n]));
  const authorAffinity = mean(authorSum), themeAffinity = mean(themeSum);

  // The most-read book matching a filter, used in explanations.
  const best = (match: (b: Book) => boolean) => books.filter((b) => match(b) && (stats[b.id]?.dwell ?? 0) >= 8)
    .sort((x, y) => stats[y.id]!.dwell - stats[x.id]!.dwell)[0];

  const recs: Record<string, Rec> = {};
  for (const b of books) {
    const s = stats[b.id]!;
    const g = genreAffinity[b.genre] ?? PRIOR_NEUTRAL;
    const reasons: string[] = [];
    let score: number;
    if (seen(s)) {
      score = s.engagement;
      if (s.purchased) reasons.push("You bought it");
      if (s.opened) reasons.push("You opened the full book");
      if (s.bookmarked) reasons.push("You saved it");
      if (s.dwell >= 10) reasons.push(`You read the opening for ${Math.round(s.dwell)}s`);
      if (s.skips) reasons.push("You skipped it quickly");
    } else {
      // Blend genre taste with author and theme evidence, trusting each more as it grows.
      const author = authorSum[b.author];
      const wA = author ? AUTHOR_WEIGHT * author.n / (author.n + 1) : 0;
      const known = themesOf(b).filter((t) => themeSum[t]);
      const evidence = known.reduce((a, t) => a + themeSum[t]!.n, 0);
      const themeScore = known.length ? known.reduce((a, t) => a + themeAffinity[t]!, 0) / known.length : 0;
      const wT = known.length ? THEME_WEIGHT * evidence / (evidence + 1) : 0;
      score = (1 - wA - wT) * g + wA * (authorAffinity[b.author] ?? 0) + wT * themeScore;

      const byAuthor = author && authorAffinity[b.author]! >= 0.4 ? best((x) => x.author === b.author) : undefined;
      const liked = known.filter((t) => themeAffinity[t]! >= 0.4).sort((x, y) => themeAffinity[y]! - themeAffinity[x]!)[0];
      const byTheme = liked ? best((x) => x !== byAuthor && themesOf(x).includes(liked)) : undefined;
      const inGenre = best((x) => x.genre === b.genre);
      if (byAuthor) reasons.push(`More from ${b.author}: you spent ${Math.round(stats[byAuthor.id]!.dwell)}s on ${byAuthor.title}`);
      if (byTheme && liked && byTheme !== byAuthor) reasons.push(`${liked}, like ${byTheme.title}, which you read for ${Math.round(stats[byTheme.id]!.dwell)}s`);
      if (inGenre && inGenre !== byAuthor && inGenre !== byTheme) reasons.push(`Because you spent ${Math.round(stats[inGenre.id]!.dwell)}s on ${inGenre.title}`);
      if (matchesGenre(b.genre, picks)) reasons.push(`You picked ${b.genre} when you signed up`);
    }
    const value = Math.round(100 * clamp(score));
    recs[b.id] = { score: value, reasons, tier: value >= 60 ? "hot" : value >= 40 ? "warm" : "cold" };
  }

  return { recs, stats, genreAffinity, authorAffinity, themeAffinity, globalAvgDwell: visits ? totalDwell / visits : 0, signals };
}

export type Pick = { id: string; reason: string; explore: boolean };
export type PickOptions = { seed?: string | undefined; mode?: FeedMode | undefined; random?: (() => number) | undefined };

/**
 * Chooses the next card. `recent` lists the cards already shown this session,
 * oldest first (the current card last). In "random" mode it ignores the model
 * entirely, which gives a baseline to compare the personalised feed against.
 */
export function pickNext(books: Book[], events: Event[], picks: string[], recent: string[], opts: PickOptions = {}): Pick | null {
  if (!books.length) return null;
  const { seed = "swipepage", mode = "personal", random = Math.random } = opts;
  const reco = computeReco(books, events, picks);
  const current = recent.at(-1);
  const shown = new Set(recent);
  let pool = books.filter((b) => !shown.has(b.id) && !seen(reco.stats[b.id]));
  if (!pool.length) pool = books.filter((b) => b.id !== current); // whole shelf seen: start a new round
  if (!pool.length) pool = books;

  if (mode === "random") {
    const choice = pool[Math.floor(random() * pool.length)] ?? pool[0]!;
    return { id: choice.id, reason: "Random pick: comparison mode is on", explore: false };
  }

  const genreOf = new Map(books.map((b) => [b.id, b.genre]));
  const lastGenres = recent.slice(-3).map((id) => genreOf.get(id));
  const rank = (b: Book) => reco.recs[b.id]!.score / 100
    - 0.05 * lastGenres.filter((g) => g === b.genre).length
    + 0.03 * jitter(b.id, seed);
  const sorted = [...pool].sort((x, y) => rank(y) - rank(x));

  // Exploration: every fifth card comes from the genre the reader has seen least.
  const position = recent.length;
  if (position > 0 && position % EXPLORE_EVERY === EXPLORE_EVERY - 1) {
    const exposure: Record<string, number> = {};
    for (const b of books) exposure[b.genre] ??= 0;
    for (const id of recent) { const g = genreOf.get(id); if (g) exposure[g] = (exposure[g] ?? 0) + 1; }
    const genres = [...new Set(pool.map((b) => b.genre))].filter((g) => g !== genreOf.get(current ?? ""));
    const target = genres.sort((a, b) => (exposure[a] ?? 0) - (exposure[b] ?? 0) || (reco.genreAffinity[b] ?? 0) - (reco.genreAffinity[a] ?? 0))[0];
    const choice = target ? sorted.find((b) => b.genre === target) : undefined;
    if (choice) return { id: choice.id, reason: `A change of pace: something from ${choice.genre}`, explore: true };
  }

  const top = sorted[0]!;
  const why = reco.recs[top.id]!.reasons[0];
  return { id: top.id, reason: why ?? (reco.signals ? `Something new in ${top.genre}` : `A classic to start with`), explore: false };
}
