import { describe, expect, it } from "vitest";
import { CURATED_BOOKS, curatedMetadata, isFreeClassic, readingPages } from "./curated-catalogue";
import { GENRES } from "./gutenberg";

describe("six Gutenberg shelves", () => {
  for (const genre of GENRES) {
    it(`contains 12 distinct ${genre} editions`, () => {
      expect(CURATED_BOOKS.filter((b) => b.genre === genre)).toHaveLength(12);
    });
  }
  it("contains 72 unique Gutenberg IDs", () => {
    expect(CURATED_BOOKS).toHaveLength(72);
    expect(new Set(CURATED_BOOKS.map((b) => b.id)).size).toBe(72);
  });
  it("ships real ~500-word passages, without illustration markers, and loads full text only on demand", () => {
    for (const book of CURATED_BOOKS) {
      const words = book.hook.split(/\s+/).length;
      expect(words).toBeGreaterThan(450);
      expect(words).toBeLessThanOrEqual(500);
      expect(book.hook).not.toMatch(/\[Illustration/i);
      expect(book.body).toBe("");
    }
    expect(CURATED_BOOKS.find((b) => b.id === "g1342")?.hook.startsWith("It is a truth universally acknowledged")).toBe(true);
  });
  it("all Gutenberg editions are free without simulated ownership", () => {
    for (const book of CURATED_BOOKS) {
      expect(book.price).toBe(0);
      expect(isFreeClassic(book)).toBe(true);
    }
    expect(isFreeClassic({ price: 5 })).toBe(false);
  });
  it("fallback search returns verified titles by ID and author", () => {
    expect(curatedMetadata("", 345)[0]?.title).toBe("Dracula");
    expect(curatedMetadata("Jane Austen")).toHaveLength(6);
  });
  it("paging preserves the entire original edition without truncation", () => {
    const text = ("A substantial original paragraph. ".repeat(100) + "\n\n").repeat(10);
    const pages = readingPages(text);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join("")).toBe(text);
    expect(pages.every((p) => p.length <= 6000)).toBe(true);
  });
});