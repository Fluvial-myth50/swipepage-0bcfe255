import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Gauge, Layers, Shuffle, ArrowRight, ArrowDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { meta } from "@/lib/poc";
import { WEIGHTS, PASSAGE_WORDS, OPENING_BONUS } from "@/lib/excerpt";
import { computeReco, dwellScore, DWELL_HALF_LIFE, EXPLORE_EVERY, PRIOR_OTHER, PRIOR_PICKED, QUICK_SKIP_SECONDS } from "@/lib/reco";

export const Route = createFileRoute("/how-it-works")({ head: () => meta("How recommendations work", "A plain-English guide to how SwipePage learns what you like to read."), component: HowItWorks });

const steps = [
  { icon: Eye, title: "Watch", text: "Every card you see is a visit. The app notes how long you read, and whether you open, save or skip the book." },
  { icon: Gauge, title: "Score", text: "Each book gets an engagement score from 0 to 1. Reading time counts most, with diminishing returns." },
  { icon: Layers, title: "Learn", text: "Scores roll up into your taste for each genre, author and theme, starting from the genres you picked." },
  { icon: Shuffle, title: "Choose", text: "The next card is the unseen book you're predicted to like most, with regular detours to keep things fresh." },
];

/** Small chart of how reading time turns into an engagement score. */
function DwellCurve() {
  const w = 320, h = 140, pad = 28, max = 90;
  const x = (t: number) => pad + (t / max) * (w - pad * 1.5);
  const y = (v: number) => h - pad - v * (h - pad * 1.8);
  const d = Array.from({ length: 46 }, (_, i) => i * 2).map((t, i) => `${i ? "L" : "M"}${x(t).toFixed(1)},${y(dwellScore(t)).toFixed(1)}`).join(" ");
  const marks = [3, 25, 60];
  return <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md" role="img" aria-label="Engagement rises quickly over the first 25 seconds of reading, then levels off">
    <line x1={pad} y1={y(0)} x2={w - pad / 2} y2={y(0)} stroke="currentColor" opacity="0.25" />
    <line x1={pad} y1={y(0)} x2={pad} y2={y(1)} stroke="currentColor" opacity="0.25" />
    <path d={d} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />
    {marks.map((t) => <g key={t}><circle cx={x(t)} cy={y(dwellScore(t))} r="3.5" fill="var(--color-primary)" /><text x={x(t) + 6} y={y(dwellScore(t)) + 14} fontSize="10" fill="currentColor" opacity="0.8">{t}s → {dwellScore(t).toFixed(2)}</text></g>)}
    <text x={pad} y={h - 8} fontSize="10" fill="currentColor" opacity="0.6">0s</text>
    <text x={w - pad} y={h - 8} fontSize="10" fill="currentColor" opacity="0.6" textAnchor="end">{max}s reading</text>
    <text x={pad - 6} y={y(1) + 4} fontSize="10" fill="currentColor" opacity="0.6" textAnchor="end">1</text>
  </svg>;
}

function HowItWorks() {
  const books = useStore((s) => s.books), events = useStore((s) => s.events), picks = useStore((s) => s.genres);
  const reco = computeReco(books, events, picks);
  const top = Object.entries(reco.genreAffinity).sort((a, b) => b[1] - a[1]);
  const themes = Object.entries(reco.themeAffinity).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return <main className="mx-auto max-w-3xl px-6 py-10 pb-24">
    <p className="text-xs uppercase tracking-widest text-primary">Under the hood</p>
    <h1 className="mt-2 font-serif text-4xl">How SwipePage picks your next book</h1>
    <p className="mt-4 leading-relaxed text-muted-foreground">There's no hidden magic. The feed is a small, rule-based recommendation model that learns from what you do on this device. It doesn't use data from other readers, and every card shows why it was picked.</p>

    <ol className="mt-10 flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
      {steps.map((s, i) => <li key={s.title} className="contents">
        <div className="flex-1 rounded-lg border bg-card p-4"><s.icon size={20} className="text-primary" /><p className="mt-3 font-semibold">{i + 1}. {s.title}</p><p className="mt-1 text-sm text-muted-foreground">{s.text}</p></div>
        {i < steps.length - 1 && <><ArrowDown className="mx-auto shrink-0 text-muted-foreground lg:hidden" size={18} /><ArrowRight className="hidden shrink-0 text-muted-foreground lg:block" size={18} /></>}
      </li>)}
    </ol>

    <section className="mt-12">
      <h2 className="font-serif text-2xl">1. Reading time, not clicks</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">Time spent on a book's opening page is the strongest signal. It's scored as 1 − e<sup>−t/{DWELL_HALF_LIFE}</sup>, so the first half-minute counts most and leaving a card open doesn't run up the score forever. Opening the full book adds 0.3, saving it adds 0.2 and buying it adds 0.4. Swiping away within {QUICK_SKIP_SECONDS} seconds is a <em>quick skip</em> and takes 0.25 off.</p>
      <div className="mt-5 rounded-lg border p-4"><DwellCurve /></div>
    </section>

    <section className="mt-12">
      <h2 className="font-serif text-2xl">2. Your sign-up picks are a starting guess</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">Genres you choose at sign-up start at {PRIOR_PICKED}, and the rest at {PRIOR_OTHER}. That guess counts as much as two books' worth of evidence. After that, each book you read or skip in a genre moves its score towards what you actually did. This is a Bayesian average: a few cards are enough to overrule your first choices, but one stray skip isn't.</p>
    </section>

    <section className="mt-12">
      <h2 className="font-serif text-2xl">3. Authors and themes carry across genres</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">Every book is tagged with themes like <em>Gothic</em>, <em>sea voyage</em> or <em>detective</em>. Liking <em>Dracula</em> lifts other Gothic books, including <em>Jane Eyre</em> on the Romance shelf. Authors work the same way. The model trusts these links more as evidence builds up.</p>
    </section>

    <section className="mt-12">
      <h2 className="font-serif text-2xl">4. Avoiding a filter bubble</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">Always showing the top-scoring book would trap you in one genre. So the model gently penalises showing the same genre several times in a row, and every {EXPLORE_EVERY}th card is an <em>exploration</em> pick from the genre you've seen least. No book repeats until you've seen the whole shelf.</p>
    </section>

    <section className="mt-12">
      <h2 className="font-serif text-2xl">5. Choosing the passage on each card</h2>
      <p className="mt-3 leading-relaxed text-muted-foreground">The text on a card isn't always the first page. A second algorithm reads the start of each book and picks the most gripping {PASSAGE_WORDS} words. It:</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 leading-relaxed text-muted-foreground">
        <li>removes Project Gutenberg's licence text and illustration notes, and skips the title page, contents and preface;</li>
        <li>searches only the first 10% of the story, so it can't give away the ending, and you meet the characters it mentions soon after;</li>
        <li>tries every passage that starts at a sentence and ends on a full sentence, without crossing a chapter break or cutting off someone mid-speech;</li>
        <li>scores each one and keeps the best.</li>
      </ol>
      <div className="mt-5 overflow-hidden rounded-lg border">
        {([["tension", "Words of suspense, danger or strong feeling"], ["dialogue", "Some speech mixed with narration (about 40% is ideal)"], ["pace", "Short-to-medium sentences"], ["standalone", "Starts a paragraph and doesn't open with “But…” or “It…”"], ["drama", "Exclamations, questions and dashes"], ["names", "Few characters you haven't met yet"], ["clarity", "Plain words, few semicolons or numbers"], ["length", "Close to the full 150 words"]] as const).map(([k, label]) => (
          <div key={k} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0">
            <span className="w-12 shrink-0 font-mono text-xs text-primary">{Math.round(WEIGHTS[k] * 100)}%</span><span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">The opening gets a small bonus (+{OPENING_BONUS}), because authors write first lines to hook readers. On about a third of the shelf the opening still wins. When you tap Read, the book opens at the page where the passage appears.</p>
    </section>

    <section className="mt-12 rounded-lg border border-primary/30 bg-card p-5">
      <h2 className="text-lg">What it has learned about you so far</h2>
      {reco.signals < 3 ? <p className="mt-2 text-sm text-muted-foreground">Not much yet. Read or skip a few cards in the <Link to="/" className="text-primary">feed</Link> and come back.</p> : <>
        <p className="mt-2 text-sm text-muted-foreground">From {reco.signals} signals, with an average of {reco.globalAvgDwell.toFixed(1)}s per card:</p>
        <ul className="mt-3 space-y-1 text-sm">{top.slice(0, 3).map(([g, v]) => <li key={g}>{g}: <span className="font-mono text-primary">{Math.round(v * 100)}%</span></li>)}</ul>
        {themes.length > 0 && <p className="mt-3 text-sm">Themes you respond to: {themes.map(([t]) => t).join(", ")}</p>}
      </>}
      <p className="mt-4 text-sm"><Link to="/analytics" className="text-primary">See the full analytics</Link>, or test it: switch to the random feed there and compare.</p>
    </section>

    <section className="mt-12">
      <h2 className="font-serif text-2xl">Limitations</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
        <li>It only learns from you. Real services also use what similar readers enjoyed (collaborative filtering), which needs many users.</li>
        <li>The weights were chosen by hand, not trained on data, so they're sensible guesses rather than optimised values.</li>
        <li>Reading time can mislead: a long pause might mean you were distracted, not hooked. Capping each visit at three minutes limits that.</li>
        <li>“Gripping” is measured with simple text features, not real understanding. A list of tense words can't tell a thrilling scene from a dull one that happens to mention blood.</li>
        <li>Your history stays in this browser. That's good for privacy, but it doesn't follow you to another device.</li>
      </ul>
    </section>
  </main>;
}
