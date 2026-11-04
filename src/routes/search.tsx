import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { actions, useStore } from "@/lib/store";
import { meta } from "@/lib/poc";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/search")({ head: () => meta("Search the shelf", "Find independent books by title, author or genre."), component: SearchPage });
function SearchPage() {
  const books = useStore((s) => s.books), [query, setQuery] = useState(""); const nav = useNavigate();
  return <main className="mx-auto max-w-4xl px-6 py-10 pb-24"><h1 className="font-serif text-4xl">Search the shelf</h1><label className="mt-6 flex items-center gap-3 rounded-lg border bg-card p-3"><Search size={18} /><input aria-label="Search books" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title, author or genre" className="w-full bg-transparent outline-none" /></label><div className="mt-8 divide-y">{books.filter((b) => `${b.title} ${b.author} ${b.genre}`.toLowerCase().includes(query.toLowerCase())).map((b) => <div key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-5"><div><p className="font-serif text-xl">{b.title}</p><p className="mt-1 text-xs text-muted-foreground">{b.author} · {b.genre}</p></div><Button variant="outline" aria-label={`Read ${b.title}`} onClick={() => { actions.selectBook(b.id); nav({ to: "/" }); }}><ArrowRight size={18} /></Button></div>)}</div></main>;
}
