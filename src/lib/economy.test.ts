import { describe, it, expect } from "vitest";
import { splitRevenue, extractHook } from "./economy";

describe("economy", () => {
  it("gives authors 75% and platform 25%", () => {
    expect(splitRevenue(12)).toEqual({ author: 9, platform: 3 });
    expect(splitRevenue(19.99)).toEqual({ author: 14.99, platform: 5 });
  });
  it("hook is at most 200 words", () => {
    const text = Array.from({ length: 10 }, () => "word ".repeat(80)).join("\n\n");
    expect(extractHook(text).split(" ").length).toBeLessThanOrEqual(200);
  });
});
