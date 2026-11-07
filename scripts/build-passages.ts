/**
 * Chooses the feed passage for every bundled book from its FULL text.
 *
 *   bun run build:passages            # all books
 *   bun run build:passages 345 1342   # just these Gutenberg IDs
 *
 * Downloads each book once from Project Gutenberg (politely, one at a time),
 * runs the extractor in src/lib/excerpt.ts over the first tenth of the story,
 * and saves the result into src/lib/gutenberg-catalogue.json. The app then
 * uses these instead of searching only the bundled 500-word openings.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { bestPassage } from "../src/lib/excerpt";

const file = new URL("../src/lib/gutenberg-catalogue.json", import.meta.url);
const catalogue = JSON.parse(readFileSync(file, "utf8")) as { id: number; title: string; passage?: unknown }[];
const only = process.argv.slice(2).map(Number).filter(Boolean);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let done = 0, failed = 0;
for (const book of catalogue) {
  if (only.length && !only.includes(book.id)) continue;
  try {
    const res = await fetch(`https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`, { headers: { "User-Agent": "SwipePage passage builder" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const p = bestPassage(await res.text());
    if (!p) throw new Error("no passage found");
    book.passage = { text: p.text, reasons: p.reasons, position: Math.round(p.position * 1000) / 1000, isOpening: p.isOpening };
    done++;
    console.log(`✓ ${book.title} — ${p.words} words, ${(p.position * 100).toFixed(1)}% into the story, score ${p.score}`);
  } catch (e) {
    failed++;
    console.warn(`✗ ${book.title}: ${(e as Error).message}`);
  }
  await sleep(1000);
}
writeFileSync(file, JSON.stringify(catalogue, null, 2));
console.log(`\nSaved ${done} passages${failed ? `, ${failed} failed (they keep using the bundled opening)` : ""}.`);
