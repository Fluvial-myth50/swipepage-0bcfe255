import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Crown, Check, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { meta } from "@/lib/poc";
import { Button } from "@/components/ui/button";
import { CheckoutModal } from "@/components/CheckoutModal";
import { DemoBadge } from "@/components/BookCover";
export const Route = createFileRoute("/premium")({ head: () => meta("SwipePage Premium", "Ad-free book discovery and 15% off individual books for £7.99 per month."), component: Premium });
function Premium() {
 const premium = useStore((s) => s.premium), [pay, setPay] = useState(false);
 return <main className="mx-auto max-w-4xl px-6 py-14 pb-24"><p className="flex items-center gap-2 text-deluxe"><Crown size={20} />SwipePage Premium<DemoBadge /></p><h1 className="mt-6 font-serif text-5xl">More stories.<br />No interruptions.</h1><div className="mt-10 grid gap-8 sm:grid-cols-2"><section className="border-y py-6"><h2 className="text-xl">Free</h2><p className="mt-4 font-serif text-4xl">£0</p><p className="mt-3 text-muted-foreground">Discover independent and classic literature.</p><ul className="mt-6 space-y-3 text-sm"><li>Personalised feed</li><li>Book previews and purchases</li><li>Advertisements every 20 cards</li></ul></section><section className="border-y border-deluxe py-6"><h2 className="flex items-center gap-2 text-xl text-deluxe"><Sparkles size={18} />Premium</h2><p className="mt-4 font-serif text-4xl">£7.99<span className="ml-2 font-sans text-sm text-muted-foreground">/ month</span></p><p className="mt-3 text-muted-foreground">$9.99/month alternative pricing</p><ul className="mt-6 space-y-3 text-sm">{["No feed or reader advertisements", "15% discount on individual books", "Your personalised reading library"].map((t) => <li key={t} className="flex gap-2"><Check size={17} className="text-primary" />{t}</li>)}</ul><Button className="mt-8 w-full" disabled={premium} onClick={() => setPay(true)}>{premium ? "Premium active" : "Go Premium"}</Button></section></div><p className="mt-7 text-xs text-muted-foreground">Test checkout only: no real payment is taken. Membership is saved in this browser.</p>{pay && <CheckoutModal onClose={() => setPay(false)} />}</main>;
}
