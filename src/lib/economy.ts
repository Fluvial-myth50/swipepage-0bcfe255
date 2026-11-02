export const AUTHOR_SHARE = 0.75;
export const PLATFORM_SHARE = 0.25;

export function splitRevenue(price: number) {
  const author = Math.round(price * AUTHOR_SHARE * 100) / 100;
  const platform = Math.round((price - author) * 100) / 100;
  return { author, platform };
}

/** Pulls the most "hooky" 100–200 word passage from a manuscript. */
export function extractHook(text: string): string {
  const paras = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!paras.length) return "";
  const score = (p: string) =>
    (p.match(/[!?—"“”]/g)?.length ?? 0) * 3 +
    (p.match(/\b(never|blood|dark|secret|last|dead|love|run|knew|until)\b/gi)?.length ?? 0) * 2 +
    Math.min(p.split(" ").length, 200) / 20;
  let best = 0;
  paras.forEach((p, i) => { if (score(p) > score(paras[best])) best = i; });
  const words: string[] = [];
  for (let i = best; i < paras.length && words.length < 150; i++) words.push(...paras[i].split(" "));
  for (let i = best - 1; i >= 0 && words.length < 100; i--) words.unshift(...paras[i].split(" "));
  return words.slice(0, 200).join(" ");
}
