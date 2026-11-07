import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, LoaderCircle, LockKeyhole } from "lucide-react";
import { actions, useStore, type Book } from "@/lib/store";
import { AdSlot } from "./AdSlot";
import { Button } from "./ui/button";
import { isFreeClassic, readingPages } from "@/lib/curated-catalogue";
import { useMemo } from "react";
import { withEmphasis } from "@/lib/text";

/** Finds which reading page contains a passage, matching its first words across line breaks. */
export function pageOf(pages: string[], passage: string | undefined) {
  if (!passage) return 0;
  // Match on letters and digits only, so line breaks, italics marks and curly quotes don't matter.
  const words = (passage.match(/[A-Za-z0-9]+/g) ?? []).slice(0, 10);
  if (words.length < 4) return 0;
  const re = new RegExp(words.join("[^A-Za-z0-9]{1,12}"));
  let offset = 0;
  const at = pages.join("").search(re);
  if (at < 0) return 0;
  for (let i = 0; i < pages.length; i++) { offset += pages[i]!.length; if (at < offset) return i; }
  return 0;
}

function GutenbergReader({ book, error, onRetry, onClose, startAt }: { book: Book; error?: string; onRetry?: () => void; onClose: () => void; startAt?: string | undefined }) {
  const [page, setPage] = useState(0);
  const pages = useMemo(() => readingPages(book.body), [book.body]);
  // Open at the passage the reader just saw on the card.
  useEffect(() => { if (book.body) setPage(pageOf(pages, startAt)); }, [book.body, pages, startAt]);
  const scroller = useRef<HTMLDivElement>(null);
  const premium = useStore((s) => s.premium);
  function turn(next: number) { setPage(next); scroller.current?.scrollTo({ top: 0 }); }
  return <section className="absolute inset-0 z-20 flex flex-col bg-paper text-paper-foreground" aria-label="Gutenberg reader">
    <header className="flex items-center gap-3 border-b p-2"><Button variant="ghost" aria-label="Back to feed" onClick={onClose}><ArrowLeft size={18} /></Button><span className="min-w-0 flex-1 truncate text-xs">{book.title}</span><a href={book.source} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-primary">Source ↗</a></header>
    <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <h1 className="break-words font-serif text-3xl">{book.title}</h1><p className="mt-2 text-sm text-muted-foreground">{book.author}</p>
      {!book.body ? error ? <div role="alert" className="mt-8"><p className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-4" onClick={onRetry}>Retry text</Button></div> : <p role="status" className="mt-8 flex items-center gap-2 text-sm"><LoaderCircle className="animate-spin" size={18} />Loading full Gutenberg text…</p> : <>
        {page > 0 && !premium && <div className="mt-6"><AdSlot size="leaderboard" bookId={book.id} slot="reader" /></div>}
        <div className="mt-8 whitespace-pre-wrap break-words font-serif text-lg leading-relaxed" aria-label="Book text">{withEmphasis(pages[page] ?? "")}</div>
        {page === pages.length - 1 && <p className="mt-8 border-t pt-4 text-center text-sm text-muted-foreground">End of book</p>}
      </>}
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t p-3"><Button variant="outline" aria-label="Previous reading page" disabled={!book.body || page === 0} onClick={() => turn(page - 1)}>Previous</Button><span className="text-xs text-muted-foreground">{pages.length ? `${page + 1} / ${pages.length}` : "Free edition"}</span><Button variant="outline" aria-label="Next reading page" disabled={!book.body || page >= pages.length - 1} onClick={() => turn(page + 1)}>Next</Button></footer>
  </section>;
}
function CanvasChapter({ text }: { text: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const draw = () => {
      const parent = element.parentElement; if (!parent) return;
      const width = parent.clientWidth;
      const context = element.getContext("2d"); if (!context || width < 1) return;
      const encoded = Array.from(text).map((c) => c.charCodeAt(0) ^ 37);
      const decoded = encoded.map((c) => String.fromCharCode(c ^ 37)).join("");
      context.font = "18px Georgia";
      const lines: string[] = []; let line = "";
      for (const word of decoded.split(/\s+/)) { const next = line ? `${line} ${word}` : word; if (context.measureText(next).width > width - 8 && line) { lines.push(line); line = word; } else line = next; }
      if (line) lines.push(line);
      const height = Math.max(60, lines.length * 32 + 20), scale = window.devicePixelRatio || 1;
      element.width = width * scale; element.height = height * scale;
      element.style.width = `${width}px`; element.style.height = `${height}px`;
      context.scale(scale, scale); context.font = "18px Georgia";
      context.fillStyle = getComputedStyle(element).color;
      lines.forEach((l, i) => context.fillText(l, 0, 24 + i * 32));
    };
    const observer = new ResizeObserver(draw); observer.observe(element.parentElement ?? element); draw();
    return () => observer.disconnect();
  }, [text]);
  return <canvas ref={canvas} className="block max-w-full text-paper-foreground" aria-label="Protected chapter canvas" />;
}
export function Unscrambler({ book, onClose, onBuy, error, onRetry, startAt }: { book: Book; onClose: () => void; onBuy: () => void; error?: string; onRetry?: () => void; startAt?: string | undefined }) {
  const owned = useStore((s) => s.owned[book.id]), marked = useStore((s) => s.bookmarks[book.id]), premium = useStore((s) => s.premium);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 700); return () => clearTimeout(t); }, []);
  const paragraphs = book.body.split(/\n\s*\n/);
  const chapters = Array.from({ length: Math.ceil(paragraphs.length / 2) }, (_, i) => paragraphs.slice(i * 2, i * 2 + 2).join("\n\n"));
  if (isFreeClassic(book)) return <GutenbergReader book={book} {...(error === undefined ? {} : { error })} {...(onRetry === undefined ? {} : { onRetry })} onClose={onClose} startAt={startAt} />;
  return <section className="absolute inset-0 z-20 flex flex-col bg-paper text-paper-foreground" aria-label="SwipePage Unscrambler">
    <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b p-2"><Button variant="ghost" aria-label="Back to feed" onClick={onClose}><ArrowLeft size={18} /></Button><span className="truncate text-center text-xs">{book.title}</span><Button variant="ghost" aria-label="Bookmark" aria-pressed={!!marked} onClick={() => actions.bookmark(book.id)}><Bookmark className={marked ? "text-deluxe" : ""} size={18} /></Button></header>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6" onContextMenu={(e) => e.preventDefault()}>
      {!ready ? <div className="flex h-44 items-center justify-center gap-3 text-sm"><LoaderCircle className="animate-spin" />Unscrambling stream…</div> : <>
        <h1 className="font-serif text-3xl">{book.title}</h1><p className="mt-2 text-sm text-muted-foreground">{book.author}</p><p className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground"><LockKeyhole size={12} />SwipePage Unscrambler · demo protection</p>
        {chapters.slice(0, owned ? chapters.length : 1).map((text, i) => <div key={i} className="mt-8">{i > 0 && !premium && <div className="mb-8"><AdSlot size="leaderboard" bookId={book.id} slot="reader" /></div>}<h2 className="mb-4 text-xs uppercase tracking-widest text-muted-foreground">Chapter {i + 1}</h2><CanvasChapter text={text} /></div>)}
        {!owned && <p className="mt-8 border-t pt-5 text-center text-sm text-muted-foreground">End of preview</p>}
        {owned === "deluxe" && book.bonus && <div className="mt-8"><h2 className="mb-3 text-deluxe">Bonus chapter · Author’s note</h2><CanvasChapter text="This opening came to me on a night train. I wrote it on the back of a ticket." /></div>}
      </>}
    </div>
    <footer className="border-t p-3">{owned ? <p className="text-center text-sm text-primary">Owned · {owned === "deluxe" ? "Deluxe" : "Standard"}</p> : <Button onClick={onBuy} className="w-full">Buy full book · £{book.price.toFixed(2)}</Button>}</footer>
  </section>;
}
