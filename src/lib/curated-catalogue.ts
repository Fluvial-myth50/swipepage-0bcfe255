import catalogue from "./gutenberg-catalogue.json";
import type { Book, PassageInfo } from "./store";
import { bestPassage } from "./excerpt";
import type { GutenbergBook } from "./gutenberg";

type Entry = (typeof catalogue)[number] & { passage?: Omit<PassageInfo, "from"> };

/**
 * Passages are chosen from each book's full text by scripts/build-passages.ts.
 * Until that has run for a book, the extractor searches the bundled opening instead.
 */
function passageFor(book: Entry): PassageInfo | undefined {
  if (book.passage) return { ...book.passage, from: "full-text" };
  const p = bestPassage(book.hook);
  return p ? { text: p.text, reasons: p.reasons, position: p.position, isOpening: p.isOpening, from: "opening" } : undefined;
}

export const CURATED_BOOKS: Book[] = (catalogue as Entry[]).map((book) => ({
  ...book, passage: passageFor(book), id: `g${book.id}`, body: "", price: 0, deluxePrice: 0,
  hue: 140, verified: false, language: "en", tags: book.themes,
  source: `https://www.gutenberg.org/ebooks/${book.id}`,
}));

// Public metadata fallback: never contains account or billing state.
export function curatedMetadata(search = "", id?: number): GutenbergBook[] {
  return catalogue.filter((book) => (id === undefined || book.id === id) &&
    `${book.title} ${book.author} ${book.genre}`.toLowerCase().includes(search.toLowerCase()))
    .map((book) => ({ id: book.id, title: book.title, authors: [{ name: book.author }],
      subjects: [book.genre], bookshelves: [], languages: ["en"], copyright: false,
      formats: { "text/plain; charset=utf-8": `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt` },
    }));
}

export function isFreeClassic(book: Pick<Book, "source" | "price">) {
  return !!book.source && book.price === 0;
}

// Bounded plain-text reading pages, preserving every character of the edition.
export function readingPages(text: string, size = 6000): string[] {
  const pages: string[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(offset + size, text.length);
    if (end < text.length) {
      const paragraph = text.lastIndexOf("\n\n", end);
      if (paragraph > offset + size / 2) end = paragraph + 2;
    }
    pages.push(text.slice(offset, end)); offset = end;
  }
  return pages;
}