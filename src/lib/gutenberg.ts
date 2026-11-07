import type { Book } from "./store";
export type GutenbergBook = { id: number; title: string; authors: { name: string }[]; subjects: string[]; bookshelves: string[]; languages: string[]; formats: Record<string, string>; copyright: boolean | null };
export type CataloguePage = { results: GutenbergBook[]; next: string | null; count: number };
export const GENRES = ["Literary Fantasy", "Sci-Fi", "Thriller", "Romance", "Horror", "Mystery"] as const;
export const TOPICS = ["fantasy", "science-fiction", "thriller", "romance", "horror", "mystery"] as const;
export function toBook(b: GutenbergBook, topic: string): Book | null {
 const source = Object.entries(b.formats).find(([key]) => key.includes("text/plain") && key.includes("utf-8"))?.[1] ?? Object.entries(b.formats).find(([key]) => key.includes("text/plain"))?.[1];
 if (!source || b.copyright === true) return null;
 const tags = [...b.subjects, ...b.bookshelves];
 const genre = /fantasy/i.test(tags.join(" ")) ? "Literary Fantasy" : /science fiction/i.test(tags.join(" ")) ? "Sci-Fi" : /horror|ghost|gothic/i.test(tags.join(" ")) ? "Horror" : /mystery|detective/i.test(tags.join(" ")) ? "Mystery" : /romance|love stories/i.test(tags.join(" ")) ? "Romance" : topic === "science-fiction" ? "Sci-Fi" : topic === "fantasy" ? "Literary Fantasy" : topic.charAt(0).toUpperCase() + topic.slice(1);
 return { id: `g${b.id}`, title: b.title, author: b.authors.map((a) => a.name).join(" & ") || "Unknown author", genre, tags, source, language: b.languages.join(", "), hook: "", body: "", price: 0, deluxePrice: 0, hue: 140, verified: false };
}
export function stripGutenberg(text: string) {
 const start = text.match(/\*\*\*\s*START OF[^\n]*PROJECT GUTENBERG[^\n]*\*\*\*/i);
 let result = start?.index !== undefined ? text.slice(start.index + start[0].length) : text;
 result = result.split(/\*\*\*\s*END OF[^\n]*PROJECT GUTENBERG/i)[0] ?? result;
 return result.trim();
}
export function liveExcerpt(text: string) { return stripGutenberg(text).split(/\s+/).slice(0, 500).join(" "); }
