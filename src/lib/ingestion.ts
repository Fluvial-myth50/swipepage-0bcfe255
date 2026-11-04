import type { ImportItem } from "./store";
const passage = "The stranger arrived at the castle as the last light faded over the mountains. Beyond the door, footsteps sounded though nobody had entered. A letter lay upon the table, addressed in a hand that seemed familiar, yet belonged to someone long dead. He opened it slowly. Outside, the wind moved through the trees and carried a warning that he could not understand. The road home had vanished into the darkness. He knew then that his journey had only just begun.";
export function mockImport(query: string): ImportItem {
 const frankenstein = /frankenstein|84/i.test(query);
 return { id: frankenstein ? 84 : 345, title: frankenstein ? "Frankenstein" : "Dracula", author: frankenstein ? "Mary Shelley" : "Bram Stoker", language: "en", url: `https://www.gutenberg.org/ebooks/${frankenstein ? 84 : 345}.txt.utf-8`, body: Array.from({ length: 6 }, () => passage).join("\n\n"), status: "Pending Processing" };
}
export function excerpt(text: string) { return text.trim().split(/\s+/).slice(0, 400).join(" "); }
