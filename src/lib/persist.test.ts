import { describe, expect, it } from "vitest";
import { compactEvents, deserialize, serialize } from "./persist";
import { CURATED_BOOKS } from "./curated-catalogue";
import { computeReco } from "./reco";
import { getDemoState, type Event, type State } from "./store";

const ticks = (bookId: string, n: number, from: number): Event[] =>
  Array.from({ length: n }, (_, i) => ({ type: "dwell", bookId, seconds: 1, at: from + n - i }));

describe("saved progress", () => {
  it("merges dwell ticks without changing what the model learns", () => {
    const events: Event[] = [{ type: "swipe", bookId: "g345", direction: "next", at: 100 }, ...ticks("g345", 40, 50), { type: "view", bookId: "g345", at: 50 }];
    const compact = compactEvents(events);
    expect(compact).toHaveLength(3);
    expect(computeReco(CURATED_BOOKS, compact).stats["g345"]).toEqual(computeReco(CURATED_BOOKS, events).stats["g345"]);
  });

  it("round-trips a session", () => {
    const state: State = { ...getDemoState(), user: { name: "Rev", role: "reader" }, genres: ["Horror"], selectedBook: "g345", history: ["g84"], events: [{ type: "view", bookId: "g345", at: 1 }], bookmarks: { g345: true } };
    const back = deserialize(serialize(state), CURATED_BOOKS)!;
    expect(back.user?.name).toBe("Rev");
    expect(back.genres).toEqual(["Horror"]);
    expect(back.selectedBook).toBe("g345");
    expect(back.events).toHaveLength(1);
    expect(back.bookmarks).toEqual({ g345: true });
  });

  it("ignores corrupt data and books that no longer exist", () => {
    expect(deserialize("{not json", CURATED_BOOKS)).toBeNull();
    const back = deserialize(JSON.stringify({ selectedBook: "b1", history: ["b1", "g345"], events: [{ type: "view", bookId: "b1", at: 1 }] }), CURATED_BOOKS)!;
    expect(back.selectedBook).toBeNull();
    expect(back.history).toEqual(["g345"]);
    expect(back.events).toEqual([]);
  });
});
