import catalogue from "./gutenberg-catalogue.json";
import type { Book } from "./store";
import type { GutenbergBook } from "./gutenberg";

export const CURATED_BOOKS: Book[] = catalogue.map((book) => ({
  ...book, id: `g${book.id}`, body: "", price: 0, deluxePrice: 0,
  hue: 140, verified: false, language: "en", tags: [book.genre],
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