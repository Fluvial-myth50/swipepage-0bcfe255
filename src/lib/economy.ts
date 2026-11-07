export const AUTHOR_SHARE = 0.75;
export const PLATFORM_SHARE = 0.25;

export function splitRevenue(price: number) {
  const author = Math.round(price * AUTHOR_SHARE * 100) / 100;
  const platform = Math.round((price - author) * 100) / 100;
  return { author, platform };
}

/** Web CPM: £4.50 per 1,000 impressions. */
export const AD_CPM_GBP = 4.5;
/** Earnings = (dwell seconds / 1000) * (£4.50 / 60). */
export function adEarnings(seconds: number) {
  return (seconds / 1000) * (AD_CPM_GBP / 60);
}
/** 75/25 split for ad revenue, unrounded (values are fractions of a penny). */
export function splitAd(gross: number) {
  return { author: gross * AUTHOR_SHARE, platform: gross * PLATFORM_SHARE };
}

