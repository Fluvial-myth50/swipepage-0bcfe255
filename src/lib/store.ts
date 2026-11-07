import { useSyncExternalStore } from "react";
import { splitRevenue } from "./economy";
import { purchasePrice } from "./poc";
import { CURATED_BOOKS } from "./curated-catalogue";
import { loadSession, saveSession } from "./persist";

export type PassageInfo = { text: string; reasons: string[]; position: number; isOpening: boolean; from: "full-text" | "opening" };

export type Book = {
  id: string; title: string; author: string; genre: string; hook: string;
  body: string;
  /** The ~150-word passage shown on the feed card, and why it was chosen. */
  passage?: PassageInfo | undefined;
  tags?: string[]; bonus?: boolean; audiobook?: boolean; language?: string; source?: string; price: number; deluxePrice: number; hue: number; verified: boolean;
};
export type FeedMode = "personal" | "random";
export type Event =
  | { type: "view"; bookId: string; at: number; mode?: FeedMode }
  | { type: "dwell"; bookId: string; seconds: number; at: number }
  | { type: "swipe"; bookId: string; direction: "next" | "prev"; at: number }
  | { type: "open"; bookId: string; at: number }
  | { type: "purchase"; bookId: string; tier: "standard" | "deluxe"; price: number; author: number; platform: number; at: number }
  | { type: "bookmark"; bookId: string; at: number }
  | { type: "publish"; bookId: string; at: number }
  | { type: "ad"; bookId: string; slot: "feed" | "reader"; at: number };

export type DemoUser = { name: string; role: "reader" | "writer" | "admin" };
export type ImportItem = { id: number; title: string; author: string; language: string; url: string; body: string; status: "Pending Processing" | "Scrambling DRM" | "Live in Feed" };
export type State = {
  catalogueStatus: "idle" | "loading" | "ready" | "partial"; catalogueError: string;
  user: DemoUser | null; genres: string[]; premium: boolean; transitions: number;
  /** The card currently on screen in the feed (kept here so it survives page changes). */
  selectedBook: string | null;
  /** Cards already shown, oldest first, for the "previous" button. */
  history: string[];
  /** Why the algorithm chose the card on screen. */
  feedReason: string | null;
  /** "random" turns personalisation off, to compare against the real feed. */
  feedMode: FeedMode;
  /** False until saved progress has been loaded in the browser. */
  hydrated: boolean;
  queue: ImportItem[]; books: Book[]; events: Event[];
  bookmarks: Record<string, boolean>; owned: Record<string, "standard" | "deluxe">;
};
const initial = (): State => ({ catalogueStatus: "ready", catalogueError: "", user: null, genres: [], premium: false, transitions: 0, selectedBook: null, history: [], feedReason: null, feedMode: "personal", hydrated: false, queue: [], books: [...CURATED_BOOKS], events: [], bookmarks: {}, owned: {} });
let state: State = initial();
const listeners = new Set<() => void>();
const set = (fn: (s: State) => State) => { state = fn(state); listeners.forEach((l) => l()); };

// What the server rendered: hydration must match this even after saved progress loads.
const serverState = state;
export const useStore = <T,>(sel: (s: State) => T) =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => sel(state), () => sel(serverState));

export const getDemoState = () => state;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveSession(state); }, 1500);
}
if (typeof window !== "undefined") window.addEventListener("pagehide", () => { if (state.hydrated) saveSession(state); });
export const actions = {
  catalogueStatus: (status: State["catalogueStatus"], error: string) => set((s) => ({ ...s, catalogueStatus: status, catalogueError: error })),
  addBooks: (books: Book[]) => set((s) => { const ids = new Set(s.books.map((b) => b.id)); return { ...s, books: [...s.books, ...books.filter((b) => !ids.has(b.id))] }; }),
  bookText: (id: string, body: string, hook: string) => set((s) => ({ ...s, books: s.books.map((b) => b.id === id ? { ...b, body, hook } : b) })),
  login: (user: DemoUser, genres: string[]) => set((s) => ({ ...s, user, genres })),
  /** Logging out wipes the whole demo session, including what the feed has learned. */
  logout: () => set((s) => ({ ...initial(), books: s.books, queue: s.queue, hydrated: true })),
  /** Forget what the feed has learned (reading history and saves); keep the account and purchases. */
  resetTaste: () => set((s) => ({ ...s, events: s.events.filter((e) => e.type === "purchase" || e.type === "publish"), history: [], selectedBook: null, feedReason: null, transitions: 0, bookmarks: {} })),
  feedMode: (feedMode: FeedMode) => set((s) => ({ ...s, feedMode })),
  /** Load saved progress from this browser (call once, on the client). */
  hydrate: () => {
    if (state.hydrated) return;
    const saved = loadSession(CURATED_BOOKS);
    set((s) => saved ? { ...s, ...saved, books: [...(saved.published ?? []), ...s.books.filter((b) => !b.id.startsWith("u"))], hydrated: true } : { ...s, hydrated: true });
    listeners.add(() => scheduleSave());
  },
  subscribe: () => set((s) => ({ ...s, premium: true, transitions: 0 })),
  preferences: (genres: string[]) => set((s) => ({ ...s, genres })),
  /** Jump straight to a book (from search or the library). */
  selectBook: (id: string, reason = "You picked this one") => set((s) => ({ ...s, selectedBook: id, feedReason: reason, history: s.selectedBook && s.selectedBook !== id ? [...s.history, s.selectedBook] : s.history })),
  /** Move the feed forward to a new card. */
  showNext: (id: string, reason: string) => set((s) => ({ ...s, selectedBook: id, feedReason: reason, history: s.selectedBook ? [...s.history, s.selectedBook] : s.history })),
  /** Step back to the previous card, if there is one. */
  showPrevious: () => { const prev = state.history.at(-1); if (!prev) return null; set((s) => ({ ...s, selectedBook: prev, feedReason: "You went back to this one", history: s.history.slice(0, -1) })); return prev; },
  transition: () => { const n = state.transitions + 1; set((s) => ({ ...s, transitions: n })); return n; },
  enqueue: (item: ImportItem) => set((s) => ({ ...s, queue: s.queue.some((q) => q.id === item.id) ? s.queue : [...s.queue, item] })),
  queueStatus: (id: number, status: ImportItem["status"]) => set((s) => ({ ...s, queue: s.queue.map((q) => q.id === id ? { ...q, status } : q) })),
  log: (e: Event) => set((s) => ({ ...s, events: [e, ...s.events] })),
  bookmark: (bookId: string) => {
    set((s) => ({ ...s, bookmarks: { ...s.bookmarks, [bookId]: !s.bookmarks[bookId] } }));
    actions.log({ type: "bookmark", bookId, at: Date.now() });
  },
  purchase: (book: Book, tier: "standard" | "deluxe") => {
    const price = purchasePrice(tier === "deluxe" ? book.deluxePrice : book.price, state.premium);
    set((s) => ({ ...s, owned: { ...s.owned, [book.id]: tier } }));
    actions.log({ type: "purchase", bookId: book.id, tier, price, ...splitRevenue(price), at: Date.now() });
  },
  publish: (b: Omit<Book, "id">) => {
    const id = "u" + crypto.randomUUID();
    set((s) => ({ ...s, books: [{ ...b, id }, ...s.books] }));
    actions.log({ type: "publish", bookId: id, at: Date.now() });
    return id;
  },
};
