import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOPICS, stripGutenberg, type CataloguePage } from "./gutenberg";
const input = z.object({ topic: z.enum(TOPICS).optional(), page: z.number().int().min(1).max(4).default(1), search: z.string().max(100).optional(), id: z.number().int().positive().optional() });
export const getCatalogue = createServerFn({ method: "GET" }).inputValidator((data: unknown) => input.parse(data)).handler(async ({ data }): Promise<CataloguePage> => {
 const url = new URL("https://gutendex.com/books/");
 url.searchParams.set("languages", "en"); url.searchParams.set("mime_type", "text/plain");
 if (data.topic) url.searchParams.set("topic", data.topic);
 if (data.search) url.searchParams.set("search", data.search);
 if (data.id) url.searchParams.set("ids", String(data.id));
 url.searchParams.set("page", String(data.page));
 const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
 if (!response.ok) throw new Error("The public book catalogue is temporarily unavailable. Please retry.");
 return await response.json() as CataloguePage;
});
export const getBookText = createServerFn({ method: "GET" }).inputValidator((data: unknown) => z.object({ id: z.number().int().min(1).max(100000) }).parse(data)).handler(async ({ data }) => {
 // Caller supplies only a numeric Gutenberg ID: never proxy arbitrary URLs.
 const response = await fetch(`https://www.gutenberg.org/cache/epub/${data.id}/pg${data.id}.txt`, { signal: AbortSignal.timeout(25000), redirect: "error" });
 if (!response.ok || !response.headers.get("content-type")?.includes("text/plain")) throw new Error("This book’s text is unavailable. Please choose another title or retry.");
 const reader = response.body?.getReader(); if (!reader) throw new Error("The book text was empty.");
 const chunks: Uint8Array[] = []; let total = 0; const limit = 4 * 1024 * 1024;
 try { while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > limit) throw new Error("This edition exceeds the reading size limit."); chunks.push(value); } } finally { await reader.cancel(); }
 const buffer = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
 return { body: stripGutenberg(new TextDecoder().decode(buffer)) };
});
