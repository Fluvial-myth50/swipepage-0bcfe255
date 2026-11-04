import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { actions, useStore } from "@/lib/store";
import { extractHook, adEarnings, splitAd } from "@/lib/economy";
import { useTicker } from "@/hooks/use-ticker";
import { Button } from "@/components/ui/button";
import { canPublish, meta } from "@/lib/poc";

export const Route = createFileRoute("/author")({
  head: () => meta("Author Studio", "Publish independent books and review your simulated sales and ad earnings."),
  component: Author,
});

const steps = ["Tokenizing manuscript", "Scanning narrative tension", "Scoring candidate passages", "Extracting the ultimate hook", "Generating swipe card"];
const input = "w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary";

function Author() {
  const [tab, setTab] = useState<"publish" | "wallet">("publish");
  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-24">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">✓ Verified Author</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Author Studio</h1>
      <div className="mt-6 inline-flex rounded-full border bg-muted p-1 text-sm">
        {([["publish", "Publish"], ["wallet", "Earnings & Wallet"]] as const).map(([k, l]) => (
          <Button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 transition ${tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{l}</Button>
        ))}
      </div>
      {tab === "publish" ? <Publish /> : <Wallet />}
    </main>
  );
}

function Wallet() {
  const books = useStore((s) => s.books);
  const events = useStore((s) => s.events);
  const authors = [...new Set(books.map((b) => b.author))];
  const user = useStore((s) => s.user);
  const [me, setMe] = useState(user?.role === "writer" ? user.name : authors[0] ?? "");
  const mine = books.filter((b) => b.author === me);
  const sales = events.filter((e) => e.type === "purchase" && mine.some((b) => b.id === e.bookId));
  const swipes = events.filter((e) => e.type === "swipe" && mine.some((b) => b.id === e.bookId)).length;
  const readers = events.some((e) => e.type === "dwell" && mine.some((b) => b.id === e.bookId)) ? 1 : 0;
  const rows = mine.map((b) => {
    const secs = events.reduce((a, e) => a + (e.type === "dwell" && e.bookId === b.id ? e.seconds : 0), 0);
    return { b, secs, gross: adEarnings(secs) };
  });
  const gross = rows.reduce((a, r) => a + r.gross, 0);
  const { author, platform } = splitAd(gross);
  const salesGross = sales.reduce((a, e) => a + (e.type === "purchase" ? e.price : 0), 0);
  const salesNet = sales.reduce((a, e) => a + (e.type === "purchase" ? e.author : 0), 0);
  const tA = useTicker(author + salesNet), tP = useTicker(platform + salesGross - salesNet);
  return (
    <section className="mt-6">
      <select aria-label="Author earnings account" className={input} value={me} onChange={(e) => setMe(e.target.value)}>
        {[...new Set([me, ...authors])].filter(Boolean).map((a) => <option key={a}>{a}</option>)}
      </select>
      <div className="mt-5 grid grid-cols-3 gap-3">{[["Total Gross Revenue", `£${(salesGross + gross).toFixed(6)}`], ["Active Readers", readers], ["Total Swipes", swipes]].map(([label, value]) => <div key={label} className="min-w-0 border-b pb-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-all font-mono text-lg">{value}</p></div>)}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/40 bg-card p-5">
          <div className="text-xs text-muted-foreground">Your Available Balance (75%)</div>
          <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-primary">£{tA.toFixed(6)}</div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-xs text-muted-foreground">SwipePage System Fee (25%)</div>
          <div className="mt-1 font-mono text-3xl font-bold tabular-nums">£{tP.toFixed(6)}</div>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border">
        {rows.map(({ b, secs, gross }) => (
          <div key={b.id} className="flex justify-between border-b px-4 py-2.5 font-mono text-xs last:border-0">
            <span className="truncate font-sans">{b.title}</span>
            <span className="text-muted-foreground">{secs.toFixed(1)}s · £{gross.toFixed(6)}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-8 text-lg">Transactions</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-muted-foreground"><th className="py-3">Book Title</th><th>Edition</th><th>Gross</th><th>Author 75%</th><th>Fee 25%</th></tr></thead><tbody>{sales.map((e, i) => e.type === "purchase" && <tr key={i} className="border-b"><td className="py-3">{mine.find((b) => b.id === e.bookId)?.title}</td><td>{e.tier}</td><td>£{e.price.toFixed(2)}</td><td>£{e.author.toFixed(2)}</td><td>£{e.platform.toFixed(2)}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-xs text-muted-foreground">Session metrics only; active readers count this demo reader, not separate visitor accounts.</p>
      <p className="mt-3 text-xs text-muted-foreground">Ad earnings = (dwell seconds / 1000) × (£4.50 / 60), from reader time on your cards.</p>
    </section>
  );
}

function Publish() {
  const nav = useNavigate();
  const user = useStore((s) => s.user);
  const [f, setF] = useState({ title: "", author: user?.role === "writer" ? user.name : "", genre: "Thriller", price: "7.99", deluxePrice: "13.99", text: "", excerpt: "", bonus: false, audiobook: false });
  const [step, setStep] = useState(0);
  const [certified, setCertified] = useState(false);
  const [stage, setStage] = useState(-1);
  const [drag, setDrag] = useState(false);
  const words = f.text.trim() ? f.text.trim().split(/\s+/).length : 0;
  const ok = canPublish(f.title, f.author, f.text, certified) && Number(f.price) >= 0 && Number(f.deluxePrice) >= Number(f.price);

  const readFile = (file: File) => file.text().then((text) => setF((s) => ({ ...s, text, title: s.title || file.name.replace(/\.(txt|md)$/i, "") })));

  const publish = async () => {
    if (!ok) return;
    for (let i = 0; i < steps.length; i++) { setStage(i); await new Promise((r) => setTimeout(r, 750)); }
    const price = parseFloat(f.price) || 4.99;
    actions.publish({ title: f.title, author: f.author, genre: f.genre, price, deluxePrice: Number(f.deluxePrice), bonus: f.bonus, audiobook: f.audiobook,
      hook: f.excerpt.trim() || extractHook(f.text), body: f.text, hue: Math.floor(Math.random() * 360), verified: true });
    nav({ to: "/" });
  };

  return (
    <div>
      <p className="mt-4 text-muted-foreground">Drop a manuscript. We'll find the passage that makes readers stop scrolling. You keep 75%.</p>

      <div className="mt-6 flex gap-2 text-xs">{["Book details", "Manuscript", "Rights & publish"].map((label, i) => <Button variant={step === i ? "primary" : "outline"} key={label} onClick={() => setStep(i)}>{i + 1}. {label}</Button>)}</div>
      {step === 0 && <><div className="mt-8 grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Book title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className={input} placeholder="Pen name" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} />
        <select className={input} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}>
          {["Thriller", "Romance", "Fantasy", "Sci‑Fi", "Horror", "Literary", "Mystery"].map((g) => <option key={g}>{g}</option>)}
        </select>
        <input className={input} type="number" step="0.01" placeholder="Standard price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </div>

      <label className="mt-4 block rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">Cover image placeholder · optional<input type="file" accept="image/*" className="mt-3 block w-full" /></label></>}
      {step === 1 && <>
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const file = e.dataTransfer.files[0]; if (file) readFile(file); }}
        className={`mt-3 block cursor-pointer rounded-2xl border-2 border-dashed p-5 text-center text-sm transition ${drag ? "border-primary bg-primary/5" : "text-muted-foreground"}`}>
        Drag a .txt or .md file here, or click to browse
        <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])} />
      </label>
      <textarea className={`${input} mt-3 h-64 font-serif`} placeholder="…or paste your manuscript here (100+ words)" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} />
      <p className="mt-1 text-right text-xs text-muted-foreground">{words} words</p>
      <textarea aria-label="Blurb or excerpt" className={`${input} mt-3 h-24`} placeholder="Blurb / excerpt (optional)" value={f.excerpt} onChange={(e) => setF({ ...f, excerpt: e.target.value })} /></>}
      {step === 2 && <div className="mt-6 space-y-4"><label className="block text-sm">Deluxe price (£)<input className={`${input} mt-2`} type="number" min="0" step="0.01" value={f.deluxePrice} onChange={(e) => setF({ ...f, deluxePrice: e.target.value })} /></label><label className="flex gap-3 text-sm"><input type="checkbox" checked={f.bonus} onChange={(e) => setF({ ...f, bonus: e.target.checked })} />Bonus chapters</label><label className="flex gap-3 text-sm"><input type="checkbox" checked={f.audiobook} onChange={(e) => setF({ ...f, audiobook: e.target.checked })} />Audiobook companion</label><label className="flex items-start gap-3 border-t pt-5 text-sm"><input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} className="mt-1 shrink-0" />I legally certify that I own the copyrights to this work and assume all liability for content distribution.</label></div>}

      {step < 2 ? <Button onClick={() => setStep(step + 1)} className="mt-5 w-full">Next step</Button> : <Button disabled={!ok || stage >= 0} onClick={publish}
        className="mt-4 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition disabled:opacity-30 disabled:shadow-none">
        Publish to Feed
      </Button>}

      {stage >= 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
          <div className="w-full max-w-sm px-6">
            <div className="relative h-40 overflow-hidden rounded-2xl border bg-card p-4 font-serif text-xs leading-relaxed text-muted-foreground">
              {f.text.slice(0, 600)}
              <div className="animate-scan absolute inset-x-0 top-0 h-10 bg-primary/30 blur-md" />
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {steps.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 transition ${i <= stage ? "" : "opacity-30"}`}>
                  <span className={i < stage ? "text-primary" : i === stage ? "animate-pulse text-primary" : ""}>{i < stage ? "✓" : "◆"}</span>{s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
