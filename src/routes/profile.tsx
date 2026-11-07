import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, LogOut, BookOpen, RotateCcw, Bookmark } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { meta } from "@/lib/poc";
import { computeReco } from "@/lib/reco";
import { Button } from "@/components/ui/button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { BookCover, DemoBadge } from "@/components/BookCover";
import { GENRES } from "@/lib/gutenberg";

export const Route = createFileRoute("/profile")({ head: () => meta("Your reading profile", "Your SwipePage library, genre preferences and premium membership."), component: Profile });

function Profile() {
  const user = useStore((s) => s.user), premium = useStore((s) => s.premium), genres = useStore((s) => s.genres), books = useStore((s) => s.books), owned = useStore((s) => s.owned), events = useStore((s) => s.events), saved = useStore((s) => s.bookmarks);
  const [pay, setPay] = useState(false), [confirm, setConfirm] = useState(false);
  const reco = computeReco(books, events, genres);
  const read = Object.values(reco.stats).filter((s) => s.visits).length;
  const favourite = Object.entries(reco.genreAffinity).filter(() => reco.signals >= 3).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Still discovering";
  // Books opened in full, most recent first, then saved ones not opened yet.
  const opened = books.filter((b) => reco.stats[b.id]?.opened).sort((x, y) => reco.stats[y.id]!.lastSeen - reco.stats[x.id]!.lastSeen);
  const savedOnly = books.filter((b) => saved[b.id] && !reco.stats[b.id]?.opened);
  const shelf = [...opened, ...savedOnly];
  const go = (id: string, reason: string) => actions.selectBook(id, reason);

  return <main className="mx-auto max-w-3xl px-6 py-10 pb-24">
    <h1 className="font-serif text-4xl">{user?.name ?? "Your profile"}</h1>
    <p className="mt-2 capitalize text-muted-foreground">{user?.role} · demo account</p>
    <div className="mt-8 grid grid-cols-3 gap-3">{[["Books read", read], ["Account tier", premium ? "Premium" : "Free"], ["Favourite genre", favourite]].map(([label, value]) => <div key={label} className="min-w-0 border-b pb-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words text-lg">{value}</p></div>)}</div>

    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg"><BookOpen size={20} />Continue reading</h2>
      {shelf.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Books you open or save from the feed appear here.</p> :
        <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">{shelf.map((b) => <Link to="/" key={b.id} onClick={() => go(b.id, reco.stats[b.id]?.opened ? "Picking up where you left off" : "From your saved books")} className="w-32 shrink-0">
          <BookCover book={b} className="h-44 w-32" />
          <p className="mt-2 line-clamp-2 text-sm">{b.title}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{saved[b.id] && <Bookmark size={11} fill="currentColor" className="text-primary" />}{b.author}</p>
        </Link>)}</div>}
    </section>

    <section className="mt-10 border-y py-6"><h2 className="flex items-center gap-2 text-xl text-deluxe"><Crown />{premium ? "Premium is active" : "SwipePage Premium"}<DemoBadge /></h2><p className="mt-3 text-sm text-muted-foreground">£7.99/month ($9.99/month) · Ad-free · 15% off books. Test checkout only, no real payment.</p>{!premium && <Button className="mt-4" onClick={() => setPay(true)}>Go Premium</Button>}</section>

    <section className="mt-8"><h2 className="text-lg">Your genres</h2><p className="mt-1 text-xs text-muted-foreground">The feed starts from these, then follows what you actually read.</p><div className="mt-4 flex flex-wrap gap-2">{GENRES.map((g) => <Button key={g} variant="outline" aria-pressed={genres.includes(g)} className={genres.includes(g) ? "border-primary text-primary" : ""} onClick={() => actions.preferences(genres.includes(g) ? genres.filter((v) => v !== g) : [...genres, g])}>{g}</Button>)}</div></section>

    <section className="mt-10"><h2 className="text-lg">Purchased books</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{books.filter((b) => owned[b.id]).map((b) => <Link to="/" key={b.id} onClick={() => go(b.id, "From your library")} className="block rounded-lg border bg-card p-5">{b.title}<span className="ml-3 text-xs capitalize text-deluxe">{owned[b.id]}</span></Link>)}{!Object.keys(owned).length && <p className="text-sm text-muted-foreground">The classics are free. Books you buy from independent authors appear here.</p>}</div></section>

    <section className="mt-10 rounded-lg border p-5">
      <h2 className="flex items-center gap-2 text-lg"><RotateCcw size={18} />Start fresh</h2>
      <p className="mt-2 text-sm text-muted-foreground">Clears what the feed has learned about you, including your reading history and saved books. Your genres and purchases stay. Useful if your recommendations feel stuck in a rut.</p>
      {confirm ? <div className="mt-4 flex gap-2"><Button variant="destructive" onClick={() => { actions.resetTaste(); setConfirm(false); }}>Yes, reset my taste</Button><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button></div> : <Button variant="outline" className="mt-4" onClick={() => setConfirm(true)}>Reset recommendations</Button>}
    </section>

    <div className="mt-10 flex flex-wrap items-center gap-4"><Link to="/how-it-works" className="text-sm text-primary">How recommendations work</Link><Link to="/analytics" className="text-sm text-primary">Reading analytics</Link><Link to="/premium" className="text-sm text-deluxe">Premium plans</Link><Button variant="ghost" onClick={actions.logout}><LogOut size={16} />Log out</Button><Button variant="ghost" onClick={() => actions.login({ name: "Demo administrator", role: "admin" }, genres)}>Enter admin demo</Button></div>
    <p className="mt-4 text-xs text-muted-foreground">Demo account: your progress is saved in this browser only. Demo roles are not secure sign-in. Canvas reading discourages copying, but it can't prevent screenshots or scraping.</p>
    {pay && <CheckoutModal onClose={() => setPay(false)} />}
  </main>;
}
