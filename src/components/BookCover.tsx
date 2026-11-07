import { useState } from "react";
import { BookOpen } from "lucide-react";
import type { Book } from "@/lib/store";

/** Project Gutenberg's own cover image for a book, if it has one. */
export function coverUrl(book: Pick<Book, "id" | "source">) {
  const id = book.source && /^g\d+$/.test(book.id) ? book.id.slice(1) : null;
  return id ? `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg` : null;
}

/** Cover thumbnail; falls back to an icon when there is no cover or it fails to load. */
export function BookCover({ book, className = "", fallback = true }: { book: Book; className?: string; fallback?: boolean }) {
  const url = coverUrl(book);
  const [failed, setFailed] = useState(false);
  if (!url || failed) return !fallback ? null : <div className={`flex items-center justify-center rounded border bg-muted text-primary ${className}`} aria-hidden><BookOpen size={20} /></div>;
  return <img src={url} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setFailed(true)} className={`rounded border object-cover shadow-lg ${className}`} />;
}

/** Small marker for features that are simulated in this proof of concept. */
export function DemoBadge({ children = "Demo" }: { children?: string }) {
  return <span className="ml-2 inline-flex items-center rounded-full border border-deluxe/50 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-widest text-deluxe">{children}</span>;
}
