import { describe, it, expect } from "vitest";
import { computeReco } from "./reco";
import type { Book, Event } from "./store";

const books: Book[] = [
  { id: "b1", title: "A", author: "X", genre: "Horror", hook: "h", body: "b", price: 9.99, deluxePrice: 16.99, hue: 0, verified: true },
  { id: "b2", title: "B", author: "Y", genre: "Romance", hook: "h", body: "b", price: 9.99, deluxePrice: 16.99, hue: 0, verified: true },
];

const events: Event[] = [
  { type: "dwell", bookId: "b1", seconds: 60, at: 1 },
  { type: "dwell", bookId: "b1", seconds: 40, at: 2 },
  { type: "dwell", bookId: "b2", seconds: 20, at: 3 },
  { type: "swipe", bookId: "b1", direction: "next", at: 4 },
  { type: "swipe", bookId: "b1", direction: "next", at: 5 },
  { type: "swipe", bookId: "b1", direction: "next", at: 6 },
  { type: "swipe", bookId: "b1", direction: "prev", at: 7 },
  { type: "swipe", bookId: "b2", direction: "prev", at: 8 },
  { type: "purchase", bookId: "b1", tier: "deluxe", price: 16.99, author: 12.74, platform: 4.25, at: 9 },
  { type: "bookmark", bookId: "b1", at: 10 },
];

describe("reco", () => {
  it("ranks the book with strong signals far above the ignored one", () => {
    const { recs } = computeReco(books, events);
    expect(recs["b1"]!.score).toBeGreaterThan(65);
    expect(recs["b1"]!.tier).toBe("hot");
    expect(recs["b2"]!.score).toBeLessThan(10);
    expect(recs["b2"]!.tier).toBe("cold");
    expect(recs["b1"]!.score).toBeGreaterThan(recs["b2"]!.score);
  });

  it("explains the top pick with dwell, pull and ownership reasons", () => {
    const { recs } = computeReco(books, events);
    expect(recs["b1"]!.reasons[0]).toContain("50s");
    expect(recs["b1"]!.reasons.join(" | ")).toContain("Deluxe");
    expect(recs["b1"]!.reasons.length).toBeGreaterThan(2);
  });

  it("gives Horror most of the taste share (100s of 120s dwell)", () => {
    const { genreAffinity } = computeReco(books, events);
    expect(genreAffinity["Horror"]).toBeCloseTo(1, 1);
    expect(genreAffinity["Romance"]).toBeLessThan(0.3);
  });

  it("stays neutral on a cold start", () => {
    const { recs, signals } = computeReco(books, []);
    expect(signals).toBe(0);
    expect(recs["b1"]!.score).toBe(recs["b2"]!.score);
    expect(recs["b1"]!.reasons[0]).toContain("still learning");
  });
});
