import { useState } from "react";
import { actions, type Book } from "@/lib/store";
import { splitRevenue } from "@/lib/economy";

export function CheckoutModal({ book, onClose }: { book: Book; onClose: () => void }) {
  const [tier, setTier] = useState<"standard" | "deluxe">("deluxe");
  const [done, setDone] = useState(false);
  const price = tier === "deluxe" ? book.deluxePrice : book.price;
  const split = splitRevenue(price);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-card-in w-full max-w-lg rounded-t-3xl border bg-popover p-6 sm:rounded-3xl">
        {done ? (
          <div className="py-10 text-center">
            <div className="text-5xl">✦</div>
            <h3 className="mt-4 text-2xl font-bold">It's yours.</h3>
            <p className="mt-2 text-sm text-muted-foreground">{book.title} — {tier === "deluxe" ? "Digital Deluxe" : "Standard"} Edition added to your library.</p>
            <button onClick={onClose} className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Keep reading</button>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Choose your edition</p>
            <h3 className="mt-1 text-2xl font-bold">{book.title}</h3>
            <div className="mt-5 grid gap-3">
              {(["standard", "deluxe"] as const).map((t) => {
                const active = tier === t;
                const deluxe = t === "deluxe";
                return (
                  <button key={t} onClick={() => setTier(t)}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${active ? (deluxe ? "border-deluxe shadow-deluxe" : "border-primary shadow-glow") : "opacity-70 hover:opacity-100"}`}>
                    {deluxe && <div className="absolute inset-0 bg-gradient-deluxe opacity-10" />}
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className={`text-sm font-bold ${deluxe ? "text-deluxe" : ""}`}>{deluxe ? "Digital Deluxe Edition" : "Standard Edition"}</div>
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <li>• Permanent digital ownership</li>
                          {deluxe && <><li>• 3 bonus chapters</li><li>• Custom aesthetic reading backgrounds</li><li>• Author commentary layer</li></>}
                        </ul>
                      </div>
                      <div className="text-xl font-bold">${(deluxe ? book.deluxePrice : book.price).toFixed(2)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-5 rounded-2xl bg-muted p-4 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">{book.author} receives (75%)</span><span className="font-semibold text-primary">${split.author.toFixed(2)}</span></div>
              <div className="mt-1 flex justify-between"><span className="text-muted-foreground">Platform fee (25%)</span><span>${split.platform.toFixed(2)}</span></div>
            </div>
            <button onClick={() => { actions.purchase(book, tier); setDone(true); }}
              className={`mt-5 w-full rounded-full py-3.5 text-sm font-bold transition-transform active:scale-95 ${tier === "deluxe" ? "bg-gradient-deluxe text-deluxe-foreground" : "bg-primary text-primary-foreground"}`}>
              Buy for ${price.toFixed(2)}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
