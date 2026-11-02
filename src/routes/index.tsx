import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { actions, useStore, type Book } from "@/lib/store";
import { computeReco, type Rec } from "@/lib/reco";
import { CheckoutModal } from "@/components/CheckoutModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SwipePage — Swipe into indie books" },
      { name: "description", content: "A vertical swipe feed of hooks from verified independent authors." },
      { property: "og:title", content: "SwipePage — Swipe into indie books" },
      { property: "og:description", content: "A vertical swipe feed of hooks from verified independent authors." },
    ],
  }),
  component: Feed,
});

function Feed() {
  const books = useStore((s) => s.books);
  const events = useStore((s) => s.events);
  const [idx, setIdx] = useState(0);
  const [reading, setReading] = useState<Book | null>(null);
  const [buying, setBuying] = useState<Book | null>(null);
  const [dwell, setDwell] = useState(0);
  const start = useRef(Date.now());
  const book = books[Math.min(idx, books.length - 1)]!;

  // Recommendation model: ranks every card from logged dwell, swipes,
  // purchases and bookmarks; the top-scoring card gets flagged.
  const reco = useMemo(() => computeReco(books, events), [books, events]);
  const topId = useMemo(() => {
    if (reco.signals < 3) return null;
    return books.reduce((best, b) => (reco.recs[b.id]!.score > reco.recs[best]!.score ? b.id : best), books[0]?.id ?? "");
  }, [books, reco]);

  // reset to newest card when a book is published
  const count = useRef(books.length);
  useEffect(() => { if (books.length > count.current) setIdx(0); count.current = books.length; }, [books.length]);

  // invisible dwell timer
  useEffect(() => {
    start.current = Date.now();
    setDwell(0);
    const t = setInterval(() => setDwell((Date.now() - start.current) / 1000), 100);
    return () => clearInterval(t);
  }, [book?.id]);

  const go = (dir: 1 | -1) => {
    const next = idx + dir;
    if (next < 0 || next >= books.length || reading) return;
    const seconds = Math.round((Date.now() - start.current) / 100) / 10;
    actions.log({ type: "dwell", bookId: book.id, seconds, at: Date.now() });
    actions.log({ type: "swipe", bookId: book.id, direction: dir > 0 ? "next" : "prev", at: Date.now() });
    setIdx(next);
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowDown") go(1); if (e.key === "ArrowUp") go(-1); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const touchY = useRef<number | null>(null);
  const wheelLock = useRef(0);

  if (!book) return null;

  return (
    <main className="flex min-h-screen items-center justify-center px-3 pt-16 pb-4">
      <div
        className="relative h-[min(82vh,760px)] w-full max-w-[420px] overflow-hidden rounded-[2rem] border bg-card shadow-2xl"
        onTouchStart={(e) => (touchY.current = e.touches[0]!.clientY)}
        onTouchEnd={(e) => {
          if (touchY.current == null) return;
          const d = touchY.current - e.changedTouches[0]!.clientY;
          if (Math.abs(d) > 50) go(d > 0 ? 1 : -1);
          touchY.current = null;
        }}
        onWheel={(e) => {
          if (reading || Date.now() - wheelLock.current < 700 || Math.abs(e.deltaY) < 30) return;
          wheelLock.current = Date.now();
          go(e.deltaY > 0 ? 1 : -1);
        }}
      >
        <Card key={book.id} book={book} onRead={() => setReading(book)} rec={reco.recs[book.id]} topPick={book.id === topId} />

        <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5">
          {books.map((b, i) => (
            <span key={b.id} className={`w-1 rounded-full transition-all ${i === idx ? "h-6 bg-primary" : "h-1.5 bg-foreground/25"}`} />
          ))}
        </div>
        <div className="absolute right-4 bottom-36 z-10 flex flex-col gap-2">
          <NavBtn label="↑" disabled={idx === 0} onClick={() => go(-1)} />
          <NavBtn label="↓" disabled={idx === books.length - 1} onClick={() => go(1)} />
        </div>
        <div className="absolute left-4 top-4 z-10 rounded-full bg-background/50 px-2.5 py-1 font-mono text-[10px] text-muted-foreground backdrop-blur" title="Dwell time (debug)">
          ⏱ {dwell.toFixed(1)}s
        </div>

        {reading && <Reader book={reading} onClose={() => setReading(null)} onBuy={() => setBuying(reading)} />}
      </div>
      {buying && <CheckoutModal book={buying} onClose={() => setBuying(null)} />}
    </main>
  );
}

function NavBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label === "↑" ? "Previous" : "Next"}
      className="h-10 w-10 rounded-full border bg-background/50 text-sm backdrop-blur transition hover:bg-primary hover:text-primary-foreground disabled:opacity-20">
      {label}
    </button>
  );
}

function Card({ book, onRead, rec, topPick }: { book: Book; onRead: () => void; rec: Rec | undefined; topPick: boolean }) {
  return (
    <article className="animate-card-in absolute inset-0 flex flex-col"
      style={{ background: `radial-gradient(120% 80% at 20% 0%, oklch(0.45 0.14 ${book.hue} / 0.55), transparent 60%), radial-gradient(90% 60% at 100% 100%, oklch(0.4 0.12 ${book.hue + 60} / 0.4), transparent 70%)` }}>
      <div className="no-scrollbar flex-1 overflow-y-auto px-7 pt-14 pb-4">
        {topPick && (
          <span className="mb-3 inline-block rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-glow">
            ★ Top pick for you
          </span>
        )}
        <p className="font-serif text-[1.15rem] leading-relaxed text-foreground/90">“{book.hook}”</p>
      </div>
      <div className="bg-gradient-card px-6 pt-10 pb-6">
        <span className="rounded-full bg-foreground/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest">{book.genre}</span>
        <h2 className="mt-3 text-2xl font-bold leading-tight">{book.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {book.author} {book.verified && <span className="text-primary">✓ Verified</span>}
        </p>
        {rec?.reasons[0] && (
          <p className="mt-2 text-xs text-muted-foreground" title={`Match score ${rec.score}/100`}>
            ↯ {rec.reasons[0]} <span className="font-mono opacity-60">· {rec.score}%</span>
          </p>
        )}
        <button onClick={onRead} className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-95">
          Read Full Book
        </button>
      </div>
    </article>
  );
}

function Reader({ book, onClose, onBuy }: { book: Book; onClose: () => void; onBuy: () => void }) {
  const marked = useStore((s) => !!s.bookmarks[book.id]);
  const owned = useStore((s) => s.owned[book.id]);
  return (
    <div className="animate-card-in absolute inset-0 z-20 flex flex-col bg-paper text-paper-foreground">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">← Feed</button>
        <span className="truncate px-2 text-xs uppercase tracking-widest text-muted-foreground">{book.title}</span>
        <button onClick={() => actions.bookmark(book.id)} aria-label="Bookmark" className={`text-lg ${marked ? "text-deluxe" : "text-muted-foreground"}`}>
          {marked ? "★" : "☆"}
        </button>
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-7 py-8">
        <h1 className="font-serif text-3xl">{book.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">by {book.author}</p>
        <div className="mt-8 space-y-5 font-serif text-[1.08rem] leading-[1.8]">
          {book.body.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
        </div>
        {owned === "deluxe" && <p className="mt-8 rounded-xl border border-deluxe/40 p-4 text-sm italic text-deluxe">Author commentary: “This opening came to me on a night train. I wrote it on the back of a ticket.”</p>}
      </div>
      <div className="border-t p-4">
        {owned ? (
          <p className="text-center text-sm text-primary">Owned · {owned === "deluxe" ? "Digital Deluxe" : "Standard"} Edition</p>
        ) : (
          <button onClick={onBuy} className="w-full rounded-full bg-gradient-deluxe py-3 text-sm font-bold text-deluxe-foreground">
            Buy Book · from ${book.price.toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
}
