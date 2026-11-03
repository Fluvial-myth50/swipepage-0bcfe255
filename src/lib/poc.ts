export const PREMIUM_GBP = 7.99;
export const PREMIUM_USD = 9.99;
export const AD_INTERVAL = 20;
export function purchasePrice(price: number, premium: boolean) { return Math.round(price * (premium ? 0.85 : 1) * 100) / 100; }
export function shouldShowAd(transitions: number, premium: boolean) { return !premium && transitions > 0 && transitions % AD_INTERVAL === 0; }
export function countdownSeconds(random = Math.random()) { return 5 + Math.min(5, Math.max(0, Math.floor(random * 6))); }
export function canPublish(title: string, author: string, text: string, certified: boolean) { return !!title.trim() && !!author.trim() && text.trim().split(/\s+/).length >= 100 && certified; }
export function genrePoints(seconds: number) { return seconds > 5 ? Math.floor(seconds - 5) + 1 : 0; }
export function meta(title: string, description: string) {
  return { meta: [{ title: `${title} — SwipePage` }, { name: "description", content: description }, { property: "og:title", content: `${title} — SwipePage` }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] };
}