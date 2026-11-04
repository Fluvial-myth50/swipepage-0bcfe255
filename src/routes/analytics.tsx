import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { computeReco } from "@/lib/reco";
import { adEarnings } from "@/lib/economy";
import { meta } from "@/lib/poc";
import { useTicker } from "@/hooks/use-ticker";

export const Route = createFileRoute("/analytics")({
  head: () => meta("Reading analytics", "Track reading interest, simulated ad impressions and author revenue across SwipePage."),
  component: Analytics,
});

function Analytics() {
  const events = useStore((s) => s.events);
  const books = useStore((s) => s.books);
  const name = (id: string) => books.find((b) => b.id === id)?.title ?? id;
  const dwells = events.filter((e) => e.type === "dwell");
  const purchases = events.filter((e) => e.type === "purchase");
  const avg = dwells.length ? dwells.reduce((a, e) => a + e.seconds, 0) / dwells.length : 0;
  const revenue = purchases.reduce((a, e) => a + e.price, 0);
  const royalty = purchases.reduce((a, e) => a + e.author, 0);
  const platform = purchases.reduce((a, e) => a + e.platform, 0);

  const perBook = books.map((b) => {
    const d = dwells.filter((e) => e.bookId === b.id);
    return { b, avg: d.length ? d.reduce((a, e) => a + e.seconds, 0) / d.length : 0, views: d.length };
  });
  const max = Math.max(1, ...perBook.map((p) => p.avg));

  const impressions = events.filter((e) => e.type === "ad").length;
  const adGross = adEarnings(dwells.reduce((a, e) => a + e.seconds, 0));
  const tImp = useTicker(impressions);
  const tGross = useTicker(adGross);

  const stats = [
    ["Swipes", events.filter((e) => e.type === "swipe").length],
    ["Avg dwell", `${avg.toFixed(1)}s`],
    ["Purchases", purchases.length],
    ["Gross", `£${revenue.toFixed(2)}`],
    ["Author royalties (75%) · £", `£${royalty.toFixed(2)}`],
    ["Platform fees (25%)", `£${platform.toFixed(2)}`],
  ];

  const reco = computeReco(books, events);
  const genres = Object.entries(reco.genreAffinity).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 pb-24">
      <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-2 text-muted-foreground">
        Every interaction from the feed, logged live. {reco.signals < 3 ? "The model needs a few more signals before it predicts." : `The model has ${reco.signals} signals to learn from.`}
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-primary/30 bg-card p-5">
          <div className="text-xs text-muted-foreground">Total Platform Ad Impressions</div>
          <div className="mt-1 font-mono text-3xl font-bold tabular-nums">{Math.round(tImp).toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-deluxe/30 bg-card p-5">
          <div className="text-xs text-muted-foreground">Total Platform Gross Ad Revenue · £4.50 CPM</div>
          <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-deluxe">£{tGross.toFixed(6)}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 text-2xl font-bold">{v}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Avg dwell per book</h2>
      <div className="mt-3 space-y-2">
        {perBook.map(({ b, avg, views }) => (
          <div key={b.id} className="flex items-center gap-3 text-sm">
            <span className="w-44 truncate">{b.title}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(avg / max) * 100}%` }} />
            </div>
            <span className="w-24 text-right font-mono text-xs text-muted-foreground">{avg.toFixed(1)}s · {views}×</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Your taste profile — what the model predicts</h2>
      <div className="mt-3 space-y-2">
        {genres.length === 0 && <p className="text-sm text-muted-foreground">No reading time logged yet — swipe a few cards and this fills in.</p>}
        {genres.map(([g, v]) => (
          <div key={g} className="flex items-center gap-3 text-sm">
            <span className="w-44 truncate">{g}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-deluxe transition-all" style={{ width: `${v * 100}%` }} />
            </div>
            <span className="w-16 text-right font-mono text-xs text-muted-foreground">{Math.round(v * 100)}%</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Event log</h2>
      <div className="mt-3 overflow-hidden rounded-lg border">
        {events.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No events yet — go swipe some cards.</p>}
        {events.slice(0, 100).map((e, i) => (
          <div key={i} className="flex items-center justify-between border-b px-4 py-2.5 font-mono text-xs last:border-0">
            <span className={e.type === "purchase" ? "text-deluxe" : e.type === "dwell" ? "text-primary" : ""}>{e.type.toUpperCase()}</span>
            <span className="flex-1 truncate px-4 text-muted-foreground">{name(e.bookId)}</span>
            <span>
              {e.type === "dwell" && `${e.seconds}s`}
              {e.type === "swipe" && e.direction}
              {e.type === "ad" && `${e.slot} impression`}
              {e.type === "purchase" && `${e.tier} $${e.price} → author $${e.author} / platform $${e.platform}`}
            </span>
            <span className="ml-4 text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
