import { describe, expect, it } from "vitest";
import { liveExcerpt, toBook } from "./gutenberg";
describe("real literature", () => {
 it("excerpts contain the first 500 original words without Gutenberg boilerplate", () => { const text = `license\n*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***\n${Array.from({ length: 650 }, (_, i) => `word${i}`).join(" ")}\n*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***`; const snippet = liveExcerpt(text); expect(snippet.split(" ")).toHaveLength(500); expect(snippet.startsWith("word0 ")).toBe(true); expect(snippet.endsWith("word499")).toBe(true); });
 it("copyrighted titles are excluded", () => { expect(toBook({ id: 1, title: "Book", authors: [], subjects: [], bookshelves: [], languages: ["en"], formats: { "text/plain": "https://www.gutenberg.org/book.txt" }, copyright: true }, "fantasy")).toBeNull(); });
});
