import type { Book, Event, State } from "./store";

/** Saved progress lives only in this browser. Bump the key if the format changes. */
export const STORAGE_KEY = "swipepage:session:v1";
const MAX_EVENTS = 4000;

export type SavedSession = Pick<State, "user" | "genres" | "premium" | "transitions" | "selectedBook" | "history" | "feedReason" | "feedMode" | "events" | "bookmarks" | "owned"> & { published?: Book[] };

/** Merges runs of one-second dwell ticks into a single event so the log stays small. */
export function compactEvents(events: Event[]): Event[] {
  const out: Event[] = [];
  for (const e of events) {
    const last = out.at(-1);
    if (e.type === "dwell" && last?.type === "dwell" && last.bookId === e.bookId) out[out.length - 1] = { ...last, seconds: last.seconds + e.seconds };
    else out.push(e);
  }
  return out.slice(0, MAX_EVENTS);
}

export function serialize(s: State): string {
  const saved: SavedSession = {
    user: s.user, genres: s.genres, premium: s.premium, transitions: s.transitions,
    selectedBook: s.selectedBook, history: s.history.slice(-200), feedReason: s.feedReason, feedMode: s.feedMode,
    events: compactEvents(s.events), bookmarks: s.bookmarks, owned: s.owned,
    published: s.books.filter((b) => b.id.startsWith("u")),
  };
  return JSON.stringify(saved);
}

/** Reads saved progress, dropping anything that doesn't match the current catalogue. */
export function deserialize(raw: string | null, catalogue: Book[]): Partial<SavedSession> | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<SavedSession>;
    if (!s || typeof s !== "object") return null;
    const published = Array.isArray(s.published) ? s.published.filter((b) => b && typeof b.id === "string" && b.id.startsWith("u")) : [];
    const ids = new Set([...catalogue.map((b) => b.id), ...published.map((b) => b.id)]);
    const known = (id: unknown) => typeof id === "string" && ids.has(id);
    return {
      user: s.user && typeof s.user.name === "string" ? s.user : null,
      genres: Array.isArray(s.genres) ? s.genres.filter((g) => typeof g === "string") : [],
      premium: !!s.premium,
      transitions: typeof s.transitions === "number" ? s.transitions : 0,
      selectedBook: known(s.selectedBook) ? s.selectedBook! : null,
      history: Array.isArray(s.history) ? s.history.filter(known) : [],
      feedReason: typeof s.feedReason === "string" ? s.feedReason : null,
      feedMode: s.feedMode === "random" ? "random" : "personal",
      events: Array.isArray(s.events) ? s.events.filter((e) => e && typeof e.type === "string" && typeof e.at === "number" && known(e.bookId)) : [],
      bookmarks: s.bookmarks && typeof s.bookmarks === "object" ? s.bookmarks : {},
      owned: s.owned && typeof s.owned === "object" ? s.owned : {},
      published,
    };
  } catch {
    return null;
  }
}

export function loadSession(catalogue: Book[]) {
  try { return deserialize(window.localStorage.getItem(STORAGE_KEY), catalogue); } catch { return null; }
}

export function saveSession(s: State) {
  try { window.localStorage.setItem(STORAGE_KEY, serialize(s)); } catch { /* storage full or blocked: progress just isn't kept */ }
}
