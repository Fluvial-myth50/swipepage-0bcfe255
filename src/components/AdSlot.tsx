import { useEffect } from "react";
import { actions } from "@/lib/store";

type Props = { size: "rectangle" | "leaderboard"; bookId: string; slot: "feed" | "reader" };

/** Simulated AdSense unit. Logs one impression when it mounts. */
export function AdSlot({ size, bookId, slot }: Props) {
  useEffect(() => { actions.log({ type: "ad", bookId, slot, at: Date.now() }); }, [bookId, slot]);
  const rect = size === "rectangle";
  return (
    <div className="mx-auto w-full" style={{ maxWidth: rect ? 300 : 728 }}>
      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
        <span>Advertisement</span><span className="opacity-60">AdSense · sim</span>
      </div>
      <div
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-dashed border-foreground/15 bg-muted/40 text-muted-foreground"
        style={{ aspectRatio: rect ? "300 / 250" : "728 / 90", minHeight: rect ? undefined : 60 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15l3-6 3 6M8 13h4M15 9v6h1.5a1.5 1.5 0 000-3H15" />
        </svg>
        <span className="font-mono text-[10px]">{rect ? "300 × 250" : "728 × 90"}</span>
      </div>
    </div>
  );
}
