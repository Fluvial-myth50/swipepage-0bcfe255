import { useServerFn } from "@tanstack/react-start";
import { getBookText } from "@/lib/gutenberg.functions";
import { liveExcerpt } from "@/lib/gutenberg";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown, BookOpen, Bookmark, CheckCircle2, Sparkles } from "lucide-react";
import { actions, getDemoState, useStore } from "@/lib/store";
import { computeReco } from "@/lib/reco";
import { countdownSeconds, genrePoints, meta, purchasePrice, shouldShowAd } from "@/lib/poc";
import { AdSlot } from "@/components/AdSlot";
import { CheckoutModal } from "@/components/CheckoutModal";
import { Unscrambler } from "@/components/Unscrambler";
import { Button } from "@/components/ui/button";
import island from "@/assets/salt-island.jpg";
export const Route = createFileRoute("/")({ head: () => meta("Discover independent books", "A personalised swipe feed of independent stories, matched to your reading taste."), component: Feed });
function Feed() {
  const books = useStore((s) => s.books), events = useStore((s) => s.events), genres = useStore((s) => s.genres), weights = useStore((s) => s.weights), premium = useStore((s) => s.premium), user = useStore((s) => s.user), selected = useStore((s) => s.selectedBook);
  const [current, setCurrent] = useState(books[0]?.id ?? ""), [reading, setReading] = useState(false), [buying, setBuying] = useState(false), [ad, setAd] = useState(false), [remaining, setRemaining] = useState(0), [elapsed, setElapsed] = useState(0);
  const fetchText = useServerFn(getBookText);
  const [textError, setTextError] = useState("");
  const [retry, setRetry] = useState(0);
  const history = useRef<string[]>([]), cycle = useRef(new Set<string>()), touch = useRef<number | null>(null), lock = useRef(0);
  const book = books.find((b) => b.id === current) ?? books[0];
  useEffect(() => {
    setTextError("");
    if (!book?.source || book.body) return;
    let active = true;
    fetchText({ data: { id: Number(book.id.slice(1)) } }).then(({ body }) => { if (active) actions.bookText(book.id, body, liveExcerpt(body)); }).catch(() => { if (active) setTextError("The original text could not load."); });
    return () => { active = false; };
  }, [book?.id, retry, fetchText]);
  const reco = useMemo(() => computeReco(books, events), [books, events]);
  function rank(id: string) { const b = books.find((v) => v.id === id); if (!b) return 0; return (reco.recs[id]?.score ?? 0) + (genres.some((g) => b.genre.toLowerCase().includes(g.toLowerCase())) ? 35 : 0) + (weights[b.genre] ?? 0); }
  useEffect(() => { if (selected) setCurrent(selected); }, [selected]);
  useEffect(() => { if (!events.length && genres.length) { const match = books.find((b) => genres.some((g) => b.genre.toLowerCase().includes(g.toLowerCase()))); if (match) setCurrent(match.id); } }, [genres]);
  const count = useRef(books.length);
  useEffect(() => { if (books.length > count.current && books[0]?.id.startsWith("u")) setCurrent(books[0].id); count.current = books.length; }, [books]);
  useEffect(() => {
    setElapsed(0);
    if (!book || !book.hook || !user || ad || reading || buying) return;
    let seconds = 0;
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      seconds += 1; setElapsed(seconds);
      actions.log({ type: "dwell", bookId: book.id, seconds: 1, at: Date.now() });
      if (seconds > 5) actions.weight(book.genre, 1);
    }, 1000);
    return () => clearInterval(t);
  }, [book?.id, book?.hook, user, ad, reading, buying]);
  useEffect(() => { if (!ad) return; const t = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(t); }, [ad]);
  useEffect(() => { if (premium) setAd(false); }, [premium]);
  function go(dir: 1 | -1) {
    if (!book || ad || reading || buying) return;
    let next: string | undefined;
    if (dir === -1) next = history.current.pop();
    else {
      cycle.current.add(book.id);
      let candidates = books.filter((b) => !cycle.current.has(b.id));
      if (!candidates.length) { cycle.current.clear(); cycle.current.add(book.id); candidates = books.filter((b) => b.id !== book.id); }
      next = candidates.sort((a, b) => rank(b.id) - rank(a.id))[0]?.id;
      if (next) history.current.push(book.id);
    }
    if (!next) return;
    actions.log({ type: "swipe", bookId: book.id, direction: dir > 0 ? "next" : "prev", at: Date.now() });
    const n = premium ? 0 : actions.transition(); setCurrent(next);
    if (shouldShowAd(n, premium)) { setRemaining(countdownSeconds()); setAd(true); }
  }
  useEffect(() => { const handler = (e: KeyboardEvent) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); go(e.key === "ArrowDown" ? 1 : -1); } }; window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler); });
  if (!book) return null;
  return <main className="feed-layout">
    <div className="mb-6 hidden items-end justify-between lg:flex"><div><p className="text-xs uppercase tracking-widest text-primary">The discovery shelf</p><h1 className="mt-2 font-serif text-4xl">A page worth staying for.</h1></div><span className="text-xs text-muted-foreground">{premium ? "Premium · ad-free" : "Curated for your taste"}</span></div>
    <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(300px,440px)_minmax(0,1fr)]">
      <section className="feed-frame" aria-label="Swipe feed" onTouchStart={(e) => { touch.current = e.touches[0]?.clientY ?? null; }} onTouchEnd={(e) => { const y = e.changedTouches[0]?.clientY; if (touch.current !== null && y !== undefined && Math.abs(touch.current - y) > 60) go(touch.current > y ? 1 : -1); touch.current = null; }} onWheel={(e) => { if (Date.now() - lock.current < 700 || Math.abs(e.deltaY) < 30) return; lock.current = Date.now(); go(e.deltaY > 0 ? 1 : -1); }}>
        <article key={book.id} className="animate-card-in flex h-full min-h-0 flex-col bg-card">
          <div className="relative h-36 shrink-0 overflow-hidden"><img src={island} width={768} height={1024} alt="Illustrative literary book artwork" className="h-full w-full object-cover object-center" /><div className="absolute inset-0 bg-background/20" /><p className="absolute bottom-4 left-6 text-xs font-semibold text-primary-foreground bg-primary px-2 py-1">{book.genre}</p></div>
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5"><p className="font-serif text-lg leading-relaxed">{book.hook ? `“${book.hook}”` : textError || "Loading original Gutenberg excerpt…"}</p>{textError && <Button variant="outline" className="mt-4" onClick={() => setRetry((r) => r + 1)}>Retry text</Button>}</div>
          <footer className="shrink-0 border-t px-6 py-4"><h2 className="font-serif text-2xl">{book.title}</h2><p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{book.author}{book.verified && <CheckCircle2 size={12} className="text-primary" />}</p><div className="mt-4 flex gap-2"><Button className="flex-1" disabled={!book.body} onClick={() => setReading(true)}><BookOpen size={16} />Read book</Button><Button variant="outline" aria-label="Save book" onClick={() => actions.bookmark(book.id)}><Bookmark size={16} /></Button><Button variant="outline" aria-label="Previous" onClick={() => go(-1)} disabled={!history.current.length}><ArrowUp size={16} /></Button><Button variant="outline" aria-label="Next" onClick={() => go(1)}><ArrowDown size={16} /></Button></div></footer>
        </article>
        {reading && <Unscrambler book={book} onClose={() => setReading(false)} onBuy={() => setBuying(true)} />}
        {ad && <section className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-7 bg-background px-6" aria-label="Ad interstitial"><AdSlot size="rectangle" bookId={book.id} slot="feed" /><Button disabled={remaining > 0} onClick={() => setAd(false)}>{remaining > 0 ? `Continue in ${remaining}s` : "Continue reading"}</Button></section>}
      </section>
      <aside className="hidden min-w-0 py-4 lg:block"><p className="flex items-center gap-2 text-xs text-primary"><Sparkles size={14} />{rank(book.id) > 40 ? "Matched to your taste" : "An independent discovery"}</p><h2 className="mt-5 font-serif text-4xl leading-tight">{book.title}</h2><p className="mt-3 text-muted-foreground">by {book.author}</p><div className="my-6 border-y py-5 text-sm"><p className="text-primary">{book.source ? "Project Gutenberg · public-domain classic" : "✓ Verified independent author"}</p><p className="mt-3 text-muted-foreground">{book.genre} · Digital edition</p></div><p className="text-sm leading-relaxed text-muted-foreground">{book.hook.split(" ").slice(0, 45).join(" ")}…</p><div className="mt-6 flex items-center justify-between"><span className="font-serif text-3xl">£{purchasePrice(book.price, premium).toFixed(2)}</span><Button onClick={() => setBuying(true)}>Quick buy</Button></div><section className="mt-10 border-t pt-6"><h3 className="text-sm">Reader reviews</h3><p className="mt-3 text-xs text-muted-foreground">No reviews yet.</p></section><section className="mt-8 border-t pt-5"><h3 className="text-xs uppercase tracking-widest text-muted-foreground">Reading signals</h3><p className="mt-3 text-sm">{elapsed}s on this page</p>{genrePoints(elapsed) > 0 && <p className="mt-2 text-xs text-primary">Dwell time tracked: +{genrePoints(elapsed)} points to {book.genre}</p>}</section></aside>
    </div>
    {buying && <CheckoutModal book={book} onClose={() => setBuying(false)} />}
  </main>;
}
