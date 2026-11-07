import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Feather, ArrowRight, Check } from "lucide-react";
import { actions } from "@/lib/store";
import { Button } from "./ui/button";
import island from "@/assets/salt-island.jpg";
export { GENRES } from "@/lib/gutenberg";
import { GENRES } from "@/lib/gutenberg";
export function Onboarding() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"reader" | "writer">("reader");
  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<string[]>([]);
  function finish() { actions.login({ name: name.trim(), role }, genres); nav({ to: role === "writer" ? "/author" : "/" }); }
  return <main className="relative flex min-h-dvh items-center justify-center px-6 py-12">
    <img src={island} width={768} height={1024} alt="A mysterious island surrounded by the sea" className="absolute inset-0 h-full w-full object-cover opacity-20" />
    <div className="absolute inset-0 bg-background/60" />
    <section className="relative w-full max-w-xl">
      <p className="mb-8 flex items-center gap-2 text-primary"><BookOpen size={22} /> Independent stories. Unexpected worlds.</p>
      <h1 className="font-serif text-5xl sm:text-6xl">SwipePage<span className="text-primary">.</span></h1>
      <p className="mt-3 text-muted-foreground">{step === 0 ? "Your next favourite book starts with a single page." : "What worlds do you get lost in?"}</p>
      {step === 0 ? <form onSubmit={(e) => { e.preventDefault(); if (role === "writer") finish(); else setStep(1); }} className="mt-8 space-y-5">
        <label className="block text-sm">Display name<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-lg border bg-background/80 p-3" placeholder="Your name" /></label>
        <div className="grid grid-cols-2 gap-3">{(["reader", "writer"] as const).map((r) => <Button type="button" aria-pressed={role === r} variant="outline" key={r} onClick={() => setRole(r)} className={`min-h-28 flex-col ${role === r ? "border-primary text-primary" : ""}`}>
          {r === "reader" ? <BookOpen /> : <Feather />} I am a {r === "reader" ? "Reader" : "Writer"}
        </Button>)}</div>
        <Button className="w-full" type="submit">Continue <ArrowRight size={16} /></Button>
        <p className="text-xs text-muted-foreground">Demo session: no account or password is created, and nothing is saved after you close the tab.</p>
      </form> : <div className="mt-8"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{GENRES.map((g, i) => <Button key={g} variant="outline" aria-pressed={genres.includes(g)} className={`animate-card-in min-h-24 flex-col ${genres.includes(g) ? "border-primary text-primary" : ""}`} style={{ animationDelay: `${i * 40}ms` }} onClick={() => setGenres((s) => s.includes(g) ? s.filter((v) => v !== g) : [...s, g])}><BookOpen size={20} />{g}{genres.includes(g) && <Check size={14} />}</Button>)}</div><Button disabled={!genres.length} onClick={finish} className="mt-6 w-full">Find my next read <ArrowRight size={16} /></Button></div>}
    </section>
  </main>;
}
