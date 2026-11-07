import { describe, it, expect } from "vitest";
import { bookStats, compareModes, computeReco, pickNext, EXPLORE_EVERY } from "./reco";
import { CURATED_BOOKS } from "./curated-catalogue";
import type { Book, Event } from "./store";

const books = CURATED_BOOKS;
const genreOf = (id: string) => books.find((b) => b.id === id)!.genre;

/** Simulates a reader using the real feed: each card is chosen by pickNext, then the reader reacts. */
function session(picks: string[], react: (book: Book) => { seconds: number; open?: boolean; save?: boolean }, cards = 15) {
  let events: Event[] = [];
  const shown: string[] = [];
  let t = 0;
  const log = (e: Event) => { events = [e, ...events]; };
  for (let i = 0; i < cards; i++) {
    const next = pickNext(books, events, picks, shown)!;
    shown.push(next.id);
    const book = books.find((b) => b.id === next.id)!;
    log({ type: "view", bookId: book.id, at: t++ });
    const r = react(book);
    for (let s = 0; s < r.seconds; s++) log({ type: "dwell", bookId: book.id, seconds: 1, at: t++ });
    if (r.open) log({ type: "open", bookId: book.id, at: t++ });
    if (r.save) log({ type: "bookmark", bookId: book.id, at: t++ });
    log({ type: "swipe", bookId: book.id, direction: "next", at: t++ });
  }
  return { events, shown };
}

describe("feed algorithm", () => {
  it("starts with the genres picked at sign-up", () => {
    const first = pickNext(books, [], ["Mystery"], [])!;
    expect(genreOf(first.id)).toBe("Mystery");
    expect(first.reason).toContain("You picked Mystery");
  });

  it("follows what the reader actually reads, even against their sign-up picks", () => {
    // Picked Romance, but skips romance in a second and lingers on Horror.
    const { shown } = session(["Romance"], (b) => ({ seconds: b.genre === "Horror" ? 40 : 1 }), 20);
    const later = shown.slice(10).map(genreOf);
    const horror = later.filter((g) => g === "Horror").length;
    const romance = later.filter((g) => g === "Romance").length;
    expect(horror).toBeGreaterThan(romance);
    expect(horror).toBeGreaterThanOrEqual(5);
  });

  it("demotes a picked genre after a few quick skips", () => {
    const { events } = session(["Romance"], (b) => ({ seconds: b.genre === "Romance" ? 1 : 15 }), 8);
    const { genreAffinity } = computeReco(books, events, ["Romance"]);
    const others = Object.entries(genreAffinity).filter(([g]) => g !== "Romance").map(([, v]) => v);
    expect(genreAffinity["Romance"]).toBeLessThan(Math.max(...others));
  });

  it("recommends more books by an author the reader loved", () => {
    const holmes = books.find((b) => b.id === "g1661")!; // The Adventures of Sherlock Holmes
    const events: Event[] = [
      { type: "swipe", bookId: holmes.id, direction: "next", at: 70 },
      { type: "open", bookId: holmes.id, at: 65 },
      ...Array.from({ length: 60 }, (_, i): Event => ({ type: "dwell", bookId: holmes.id, seconds: 1, at: 60 - i })),
      { type: "view", bookId: holmes.id, at: 0 },
    ];
    const next = pickNext(books, events, [], [holmes.id])!;
    const pick = books.find((b) => b.id === next.id)!;
    expect(pick.author).toBe("Arthur Conan Doyle");
    expect(next.reason).toContain("More from Arthur Conan Doyle");
  });

  it("never repeats a card until the whole shelf has been seen", () => {
    const { shown } = session([], () => ({ seconds: 2 }), books.length);
    expect(new Set(shown).size).toBe(books.length);
  });

  it(`explores a different genre every ${EXPLORE_EVERY}th card`, () => {
    const { shown } = session(["Horror"], (b) => ({ seconds: b.genre === "Horror" ? 30 : 1 }), 10);
    const explore = shown[EXPLORE_EVERY - 1]!;
    expect(genreOf(explore)).not.toBe("Horror");
  });

  it("measures dwell per visit, not per one-second tick", () => {
    const id = books[0]!.id;
    const events: Event[] = [
      ...Array.from({ length: 30 }, (_, i): Event => ({ type: "dwell", bookId: id, seconds: 1, at: 30 - i })),
      { type: "view", bookId: id, at: 0 },
    ];
    const reco = computeReco(books, events);
    expect(reco.stats[id]!.visits).toBe(1);
    expect(reco.stats[id]!.dwell).toBe(30);
    expect(reco.globalAvgDwell).toBe(30);
  });

  it("only counts a quick skip when the reader swipes away within 3 seconds", () => {
    const [a, b] = books;
    const events: Event[] = [
      { type: "swipe", bookId: b!.id, direction: "next", at: 9 },
      ...Array.from({ length: 5 }, (_, i): Event => ({ type: "dwell", bookId: b!.id, seconds: 1, at: 8 - i })),
      { type: "view", bookId: b!.id, at: 3 },
      { type: "swipe", bookId: a!.id, direction: "next", at: 2 },
      { type: "dwell", bookId: a!.id, seconds: 1, at: 1 },
      { type: "view", bookId: a!.id, at: 0 },
    ];
    const stats = bookStats(books, events);
    expect(stats[a!.id]!.skips).toBe(1);
    expect(stats[b!.id]!.skips).toBe(0);
  });

  it("treats saving twice as un-saving", () => {
    const id = books[0]!.id;
    const once = bookStats(books, [{ type: "bookmark", bookId: id, at: 1 }]);
    const twice = bookStats(books, [{ type: "bookmark", bookId: id, at: 2 }, { type: "bookmark", bookId: id, at: 1 }]);
    expect(once[id]!.bookmarked).toBe(true);
    expect(twice[id]!.bookmarked).toBe(false);
  });

  it("stays neutral across genres on a cold start with no picks", () => {
    const { genreAffinity, signals } = computeReco(books, []);
    expect(signals).toBe(0);
    expect(new Set(Object.values(genreAffinity)).size).toBe(1);
  });

  it("carries a liked theme across genres", () => {
    // 60s on Dracula (Horror · Vampires, Gothic) should lift Gothic romance above other romance.
    const events: Event[] = [
      ...Array.from({ length: 60 }, (_, i): Event => ({ type: "dwell", bookId: "g345", seconds: 1, at: 60 - i })),
      { type: "view", bookId: "g345", at: 0 },
    ];
    const { recs } = computeReco(books, events);
    expect(recs["g1260"]!.score).toBeGreaterThan(recs["g1342"]!.score); // Jane Eyre > Pride and Prejudice
    expect(recs["g10007"]!.reasons.join(" | ")).toContain("like Dracula"); // Carmilla
  });

  it("random mode ignores the model, for comparison", () => {
    const a = pickNext(books, [], ["Horror"], [], { mode: "random", random: () => 0 })!;
    const b = pickNext(books, [], ["Horror"], [], { mode: "random", random: () => 0.999 })!;
    expect(a.id).toBe(books[0]!.id);
    expect(b.id).toBe(books.at(-1)!.id);
    expect(a.reason).toContain("Random");
  });

  it("compares time per card between the personalised and random feeds", () => {
    const events: Event[] = [
      { type: "swipe", bookId: "g2", direction: "next", at: 9 },
      { type: "dwell", bookId: "g2", seconds: 1, at: 8 },
      { type: "view", bookId: "g2", at: 7, mode: "random" },
      { type: "swipe", bookId: "g1", direction: "next", at: 6 },
      { type: "dwell", bookId: "g1", seconds: 20, at: 5 },
      { type: "view", bookId: "g1", at: 0, mode: "personal" },
    ].map((e) => ({ ...e, bookId: e.bookId === "g1" ? "g11" : "g12" })) as Event[];
    const r = compareModes(events);
    expect(r.personal).toEqual({ cards: 1, avgSeconds: 20, skipRate: 0 });
    expect(r.random).toEqual({ cards: 1, avgSeconds: 1, skipRate: 1 });
  });
});
