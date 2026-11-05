import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCatalogue } from "@/lib/gutenberg.functions";
import { TOPICS, toBook } from "@/lib/gutenberg";
import { actions, getDemoState } from "@/lib/store";
export function CatalogueLoader() {
 const fetchPage = useServerFn(getCatalogue);
 const fetchRef = useRef(fetchPage);
 fetchRef.current = fetchPage;
 useEffect(() => {
  if (getDemoState().catalogueStatus !== "idle") return;
  actions.catalogueStatus("loading", "");
  let active = true;
  async function load() {
   let failures = 0;
   // Four independent topics, four pages each, up to 512 catalogue entries before deduplication.
   await Promise.all(TOPICS.map(async (topic) => {
    for (let page = 1; page <= 4 && active; page++) {
     try { const result = await fetchRef.current({ data: { topic, page } }); if (!active) return;
      actions.addBooks(result.results.map((b) => toBook(b, topic)).filter((b) => b !== null));
      if (!result.next) break;
     } catch { failures++; break; }
    }
   }));
   if (active) actions.catalogueStatus(failures ? "partial" : "ready", failures ? "Some catalogue pages could not load. Retry to complete the shelf." : "");
  }
  void load();
  return () => { active = false; if (getDemoState().catalogueStatus === "loading") actions.catalogueStatus("idle", ""); };
 }, []);
 return null;
}
