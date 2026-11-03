import { useState } from "react";
import { X, CreditCard, LoaderCircle, ShieldCheck, Crown, CheckCircle2 } from "lucide-react";
import { actions, useStore, type Book } from "@/lib/store";
import { purchasePrice, PREMIUM_GBP } from "@/lib/poc";
import { splitRevenue } from "@/lib/economy";
import { Button } from "./ui/button";
export function CheckoutModal({ book, onClose }: { book?: Book; onClose: () => void }) {
  const premium = useStore((s) => s.premium);
  const [tier, setTier] = useState<"standard" | "deluxe">("standard");
  const [test, setTest] = useState(true);
  const [card, setCard] = useState(""), [expiry, setExpiry] = useState(""), [cvc, setCvc] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [error, setError] = useState("");
  const price = book ? purchasePrice(tier === "deluxe" ? book.deluxePrice : book.price, premium) : PREMIUM_GBP;
  async function pay() {
    const [month, year] = expiry.split("/").map(Number);
    if (!test || card.replace(/\s/g, "") !== "4242424242424242" || !/^\d{2}\/\d{2}$/.test(expiry) || month < 1 || month > 12 || year < new Date().getFullYear() % 100 || !/^\d{3}$/.test(cvc)) { setError("Use test card 4242 4242 4242 4242, a future MM/YY and any three-digit CVC. No real cards."); return; }
    setError(""); setStatus("processing");
    await new Promise((r) => setTimeout(r, 1200));
    if (book) actions.purchase(book, tier); else actions.subscribe();
    setStatus("done");
  }
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/85 p-2 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Stripe sandbox payment">
    <section className="max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-lg border bg-popover p-6">
      <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-muted-foreground"><CreditCard size={16} />Stripe sandbox simulator</span><Button variant="ghost" aria-label="Close payment" disabled={status === "processing"} onClick={onClose}><X size={18} /></Button></div>
      {status === "done" ? <div className="py-10 text-center"><CheckCircle2 className="mx-auto text-primary" size={40} /><h2 className="mt-4 text-2xl">{book ? "Added to your library" : "Welcome to Premium"}</h2><p className="mt-2 text-muted-foreground">{book?.title ?? "Ad-free reading. 15% off every book."}</p><Button className="mt-6" onClick={onClose}>Keep reading</Button></div> : <>
        <h2 className="mt-4 font-serif text-3xl">{book?.title ?? "SwipePage Premium"}</h2>
        {book ? <div className="my-5 grid grid-cols-2 gap-3">{(["standard", "deluxe"] as const).map((t) => <Button variant="outline" key={t} aria-pressed={tier === t} onClick={() => setTier(t)} className={`items-start flex-col text-left ${tier === t ? "border-primary" : ""}`}><span className="flex items-center gap-1">{t === "deluxe" && <Crown size={14} />} {t === "standard" ? "Standard" : "Digital Deluxe"}</span><span className="text-xs font-normal text-muted-foreground">{t === "standard" ? "PDF edition · in-app reading" : book.bonus ? "Bonus chapters included" : "Luxury reading badge"}</span>{t === "deluxe" && book.audiobook && <span className="text-xs">Audio companion available</span>}£{purchasePrice(t === "standard" ? book.price : book.deluxePrice, premium).toFixed(2)}</Button>)}</div> : <p className="my-5 text-muted-foreground">£7.99/month · $9.99/month<br />Ad-free reading and 15% off individual books.</p>}
        {book && premium && <p className="mb-3 text-sm text-primary">Premium discount · 15% applied</p>}
        <label className="flex items-center justify-between border-y py-3 text-sm">Test Card Mode<input type="checkbox" role="switch" checked={test} onChange={(e) => setTest(e.target.checked)} /></label>
        {!test && <p className="mt-2 text-sm text-destructive">Live payments are unavailable in this demo.</p>}
        <label className="mt-4 block text-xs">Card number<input autoComplete="off" inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" className="mt-2 w-full rounded-lg border bg-muted p-3 text-sm" /></label>
        <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs">Expiry<input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YY" maxLength={5} className="mt-2 w-full rounded-lg border bg-muted p-3" /></label><label className="text-xs">CVC<input value={cvc} onChange={(e) => setCvc(e.target.value)} maxLength={3} placeholder="123" className="mt-2 w-full rounded-lg border bg-muted p-3" /></label></div>
        {error && <p role="alert" className="mt-3 text-xs text-destructive">{error}</p>}
        {book && <div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>Author 75% · £{splitRevenue(price).author.toFixed(2)}</span><span>SwipePage 25% · £{splitRevenue(price).platform.toFixed(2)}</span></div>}
        <Button disabled={status === "processing" || !test} onClick={pay} className="mt-5 w-full">{status === "processing" ? <LoaderCircle className="animate-spin" size={18} /> : <ShieldCheck size={18} />}{status === "processing" ? "Processing test payment…" : `Pay £${price.toFixed(2)}${book ? "" : " / month"}`}</Button>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">Simulated transaction · no money charged</p>
      </>}
    </section>
  </div>;
}
