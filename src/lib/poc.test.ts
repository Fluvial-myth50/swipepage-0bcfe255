import { describe, expect, it } from "vitest";
import { AD_INTERVAL, PREMIUM_GBP, PREMIUM_USD, canPublish, countdownSeconds, purchasePrice, shouldShowAd } from "./poc";
describe("PoC rules", () => {
 it("Premium is £7.99 / $9.99 monthly", () => { expect(PREMIUM_GBP).toBe(7.99); expect(PREMIUM_USD).toBe(9.99); });
 it("Premium reduces individual book prices by 15%", () => { expect(purchasePrice(10, true)).toBe(8.5); expect(purchasePrice(10, false)).toBe(10); });
 it("ads trigger exactly every twenty transitions", () => { expect(AD_INTERVAL).toBe(20); expect(shouldShowAd(19, false)).toBe(false); expect(shouldShowAd(20, false)).toBe(true); expect(shouldShowAd(21, false)).toBe(false); expect(shouldShowAd(40, false)).toBe(true); });
 it("Premium bypasses ad counter", () => { expect(shouldShowAd(20, true)).toBe(false); });
 it("random countdown is between five and ten seconds", () => { expect(countdownSeconds(0)).toBe(5); expect(countdownSeconds(0.99)).toBe(10); });
 it("copyright certification is required to publish", () => { expect(canPublish("Book", "Writer", "word ".repeat(100), false)).toBe(false); expect(canPublish("Book", "Writer", "word ".repeat(100), true)).toBe(true); });
});
