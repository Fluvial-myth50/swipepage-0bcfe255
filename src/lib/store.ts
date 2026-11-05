import { useSyncExternalStore } from "react";
import { splitRevenue } from "./economy";
import { purchasePrice } from "./poc";

export type Book = {
  id: string; title: string; author: string; genre: string; hook: string;
  body: string; tags?: string[]; bonus?: boolean; audiobook?: boolean; language?: string; source?: string; price: number; deluxePrice: number; hue: number; verified: boolean;
};
export type Event =
  | { type: "dwell"; bookId: string; seconds: number; at: number }
  | { type: "swipe"; bookId: string; direction: "next" | "prev"; at: number }
  | { type: "purchase"; bookId: string; tier: "standard" | "deluxe"; price: number; author: number; platform: number; at: number }
  | { type: "bookmark"; bookId: string; at: number }
  | { type: "publish"; bookId: string; at: number }
  | { type: "ad"; bookId: string; slot: "feed" | "reader"; at: number };

const lorem = (seed: string) =>
  Array.from({ length: 6 }, (_, i) => `${seed} ${["The corridor hummed with a quiet that was not silence.", "She counted the doors twice, and both times the number was wrong.", "Somewhere above, a radio played a song nobody had written yet.", "He kept the letter folded in his breast pocket like a second heart.", "By morning the river had changed its mind about which way to run.", "They agreed never to speak of it, which is how it became the only thing they spoke of."][i]} `.repeat(4)).join("\n\n");

const seed: Book[] = [
  { id: "b1", title: "The Salt Cartographer", author: "Ines Varga", genre: "Literary Fantasy", hue: 200, price: 9.99, deluxePrice: 16.99, verified: true,
    hook: "My grandmother drew maps of places that did not exist yet. Coastlines that the sea had not finished carving. Cities whose founders were still children. When she died, she left me a single chart, salt-stained and folded into sixteen squares, and a note that said only: Do not go to the island in the lower left corner. Of course I went. Everyone in my family has always gone. That is the problem with warnings written in ink — they read like invitations. The island was exactly where she drew it, though it had not been there the week before. The fishermen swore it rose out of the fog on a Tuesday. On the beach, someone had left a pair of boots my size, still warm. Inside the left one was another map. This one showed my house. And on it, in my grandmother's hand, a small red x over my bedroom, dated tomorrow.",
    body: lorem("") },
  { id: "b2", title: "Nine Minutes Past Never", author: "Dayo Adeyemi", genre: "Sci‑Fi Thriller", hue: 140, price: 7.99, deluxePrice: 13.99, verified: true,
    hook: "The clocks in Lagos stopped at 9:09 p.m., and nobody noticed for nine minutes. Then everybody noticed at once. Phones froze mid-call. Danfo buses idled with their doors half open. A woman on Third Mainland Bridge dropped an orange and watched it hang in the air, spinning, refusing to fall. I was the only one still moving. I know because I walked the length of Broad Street, touching shoulders, shouting into faces that did not blink. At 9:18 the world resumed, and the orange hit the asphalt, and a thousand people gasped as one — and every one of them turned to look at me. They remembered. Not the stopping, but me, walking among them like a ghost. By midnight my face was on every screen in the country, under a single word: WHY.",
    body: lorem("") },
  { id: "b3", title: "Velvet Static", author: "Maren Holt", genre: "Romance / Noir", hue: 340, price: 6.99, deluxePrice: 11.99, verified: true,
    hook: "He called the radio station every night at 2:14 a.m. and requested a song that did not exist. I was the night DJ, and the first three times I told him so, politely. The fourth time, I played static for three minutes and twenty seconds, just to see what he'd do. He said, 'Thank you. That's the one.' And then he hung up. The next night he called again and told me what I was wearing. Not in a cruel way — like he was reading it off a page, gently, surprised by it. Grey sweater, sleeve pushed up, a coffee ring on the cuff. I was alone in a soundproof room on the fourteenth floor. I should have called the police. Instead I asked him his name. He said I'd given it to him, years from now, and that I'd regret it.",
    body: lorem("") },
  { id: "b4", title: "The Orchard Below", author: "Teodor Lisk", genre: "Horror", hue: 30, price: 8.49, deluxePrice: 14.99, verified: true,
    hook: "Every apple tree in our orchard grew upside down, roots to the sky, and every autumn we harvested what hung beneath the soil. Father said it was nothing to fear. He said it the way men say things they've repeated so often the words have worn smooth. We dug with wooden spades, never metal, and we never dug at night. The fruit came up pale and cold, and when you held one to your ear you could hear breathing. We sold them in the city at triple the price of ordinary apples. People said they tasted like remembering. The year I turned sixteen, Father didn't come back from the far row. We found his spade standing upright in the earth. And under it, ripening slowly, something with his face.",
    body: lorem("") },
];
seed.forEach((b) => (b.body = b.hook + "\n\n" + b.body));

export type DemoUser = { name: string; role: "reader" | "writer" | "admin" };
export type ImportItem = { id: number; title: string; author: string; language: string; url: string; body: string; status: "Pending Processing" | "Scrambling DRM" | "Live in Feed" };
type State = { catalogueStatus: "idle" | "loading" | "ready" | "partial"; catalogueError: string; user: DemoUser | null; genres: string[]; premium: boolean; weights: Record<string, number>; transitions: number; selectedBook: string | null; queue: ImportItem[]; books: Book[]; events: Event[]; bookmarks: Record<string, boolean>; owned: Record<string, "standard" | "deluxe"> };
let state: State = { catalogueStatus: "idle", catalogueError: "", user: null, genres: [], premium: false, weights: {}, transitions: 0, selectedBook: null, queue: [], books: seed, events: [], bookmarks: {}, owned: {} };
const listeners = new Set<() => void>();
const set = (fn: (s: State) => State) => { state = fn(state); listeners.forEach((l) => l()); };

export const useStore = <T,>(sel: (s: State) => T) =>
  useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => sel(state), () => sel(state));

export const getDemoState = () => state;
export const actions = {
  catalogueStatus: (status: State["catalogueStatus"], error: string) => set((s) => ({ ...s, catalogueStatus: status, catalogueError: error })),
  addBooks: (books: Book[]) => set((s) => { const ids = new Set(s.books.map((b) => b.id)); return { ...s, books: [...s.books, ...books.filter((b) => !ids.has(b.id))] }; }),
  bookText: (id: string, body: string, hook: string) => set((s) => ({ ...s, books: s.books.map((b) => b.id === id ? { ...b, body, hook } : b) })),
  login: (user: DemoUser, genres: string[]) => set((s) => ({ ...s, user, genres })),
  logout: () => set((s) => ({ ...s, user: null, premium: false, genres: [], owned: {}, bookmarks: {}, weights: {}, transitions: 0 })),
  subscribe: () => set((s) => ({ ...s, premium: true, transitions: 0 })),
  preferences: (genres: string[]) => set((s) => ({ ...s, genres })),
  selectBook: (id: string) => set((s) => ({ ...s, selectedBook: id })),
  weight: (genre: string, points: number) => set((s) => ({ ...s, weights: { ...s.weights, [genre]: (s.weights[genre] ?? 0) + points } })),
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
