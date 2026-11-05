import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Shield, Download, LoaderCircle } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { getBookText, getCatalogue } from "@/lib/gutenberg.functions";
import { liveExcerpt } from "@/lib/gutenberg";
import { meta } from "@/lib/poc";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/admin")({ head: () => meta("Content ingestion admin", "Review and approve real Gutenberg book imports in the SwipePage demo queue."), component: Admin });
function Admin() {
 const user = useStore((s) => s.user), queue = useStore((s) => s.queue), books = useStore((s) => s.books); const [query, setQuery] = useState("Dracula"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
 const catalogue = useServerFn(getCatalogue), text = useServerFn(getBookText);
 if (user?.role !== "admin") return <main className="p-10"><Shield /><h1 className="mt-4 text-2xl">Admin access required</h1><p className="mt-2 text-muted-foreground">This panel is restricted to the admin demo role.</p></main>;
 async function lookup() {
  if (busy) return; setBusy(true); setError("");
  try { const result = await catalogue({ data: /^\d+$/.test(query) ? { id: Number(query) } : { search: query } });
   for (const b of result.results.slice(0, 12)) {
    const url = Object.entries(b.formats).find(([k]) => k.includes("text/plain"))?.[1];
    if (!url || b.copyright === true) continue;
    actions.enqueue({ id: b.id, title: b.title, author: b.authors.map((a) => a.name).join(" & "), language: b.languages.join(", "), url, body: "", status: "Pending Processing" });
   }
   if (!result.results.length) setError("No titles found. Try a book ID or another title.");
  } catch { setError("Gutenberg catalogue unavailable. Please retry."); } finally { setBusy(false); }
 }
 async function approve(id: number) {
  const item = queue.find((q) => q.id === id); if (!item || item.status !== "Pending Processing") return; actions.queueStatus(id, "Scrambling DRM");
  try { const { body } = await text({ data: { id } });
   const existing = books.find((b) => b.id === `g${id}`);
   if (existing) actions.bookText(existing.id, body, liveExcerpt(body));
   else actions.addBooks([{ id: `g${id}`, title: item.title, author: item.author, genre: "Classic Literature", body, hook: liveExcerpt(body), price: 0, deluxePrice: 0, hue: 140, verified: false, source: item.url, language: item.language }]);
   actions.queueStatus(id, "Live in Feed");
  } catch { actions.queueStatus(id, "Pending Processing"); setError("The original text could not be retrieved. Retry approval."); }
 }
 return <main className="mx-auto max-w-5xl px-6 py-10 pb-24"><p className="text-xs uppercase tracking-widest text-primary">Admin · demo only</p><h1 className="mt-3 font-serif text-4xl">Content Ingestion</h1><p className="mt-3 text-sm text-muted-foreground">Project Gutenberg · real titles, authors and original texts</p><form className="mt-8 flex gap-3" onSubmit={(e) => { e.preventDefault(); void lookup(); }}><input aria-label="Gutenberg Book ID or title" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-lg border bg-muted p-3" /><Button disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Download size={16} />}Fetch titles</Button></form>{error && <p className="mt-3 text-destructive" role="alert">{error}</p>}<div className="mt-8 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="p-3">Title / Author</th><th>Language</th><th>Status</th><th>Action</th></tr></thead><tbody>{queue.map((q) => <tr key={q.id} className="border-b"><td className="p-3"><p>{q.title}</p><p className="mt-1 text-xs text-muted-foreground">{q.author}</p><a href={q.url} target="_blank" rel="noreferrer" className="text-xs text-primary">Gutenberg source ↗</a></td><td>{q.language}</td><td><span className={q.status === "Live in Feed" ? "text-primary" : "text-deluxe"}>{q.status}</span></td><td><Button variant="outline" disabled={q.status !== "Pending Processing"} onClick={() => approve(q.id)}>{q.status === "Scrambling DRM" && <LoaderCircle size={14} className="animate-spin" />}Approve & Push</Button></td></tr>)}</tbody></table></div><p className="mt-5 text-xs text-muted-foreground">Public catalogue titles also load automatically. Approval prepares full text for this session. Confirm public-domain eligibility in your jurisdiction before real distribution.</p></main>;
}
