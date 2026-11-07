import { useServerFn } from "@tanstack/react-start";
import { getBookText } from "@/lib/gutenberg.functions";
import { liveExcerpt } from "@/lib/gutenberg";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, BookOpen, Bookmark, CheckCircle2, Sparkles, Compass } from "lucide-react";
import { actions, getDemoState, useStore } from "@/lib/store";
import { pickNext } from "@/lib/reco";
import { countdownSeconds, meta, purchasePrice, shouldShowAd } from "@/lib/poc";
import { withEmphasis } from "@/lib/text";
import { AdSlot } from "@/components/AdSlot";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Unscrambler } from "@/components/Unscrambler";
import { Button } from "@/components/ui/button";
import { BookCover } from "@/components/BookCover";
import island from "@/assets/salt-island.jpg";
import { isFreeClassic } from "@/lib/curated-catalogue";

export const Route = createFileRoute("/")({ head: () => meta("Discover classics and independent books", "Explore 72 Gutenberg classics across six genres alongside independent stories, matched to your reading taste."), component: Feed });

/** Each genre gets its own tint of the cover art so cards don't all look alike. */
const GENRE_TINT: Record<string, string> = {
  "Literary Fantasy": "hue-rotate(0deg) saturate(1.1)",
  "Sci-Fi": "hue-rotate(40deg) saturate(1.2)",
  Thriller: "hue-rotate(180deg) saturate(0.7) brightness(0.8)",
  Romance: "sepia(0.6) hue-rotate(-25deg) saturate(1.3)",
  Horror: "hue-rotate(200deg) saturate(0.4) brightness(0.6)",
  Mystery: "hue-rotate(80deg) saturate(0.6) brightness(0.75)",
};

/** True when the element can still scroll in that direction (1 = down, -1 = up). */
function canScroll(el: HTMLElement | null, dir: 1 | -1) {
  if (!el) return false;
  return dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 2 : el.scrollTop > 2;
}

function Feed() {
  const books = useStore((s) => s.books), genres = useStore((s) => s.genres), premium = useStore((s) => s.premium), user = useStore((s) => s.user);
  const mode = useStore((s) => s.feedMode), current = useStore((s) => s.selectedBook), reason = useStore((s) => s.feedReason), history = useStore((s) => s.history), saved = useStore((s) => s.bookmarks);
  const [reading, setReading] = useState(false), [buying, setBuying] = useState(false), [ad, setAd] = useState(false), [remaining, setRemaining] = useState(0);
  const fetchText = useServerFn(getBookText);
  const [textError, setTextError] = useState("");
  const [retry, setRetry] = useState(0);
  const touch = useRef<{ y: number; top: number } | null>(null), lock = useRef(0), scroller = useRef<HTMLDivElement>(null);
  const book = books.find((b) => b.id === current);

  // First card of the session comes from the algorithm too (cold start uses sign-up genres).
  useEffect(() => {
    if (!user || current) return;
    const s = getDemoState();
    const first = pickNext(s.books, s.events, s.genres, [], { seed: s.user?.name, mode: s.feedMode });
    if (first) actions.showNext(first.id, first.reason);
  }, [user, current]);

  useEffect(() => {
    setTextError("");
    if (!book?.source || book.body || !reading) return;
    let active = true;
    fetchText({ data: { id: Number(book.id.slice(1)) } }).then(({ body }) => { if (active) actions.bookText(book.id, body, book.hook || liveExcerpt(body)); }).catch(() => { if (active) setTextError("The original text could not load. Please retry."); });
    return () => { active = false; };
  }, [book?.id, reading, retry, fetchText]);

  // Every time a card appears it's a new visit; the excerpt scrolls back to the top.
  useEffect(() => {
    if (!book || !user) return;
    actions.log({ type: "view", bookId: book.id, at: Date.now(), mode: getDemoState().feedMode });
    scroller.current?.scrollTo({ top: 0 });
  }, [book?.id, user]);

  // Reading time on the opening page, one tick per visible second.
  useEffect(() => {
    if (!book || !book.hook || !user || ad || reading || buying) return;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      actions.log({ type: "dwell", bookId: book.id, seconds: 1, at: Date.now() });
    }, 1000);
    return () => clearInterval(t);
  }, [book?.id, book?.hook, user, ad, reading, buying]);

  useEffect(() => { if (!ad) return; const t = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [ad]);
  useEffect(() => { if (premium) setAd(false); }, [premium]);

  function go(dir: 1 | -1) {
    if (!book || ad || reading || buying) return;
    if (dir === -1) {
      if (!history.length) return;
      actions.log({ type: "swipe", bookId: book.id, direction: "prev", at: Date.now() });
      actions.showPrevious();
      return;
    }
    const s = getDemoState();
    const next = pickNext(s.books, s.events, s.genres, [...s.history, book.id], { seed: s.user?.name, mode: s.feedMode });
    if (!next) return;
    actions.log({ type: "swipe", bookId: book.id, direction: "next", at: Date.now() });
    actions.showNext(next.id, next.reason);
    const n = premium ? 0 : actions.transition();
    if (shouldShowAd(n, premium)) { setRemaining(countdownSeconds()); setAd(true); }
  }
  function open() {
    if (!book) return;
    actions.log({ type: "open", bookId: book.id, at: Date.now() });
    setReading(true);
  }

  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); go(e.key === "ArrowDown" ? 1 : -1); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); });

  if (!book) return null;
  const free = isFreeClassic(book);
  const explore = reason?.startsWith("A change of pace");
  const isSaved = !!saved[book.id];

  return <main className="feed-layout">
    <div className="mb-6 hidden items-end justify-between lg:flex"><div><p className="text-xs uppercase tracking-widest text-primary">The discovery shelf</p><h1 className="mt-2 font-serif text-4xl">A page worth staying for.</h1></div><span className="text-xs text-muted-foreground">{mode === "random" ? <span className="rounded-full border border-deluxe/50 px-3 py-1 text-deluxe">Comparison mode: random feed</span> : genres.length ? `Tuned to ${genres.join(", ")} and what you read` : "Learning from what you read"}{premium ? " · Premium, ad-free" : ""}</span></div>
    <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(300px,440px)_minmax(0,1fr)]">
      <section className="feed-frame" aria-label="Swipe feed"
        onTouchStart={(e) => { const y = e.touches[0]?.clientY; touch.current = y === undefined ? null : { y, top: scroller.current?.scrollTop ?? 0 }; }}
        onTouchEnd={(e) => {
          const y = e.changedTouches[0]?.clientY, start = touch.current; touch.current = null;
          if (!start || y === undefined || Math.abs(start.y - y) < 60) return;
          const dir = start.y > y ? 1 : -1;
          // A drag that scrolled the passage is reading, not swiping.
          if ((scroller.current?.scrollTop ?? 0) !== start.top || canScroll(scroller.current, dir)) return;
          go(dir);
        }}
        onWheel={(e) => {
          if (Math.abs(e.deltaY) < 30) return;
          const dir = e.deltaY > 0 ? 1 : -1;
          // Let the passage scroll first; only swipe once it's at the end and the reader pauses.
          if (e.target instanceof Node && scroller.current?.contains(e.target) && canScroll(scroller.current, dir)) { lock.current = Date.now(); return; }
          if (Date.now() - lock.current < 700) return;
          lock.current = Date.now(); go(dir);
        }}>
        <article key={book.id} className="animate-card-in flex h-full min-h-0 flex-col bg-card">
          <div className="relative h-36 shrink-0 overflow-hidden"><img src={island} width={768} height={1024} alt="" className="h-full w-full object-cover object-center" style={{ filter: GENRE_TINT[book.genre] }} /><div className="absolute inset-0 bg-background/20" /><p className="absolute bottom-4 left-6 bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{book.genre}</p><BookCover key={book.id} book={book} fallback={false} className="absolute bottom-3 right-5 h-28 w-20" /></div>
          <div ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5"><p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">{book.passage && !book.passage.isOpening ? "A passage from early in the book" : "Opening lines"}</p><p className="whitespace-pre-line font-serif text-lg leading-relaxed">{book.passage ? withEmphasis(book.passage.text) : book.hook ? withEmphasis(book.hook) : textError || "Loading original Gutenberg excerpt…"}</p>{textError && <Button variant="outline" className="mt-4" onClick={() => setRetry((r) => r + 1)}>Retry text</Button>}</div>
          <footer className="shrink-0 border-t px-6 py-4">
            <h2 className="font-serif text-2xl">{book.title}</h2>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{book.author}{book.verified && <CheckCircle2 size={12} className="text-primary" />}</p>
            {reason && <p className="mt-2 flex items-center gap-1.5 text-xs text-primary lg:hidden">{explore ? <Compass size={12} /> : <Sparkles size={12} />}{reason}</p>}
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" disabled={!book.body && !book.source} onClick={open}><BookOpen size={16} />{free ? "Read free" : "Read preview"}</Button>
              <Button variant="outline" aria-label={isSaved ? "Remove from saved" : "Save book"} aria-pressed={isSaved} onClick={() => actions.bookmark(book.id)} className={isSaved ? "border-primary text-primary" : ""}><Bookmark size={16} fill={isSaved ? "currentColor" : "none"} /></Button>
              <Button variant="outline" aria-label="Previous" onClick={() => go(-1)} disabled={!history.length}><ArrowUp size={16} /></Button>
              <Button variant="outline" aria-label="Next" onClick={() => go(1)}><ArrowDown size={16} /></Button>
            </div>
          </footer>
        </article>
        {reading && <Unscrambler startAt={book.passage?.isOpening ? undefined : book.passage?.text} book={book} error={textError} onRetry={() => setRetry((r) => r + 1)} onClose={() => setReading(false)} onBuy={() => setBuying(true)} />}
        {ad && <section className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-7 bg-background px-6" aria-label="Ad interstitial"><AdSlot size="rectangle" bookId={book.id} slot="feed" /><Button disabled={remaining > 0} onClick={() => setAd(false)}>{remaining > 0 ? `Continue in ${remaining}s` : "Continue reading"}</Button></section>}
      </section>
      <aside className="hidden min-w-0 py-4 lg:block">
        <p className="flex items-center gap-2 text-xs text-primary">{explore ? <Compass size={14} /> : <Sparkles size={14} />}{explore ? "Exploring" : "Picked for you"}</p>
        <h2 className="mt-5 font-serif text-4xl leading-tight">{book.title}</h2>
        <p className="mt-3 text-muted-foreground">by {book.author}</p>
        <div className="my-6 border-y py-5 text-sm"><p className="text-primary">{book.source ? "Project Gutenberg · public-domain classic" : "✓ Verified independent author"}</p><p className="mt-3 text-muted-foreground">{book.genre} · Digital edition</p></div>
        <section><h3 className="text-xs uppercase tracking-widest text-muted-foreground">Why you're seeing this</h3><p className="mt-3 text-sm leading-relaxed">{reason ?? "A classic to start with"}</p></section>
        {book.passage && book.passage.reasons.length > 0 && <section className="mt-6"><h3 className="text-xs uppercase tracking-widest text-muted-foreground">Why this passage</h3><p className="mt-3 text-sm leading-relaxed">{book.passage.isOpening ? "The opening was the strongest passage: it" : "Picked from early in the book because it"} {book.passage.reasons.join(", ").replace(/, ([^,]*)$/, " and $1")}.</p></section>}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          {free ? <span className="rounded-full border border-primary/40 px-3 py-1 text-sm text-primary">Free to read</span> : <span className="font-serif text-3xl">£{purchasePrice(book.price, premium).toFixed(2)}</span>}
          <Button onClick={() => free ? open() : setBuying(true)}>{free ? "Start reading" : "Quick buy"}</Button>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">Scroll the passage to keep reading. Swipe, scroll past the end or press ↓ for the next book.</p>
      </aside>
    </div>
    {buying && <CheckoutModal book={book} onClose={() => setBuying(false)} />}
  </main>;
}
