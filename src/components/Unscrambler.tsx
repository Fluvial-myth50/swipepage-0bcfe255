import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, LoaderCircle, LockKeyhole } from "lucide-react";
import { actions, useStore, type Book } from "@/lib/store";
import { AdSlot } from "./AdSlot";
import { Button } from "./ui/button";
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
export function Unscrambler({ book, onClose, onBuy }: { book: Book; onClose: () => void; onBuy: () => void }) {
  const owned = useStore((s) => s.owned[book.id]), marked = useStore((s) => s.bookmarks[book.id]), premium = useStore((s) => s.premium);
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 700); return () => clearTimeout(t); }, []);
  const paragraphs = book.body.split(/\n\s*\n/);
  const chapters = Array.from({ length: Math.ceil(paragraphs.length / 2) }, (_, i) => paragraphs.slice(i * 2, i * 2 + 2).join("\n\n"));
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
