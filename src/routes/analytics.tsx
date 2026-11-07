import { createFileRoute } from "@tanstack/react-router";
import { actions, useStore, type Event } from "@/lib/store";
import { compareModes, computeReco } from "@/lib/reco";
import { Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/BookCover";
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
  const picks = useStore((s) => s.genres);
  const reco = computeReco(books, events, picks);
  const mode = useStore((s) => s.feedMode);
  const test = compareModes(events);
  const themes = Object.entries(reco.themeAffinity).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const name = (id: string) => books.find((b) => b.id === id)?.title ?? id;
  const dwells = events.filter((e) => e.type === "dwell");
  const purchases = events.filter((e) => e.type === "purchase");
  const avg = reco.globalAvgDwell;
  const revenue = purchases.reduce((a, e) => a + e.price, 0);
  const royalty = purchases.reduce((a, e) => a + e.author, 0);
  const platform = purchases.reduce((a, e) => a + e.platform, 0);

  const perBook = books.map((b) => {
    const s = reco.stats[b.id]!;
    return { b, avg: s.visits ? s.dwell / s.visits : 0, views: s.visits, skips: s.skips };
  }).filter((p) => p.views || p.skips).sort((x, y) => y.avg - x.avg);
  const max = Math.max(1, ...perBook.map((p) => p.avg));

  const impressions = events.filter((e) => e.type === "ad").length;
  const adGross = adEarnings(dwells.reduce((a, e) => a + e.seconds, 0));
  const tImp = useTicker(impressions);
  const tGross = useTicker(adGross);

  const stats = [
    ["Swipes", events.filter((e) => e.type === "swipe").length],
    ["Avg time per card", `${avg.toFixed(1)}s`],
    ["Quick skips", Object.values(reco.stats).reduce((a, s) => a + s.skips, 0)],
    ["Purchases", purchases.length],
    ["Gross", `£${revenue.toFixed(2)}`],
    ["Author royalties (75%) · £", `£${royalty.toFixed(2)}`],
    ["Platform fees (25%)", `£${platform.toFixed(2)}`],
  ];

  // One row per reading session instead of one per second of dwell.
  const log: Event[] = [];
  for (const e of events) {
    const last = log.at(-1);
    if (e.type === "dwell" && last?.type === "dwell" && last.bookId === e.bookId) log[log.length - 1] = { ...last, seconds: last.seconds + e.seconds };
    else log.push(e);
  }
  const genres = Object.entries(reco.genreAffinity).sort((a, b) => b[1] - a[1]);
  const upNext = books.filter((b) => !reco.stats[b.id]!.visits && !reco.stats[b.id]!.skips)
    .sort((x, y) => reco.recs[y.id]!.score - reco.recs[x.id]!.score).slice(0, 5);

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 pb-24">
      <h1 className="text-4xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-2 text-muted-foreground">
        Every interaction from the feed, logged live. {reco.signals < 3 ? "Read or skip a few cards and the predictions below start to move." : `The model has learned from ${reco.signals} signals so far.`}
      </p>
      <section className="mt-8 rounded-lg border border-primary/30 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg">Does personalisation help?</h2><p className="mt-1 text-sm text-muted-foreground">Switch the feed to random picks for a while, then compare how long each card held your attention.</p></div>
          <div className="flex rounded-lg border p-1">{(["personal", "random"] as const).map((m) => <Button key={m} size="sm" variant={mode === m ? "primary" : "ghost"} onClick={() => actions.feedMode(m)}>{m === "personal" ? "Personalised" : "Random"}</Button>)}</div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">{(["personal", "random"] as const).map((m) => <div key={m} className={`rounded-lg border p-4 ${mode === m ? "border-primary/50" : ""}`}>
          <p className="text-xs text-muted-foreground">{m === "personal" ? "Personalised feed" : "Random feed"}</p>
          <p className="mt-1 font-mono text-2xl font-bold">{test[m].avgSeconds.toFixed(1)}s <span className="text-xs font-normal text-muted-foreground">per card</span></p>
          <p className="mt-1 text-xs text-muted-foreground">{test[m].cards} cards · {Math.round(test[m].skipRate * 100)}% skipped</p>
        </div>)}</div>
        <p className="mt-3 text-xs text-muted-foreground">{test.personal.cards >= 5 && test.random.cards >= 5 ? (test.personal.avgSeconds > test.random.avgSeconds ? `The personalised feed held your attention ${(test.personal.avgSeconds / Math.max(test.random.avgSeconds, 0.1)).toFixed(1)}× longer per card.` : "So far the random feed is doing as well or better. Try a few more cards.") : "Read at least 5 cards in each mode for a fair comparison."}</p>
      </section>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-primary/30 bg-card p-5">
          <div className="text-xs text-muted-foreground">Total Platform Ad Impressions<DemoBadge>Simulated</DemoBadge></div>
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

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Time per card, by book</h2>
      <div className="mt-3 space-y-2">
        {perBook.length === 0 && <p className="text-sm text-muted-foreground">No cards read yet.</p>}
        {perBook.map(({ b, avg, views, skips }) => (
          <div key={b.id} className="flex items-center gap-3 text-sm">
            <span className="w-44 truncate">{b.title}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(avg / max) * 100}%` }} />
            </div>
            <span className="w-28 shrink-0 text-right font-mono text-xs text-muted-foreground">{views ? `${avg.toFixed(1)}s · ${views}×` : `skipped${skips > 1 ? ` ${skips}×` : ""}`}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Your taste profile — what the model predicts</h2>
      <div className="mt-3 space-y-2">
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

      {themes.length > 0 && <>
        <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Themes you respond to</h2>
        <div className="mt-3 flex flex-wrap gap-2">{themes.map(([t, v]) => <span key={t} className="rounded-full border px-3 py-1 text-xs" style={{ opacity: 0.45 + 0.55 * v }}>{t} · {Math.round(v * 100)}%</span>)}</div>
      </>}

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Predicted next picks</h2>
      <div className="mt-3 space-y-2">
        {upNext.map((b) => (
          <div key={b.id} className="flex items-center gap-3 text-sm">
            <span className="w-10 font-mono text-xs text-primary">{reco.recs[b.id]!.score}</span>
            <span className="min-w-0 flex-1 truncate">{b.title} <span className="text-muted-foreground">· {b.genre}</span></span>
            <span className="hidden w-80 truncate text-right text-xs text-muted-foreground sm:block">{reco.recs[b.id]!.reasons[0] ?? ""}</span>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Event log</h2>
      <div className="mt-3 overflow-hidden rounded-lg border">
        {events.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No events yet — go swipe some cards.</p>}
        {log.slice(0, 100).map((e, i) => (
          <div key={i} className="flex items-center justify-between border-b px-4 py-2.5 font-mono text-xs last:border-0">
            <span className={e.type === "purchase" ? "text-deluxe" : e.type === "dwell" ? "text-primary" : ""}>{e.type.toUpperCase()}</span>
            <span className="flex-1 truncate px-4 text-muted-foreground">{name(e.bookId)}</span>
            <span>
              {e.type === "dwell" && `${e.seconds}s`}
              {e.type === "swipe" && e.direction}
              {e.type === "ad" && `${e.slot} impression`}
              {e.type === "view" && "card shown"}
              {e.type === "open" && "opened full book"}
              {e.type === "bookmark" && "save toggled"}
              {e.type === "purchase" && `${e.tier} £${e.price.toFixed(2)} → author £${e.author.toFixed(2)} / platform £${e.platform.toFixed(2)}`}
            </span>
            <span className="ml-4 text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
