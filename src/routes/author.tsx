import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { actions } from "@/lib/store";
import { extractHook } from "@/lib/economy";

export const Route = createFileRoute("/author")({
  head: () => ({
    meta: [
      { title: "Author Studio — SwipePage" },
      { name: "description", content: "Upload a manuscript and let the AI pipeline extract your hook." },
      { property: "og:title", content: "Author Studio — SwipePage" },
      { property: "og:description", content: "Upload a manuscript and let the AI pipeline extract your hook." },
    ],
  }),
  component: Author,
});

const steps = ["Tokenizing manuscript", "Gemini scanning narrative tension", "Scoring candidate passages", "Extracting the ultimate hook", "Generating swipe card"];
const input = "w-full rounded-xl border bg-muted px-4 py-3 text-sm outline-none focus:border-primary";

function Author() {
  const nav = useNavigate();
  const [f, setF] = useState({ title: "", author: "", genre: "Thriller", price: "7.99", text: "" });
  const [stage, setStage] = useState(-1);
  const [drag, setDrag] = useState(false);
  const words = f.text.trim() ? f.text.trim().split(/\s+/).length : 0;
  const ok = f.title && f.author && words >= 100;

  const readFile = (file: File) => file.text().then((text) => setF((s) => ({ ...s, text, title: s.title || file.name.replace(/\.(txt|md)$/i, "") })));

  const publish = async () => {
    for (let i = 0; i < steps.length; i++) { setStage(i); await new Promise((r) => setTimeout(r, 750)); }
    const price = parseFloat(f.price) || 4.99;
    actions.publish({ title: f.title, author: f.author, genre: f.genre, price, deluxePrice: Math.round(price * 1.7 * 100) / 100,
      hook: extractHook(f.text), body: f.text, hue: Math.floor(Math.random() * 360), verified: true });
    nav({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-2xl px-5 pt-24 pb-16">
      <p className="text-xs uppercase tracking-[0.2em] text-primary">✓ Verified Author</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Author Studio</h1>
      <p className="mt-2 text-muted-foreground">Drop a manuscript. We'll find the passage that makes readers stop scrolling. You keep 75%.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <input className={input} placeholder="Book title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className={input} placeholder="Pen name" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} />
        <select className={input} value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}>
          {["Thriller", "Romance", "Fantasy", "Sci‑Fi", "Horror", "Literary", "Mystery"].map((g) => <option key={g}>{g}</option>)}
        </select>
        <input className={input} type="number" step="0.01" placeholder="Standard price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
      </div>

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

      <button disabled={!ok || stage >= 0} onClick={publish}
        className="mt-4 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition disabled:opacity-30 disabled:shadow-none">
        Publish
      </button>

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
    </main>
  );
}
