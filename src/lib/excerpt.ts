/**
 * Finds the most gripping ~150-word passage in the first tenth of a book.
 *
 * 1. Clean up: drop Project Gutenberg boilerplate, illustration and footnote
 *    markers, and join hard-wrapped lines back into paragraphs.
 * 2. Find where the story starts: skip the title page, contents, preface,
 *    introduction and similar front matter.
 * 3. Look only at the first 10% of the story, so the passage can't spoil
 *    the ending and the reader has the context they need.
 * 4. Try every passage that starts at a sentence, ends on a full sentence and
 *    stays under 150 words, without crossing a chapter break.
 * 5. Score each one on features that make a reader stop scrolling, and keep
 *    the best. Every score can be explained in plain words.
 */

export const PASSAGE_WORDS = 150;
const MIN_WORDS = 110;
const WINDOW_SHARE = 0.1; // first 10% of the story
const MIN_WINDOW_WORDS = 1200; // short stories still get a fair search
/** Authors craft first lines as hooks, so the opening gets a small head start. */
export const OPENING_BONUS = 0.04;

export type PassageFeatures = {
  tension: number; dialogue: number; pace: number; drama: number;
  names: number; clarity: number; standalone: number; length: number;
};
export type Passage = {
  text: string;
  words: number;
  score: number; // 0–1
  features: PassageFeatures;
  reasons: string[]; // the passage's strongest qualities
  position: number; // 0–1, how far into the story it starts
  isOpening: boolean;
  searchedWords: number; // size of the window that was searched
};

/** How much each feature counts. They add up to 1. */
export const WEIGHTS: PassageFeatures = { tension: 0.2, dialogue: 0.15, pace: 0.15, standalone: 0.15, drama: 0.1, names: 0.1, clarity: 0.1, length: 0.05 };

// Word stems that signal suspense, danger, mystery or strong feeling.
const TENSION = ["afraid", "alarm", "beast", "blood", "breath", "corpse", "cried", "cry", "curse", "danger", "dark", "dead", "death", "devil", "die", "died", "disappear", "door", "dread", "escap", "fear", "fled", "flee", "footstep", "fright", "ghost", "grave", "gun", "heart", "hidden", "hide", "horr", "hush", "kill", "kiss", "knife", "lost", "love", "midnight", "monster", "murder", "myster", "never", "night", "pale", "pistol", "poison", "prisoner", "ran", "scream", "secret", "shadow", "shot", "shriek", "shudder", "silen", "storm", "strange", "sudden", "sword", "tears", "terr", "trap", "trembl", "unknown", "vanish", "warn", "weep", "wept", "whisper", "wild", "wonder"];
const TENSION_RE = new RegExp(`\\b(${TENSION.join("|")})[a-z]*\\b`, "gi");
const ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|St|Mt|Capt|Col|Gen|Lt|Sr|Jr|Messrs|Mme|Mlle|Prof|Rev|Hon|No|vs|etc|i\.e|e\.g)\./g;
const FRONT_MATTER = /^(contents|table of contents|list of illustrations|illustrations|preface|introduction|introductory note|note|notes|foreword|dedication|advertisement|transcriber|author's note|biographical|editor|translator|to the reader|bibliography|chronology)/i;
const CHAPTER = /^(chapter|book|part|stave|letter|volume|canto|section|adventure|fit)\b|^[ivxlc]+\.?(\s|$)|^\d+\.?(\s|$)/i;
const NOT_NAMES = new Set(["I", "God", "Sir", "Madam", "Lord", "Lady", "Miss", "Mr", "Mrs", "Dr", "Oh", "O", "Yes", "No", "English", "French", "London", "Heaven"]);
const DANGLING = /^["“‘']?(but|and|or|so|then|this|these|those|that|such|thus|hence|however|nevertheless|also|besides)\b/i;
const PRONOUN_START = /^["“‘']?(it|its|he|she|they|his|her|their|him|them|we|our)\b/i;

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const countWords = (s: string) => (s.match(/\S+/g) ?? []).length;

type Para = { text: string; heading: boolean; front: boolean };
type Sentence = { text: string; words: number; para: number; paraStart: boolean; paraEnd: boolean };

/** Removes Gutenberg licence text and markers, and rebuilds paragraphs. */
export function cleanText(raw: string): string[] {
  let text = raw.replace(/\r\n?/g, "\n");
  const start = text.match(/\*\*\*\s*START OF[^\n]*\*\*\*/i);
  if (start?.index !== undefined) text = text.slice(start.index + start[0].length);
  text = text.split(/\*\*\*\s*END OF[^\n]*PROJECT GUTENBERG/i)[0] ?? text;
  // Markers can nest ([Illustration: … [Copyright …]]), so strip innermost brackets first.
  for (let i = 0; i < 3; i++) text = text.replace(/\[[^[\]]*\]/g, (m) => /^\[(Illustration|Footnote|Sidenote|Copyright|_|\d)/i.test(m) || m.length < 6 ? " " : m);
  text = text.replace(/\[(Illustration|Footnote|Sidenote)[^\]]*\]?/gi, " ");
  return text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").replace(/_([^_]+)_/g, "$1").trim()).filter(Boolean);
}

function isHeading(p: string) {
  const words = countWords(p);
  if (words > 14) return false;
  const letters = p.replace(/[^A-Za-z]/g, "");
  const caps = letters.replace(/[^A-Z]/g, "").length / Math.max(1, letters.length);
  return CHAPTER.test(p) || caps > 0.6 || !/[.!?"”’'—)\]]$/.test(p);
}

/** Marks headings and front matter so the search starts where the story does. */
function classify(paras: string[]): Para[] {
  const out: Para[] = [];
  let front = false, seenChapter = false;
  for (const text of paras) {
    const heading = isHeading(text);
    if (heading) {
      if (FRONT_MATTER.test(text)) front = true;
      else if (CHAPTER.test(text)) { front = false; seenChapter = true; }
    }
    out.push({ text, heading, front });
  }
  // A preface with no later chapter heading: don't throw the whole book away.
  if (!seenChapter) for (const p of out) p.front = FRONT_MATTER.test(p.text) && p.heading;
  return out;
}

const isProse = (p: Para) => !p.heading && !p.front && countWords(p.text) >= 25 && /[a-z]/.test(p.text);

function splitSentences(paragraph: string): string[] {
  const safe = paragraph.replace(ABBREVIATIONS, (m) => m.replace(/\./g, "§"));
  return safe.split(/(?<=[.!?][”"’')\]]*)\s+(?=["“‘'(]?[A-Z0-9])/).map((s) => s.replace(/§/g, ".").trim()).filter(Boolean);
}

function features(sentences: Sentence[]): PassageFeatures {
  const text = sentences.map((s) => s.text).join(" ");
  const words = countWords(text);
  const per100 = (n: number) => (n / words) * 100;
  const quoted = sentences.filter((s) => /[“"]|(^|\s)‘/.test(s.text)).length / sentences.length;
  const avgLen = words / sentences.length;
  const drama = (text.match(/[!?—]|--/g) ?? []).length;
  const tokens = text.split(/\s+/);
  const names = new Set<string>();
  tokens.forEach((t, i) => {
    const w = t.replace(/^[^A-Za-z]+|[^A-Za-z']+$/g, "").replace(/'s$/, "");
    const prev = tokens[i - 1] ?? "";
    if (i > 0 && /^[A-Z][a-z]+/.test(w) && !/[.!?:"“]$/.test(prev) && !NOT_NAMES.has(w)) names.add(w);
  });
  const letters = text.replace(/[^A-Za-z]/g, "").length / words;
  const heavyPunct = (text.match(/[;:]/g) ?? []).length / sentences.length;
  const digits = per100((text.match(/\d+/g) ?? []).length);
  const first = sentences[0]!, last = sentences.at(-1)!;
  return {
    tension: clamp(per100((text.match(TENSION_RE) ?? []).length) / 3),
    dialogue: clamp(1 - Math.abs(quoted - 0.4) / 0.6),
    pace: avgLen < 6 ? 0.5 : avgLen <= 20 ? 1 : clamp(1 - (avgLen - 20) / 20),
    drama: clamp(drama / 4),
    names: clamp(1 - (names.size - 3) / 7),
    clarity: clamp(1 - Math.max(0, letters - 4.5) / 1.2) * clamp(1 - heavyPunct / 1.5) * clamp(1 - digits / 6),
    standalone: (first.paraStart ? 0.5 : 0) + (last.paraEnd ? 0.3 : 0) + (DANGLING.test(first.text) ? 0 : PRONOUN_START.test(first.text) ? 0.05 : 0.2),
    length: clamp(words / PASSAGE_WORDS),
  };
}

/** False when a passage would start or end in the middle of someone speaking. */
export function quotesBalanced(text: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === "“") depth++;
    else if (ch === "”") { if (--depth < 0) return false; }
  }
  if (depth !== 0) return false;
  return ((text.match(/"/g) ?? []).length % 2) === 0;
}

const LABELS: Record<keyof PassageFeatures, string> = {
  tension: "builds tension", dialogue: "mixes dialogue with action", pace: "moves quickly",
  drama: "has dramatic moments", names: "introduces few unfamiliar names", clarity: "easy to read",
  standalone: "makes sense on its own", length: "uses the full 150 words",
};

/** The best passage in the first tenth of the story, or null if the text is too short. */
export function bestPassage(raw: string, opts: { windowShare?: number } = {}): Passage | null {
  const paras = classify(cleanText(raw));
  const firstProse = paras.findIndex(isProse);
  if (firstProse < 0) return null;
  const story = paras.slice(firstProse).filter((p) => !p.front);
  const storyWords = story.reduce((a, p) => a + (p.heading ? 0 : countWords(p.text)), 0);
  const limit = Math.min(storyWords, Math.max(MIN_WINDOW_WORDS, Math.round(storyWords * (opts.windowShare ?? WINDOW_SHARE))));

  // Sentences in the search window; a heading breaks the run so passages never span chapters.
  const runs: Sentence[][] = [[]];
  let seen = 0;
  story.forEach((p, i) => {
    if (seen >= limit) return;
    if (p.heading) { if (runs.at(-1)!.length) runs.push([]); return; }
    const parts = splitSentences(p.text);
    parts.forEach((text, j) => {
      if (seen >= limit) return;
      const words = countWords(text);
      // An unfinished sentence (cut-off text, a stray heading) can't be part of a passage.
      if (!/[.!?…][”"’')\]]*$/.test(text)) { seen += words; if (runs.at(-1)!.length) runs.push([]); return; }
      runs.at(-1)!.push({ text, words, para: i, paraStart: j === 0, paraEnd: j === parts.length - 1 });
      seen += words;
    });
  });

  let best: { sentences: Sentence[]; score: number; f: PassageFeatures; offset: number } | null = null;
  let offset = 0;
  for (const run of runs) {
    for (let s = 0; s < run.length; s++) {
      let words = 0, e = s;
      while (e < run.length && words + run[e]!.words <= PASSAGE_WORDS) words += run[e++]!.words;
      const chosen = run.slice(s, e);
      if (words >= MIN_WORDS && quotesBalanced(chosen.map((c) => c.text).join(" "))) {
        const f = features(chosen);
        const score = (Object.keys(WEIGHTS) as (keyof PassageFeatures)[]).reduce((a, k) => a + WEIGHTS[k] * f[k], 0) + (offset === 0 ? OPENING_BONUS : 0);
        if (!best || score > best.score + 1e-9) best = { sentences: chosen, score, f, offset };
      }
      offset += run[s]!.words;
    }
  }
  // Nothing fits (e.g. one enormous sentence): fall back to the opening, cut at a word.
  if (!best) {
    const text = story.find(isProse)!.text.split(/\s+/).slice(0, PASSAGE_WORDS).join(" ");
    const f = features([{ text, words: countWords(text), para: 0, paraStart: true, paraEnd: false }]);
    return { text: text + "…", words: countWords(text), score: 0, features: f, reasons: [], position: 0, isOpening: true, searchedWords: limit };
  }
  const reasons = (Object.keys(WEIGHTS) as (keyof PassageFeatures)[])
    .filter((k) => k !== "length" && best!.f[k] >= 0.7)
    .sort((a, b) => WEIGHTS[b] * best!.f[b] - WEIGHTS[a] * best!.f[a])
    .slice(0, 3).map((k) => LABELS[k]);
  const text = best.sentences.reduce((acc, s, i) => acc + (i === 0 ? "" : s.paraStart ? "\n\n" : " ") + s.text, "");
  return {
    text, words: countWords(text), score: Math.round(best.score * 1000) / 1000, features: best.f, reasons,
    position: storyWords ? best.offset / storyWords : 0, isOpening: best.offset === 0, searchedWords: limit,
  };
}
