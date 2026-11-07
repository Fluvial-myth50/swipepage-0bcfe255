import { describe, expect, it } from "vitest";
import { bestPassage, cleanText, quotesBalanced, PASSAGE_WORDS } from "./excerpt";
import catalogue from "./gutenberg-catalogue.json";

// Plain, low-drama prose used to pad the fake book.
const filler = (n: number, tag: string) => Array.from({ length: n }, (_, i) =>
  `The ${tag} morning ${i} was ordinary in every respect and the household went about its usual business with the customary amount of care. ` +
  `Breakfast was taken at the usual hour, the letters were read in the usual order, and the conversation concerned the weather and the price of corn.`,
).join("\n\n");

const GRIPPING = `“Do not open that door,” she whispered. Her hand was cold and trembling on my arm.\n\n` +
  `“Why not?” I asked. Somewhere behind it, in the dark, something was breathing.\n\n` +
  `She did not answer. A sudden scream tore through the silent house, and the candle went out. ` +
  `I felt for the latch. “Who is there?” I cried. Nothing. Then footsteps, slow and heavy, and a voice that I knew—a voice I had buried a year ago. ` +
  `My heart stopped. The door began to open by itself, and a pale hand reached out of the shadow towards us. We ran.`;

const SPOILER = `“You!” he screamed. “It was you who killed him, you who poisoned the wine, you who murdered my brother!” ` +
  `Blood ran down the blade. The secret was out at last, and in the terrible silence the murderer laughed. ` +
  `“Yes,” he whispered. “I killed him. And now I shall kill you.” He fired. The shot rang out in the dark. ` +
  `She screamed and fell. Death had come to the castle, and nobody would ever escape it now. The end was near. ` +
  `“Run!” cried the dying man. “Run, before he finds you too!” They fled into the storm.`;

function fakeBook() {
  return [
    "The Project Gutenberg eBook of A Test Story", "*** START OF THE PROJECT GUTENBERG EBOOK A TEST STORY ***",
    "A TEST STORY", "BY A. WRITER", "CONTENTS", "CHAPTER I. THE HOUSE", "CHAPTER II. THE DOOR", "CHAPTER III. THE END",
    "PREFACE",
    // Dramatic front matter that must be ignored.
    `“Murder!” I cried, in this preface. Blood, terror and a sudden scream in the dark. “Who is there?” she whispered. ${"Death and secrets and ghosts. ".repeat(12)}`,
    "CHAPTER I.", filler(40, "first"), GRIPPING, filler(40, "second"),
    "CHAPTER II.", filler(300, "middle"),
    "CHAPTER III.", SPOILER, filler(20, "last"),
    "*** END OF THE PROJECT GUTENBERG EBOOK A TEST STORY ***", "License text that is not part of the book.",
  ].join("\n\n");
}

describe("best passage extractor", () => {
  it("finds the gripping scene in chapter one", () => {
    const p = bestPassage(fakeBook())!;
    expect(p.text).toContain("Do not open that door");
    expect(p.isOpening).toBe(false);
  });

  it("never picks from front matter (contents, preface)", () => {
    const p = bestPassage(fakeBook())!;
    expect(p.text).not.toContain("preface");
    expect(p.text).not.toContain("CHAPTER");
  });

  it("only searches the first tenth, so it can't spoil the ending", () => {
    const p = bestPassage(fakeBook())!;
    expect(p.text).not.toContain("killed him");
    expect(p.position).toBeLessThan(0.1);
    // With the whole book allowed, the climax would win: the 10% rule is what stops it.
    expect(bestPassage(fakeBook(), { windowShare: 1 })!.text).toContain("killed him");
  });

  it("returns at most 150 words, starting and ending on full sentences", () => {
    const p = bestPassage(fakeBook())!;
    expect(p.words).toBeLessThanOrEqual(PASSAGE_WORDS);
    expect(p.words).toBeGreaterThanOrEqual(110);
    expect(p.text).toMatch(/^["“A-Z]/);
    expect(p.text).toMatch(/[.!?][”"]?$/);
  });

  it("explains what makes the passage strong", () => {
    const p = bestPassage(fakeBook())!;
    expect(p.reasons).toContain("builds tension");
    expect(p.score).toBeGreaterThan(0.5);
  });

  it("strips Gutenberg boilerplate, nested illustration markers and hard line wraps", () => {
    const paras = cleanText("junk\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\nOne line\nwrapped here.\n\n[Illustration: “A picture” [_Copyright 1894_]]\n\nNext _italic_ word.\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nlicence");
    expect(paras).toEqual(["One line wrapped here.", "Next italic word."]);
  });

  it("refuses passages that start or end mid-quote", () => {
    expect(quotesBalanced("“Hello,” she said.")).toBe(true);
    expect(quotesBalanced("mate?” My father told him no.")).toBe(false);
    expect(quotesBalanced("“Well, then,” said he, “this is")).toBe(false);
  });

  it("produces a clean passage for every book on the shelf", () => {
    for (const book of catalogue) {
      const p = bestPassage(book.hook)!;
      expect(p, book.title).not.toBeNull();
      expect(p.words, book.title).toBeLessThanOrEqual(PASSAGE_WORDS);
      expect(p.words, book.title).toBeGreaterThanOrEqual(100);
      expect(p.text, book.title).toMatch(/[.!?…][”"’)]*$/);
      expect(quotesBalanced(p.text), book.title).toBe(true);
    }
  });
});

import { pageOf } from "@/components/Unscrambler";
describe("opening the reader at the passage", () => {
  it("finds the page even when the book text has hard line breaks and italics", () => {
    const pages = ["Page one text. ".repeat(20), "Some words before. “Do not\nopen that _door_,” she whispered. Her hand was cold.", "Page three."];
    expect(pageOf(pages, "“Do not open that door,” she whispered. Her hand was cold.")).toBe(1);
    expect(pageOf(pages, undefined)).toBe(0);
    expect(pageOf(pages, "Words that are nowhere in this book at all")).toBe(0);
  });
});
