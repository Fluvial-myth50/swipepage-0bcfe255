import { Link } from "@tanstack/react-router";
import { BookOpen, Search, Feather, UserRound, ChartNoAxesCombined, Shield, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
const items = [{ to: "/", label: "Feed", icon: BookOpen }, { to: "/search", label: "Search", icon: Search }, { to: "/author", label: "Author Studio", icon: Feather }, { to: "/profile", label: "Profile", icon: UserRound }] as const;
export function AppNav() {
  const user = useStore((s) => s.user), premium = useStore((s) => s.premium);
  if (!user) return null;
  return <><aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r bg-background p-6 lg:flex">
    <Link to="/" className="mb-12 font-serif text-3xl">Swipe<span className="text-primary">Page.</span></Link>
    <p className="mb-3 text-[10px] uppercase tracking-widest text-muted-foreground">Your bookshelf, reimagined</p>
    <nav className="space-y-2">{items.map((i) => <Link key={i.to} to={i.to} activeOptions={{ exact: true }} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-muted" activeProps={{ className: "bg-primary/10 text-primary" }}><i.icon size={18} />{i.label}</Link>)}
      <Link to="/analytics" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-muted-foreground" activeProps={{ className: "bg-primary/10 text-primary" }}><ChartNoAxesCombined size={18} />Analytics</Link>
      {user.role === "admin" && <Link to="/admin" className="flex items-center gap-3 p-3 text-sm"><Shield size={18} />Admin</Link>}
    </nav>
    <Link to="/profile" className="mt-auto border-t pt-6"><div className="flex items-center gap-2 text-deluxe"><Sparkles size={16} />{premium ? "Premium member" : "Go Premium"}</div><p className="mt-4 truncate text-sm">{user.name}</p><p className="text-xs capitalize text-muted-foreground">{user.role} · demo session</p></Link>
  </aside>
  <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">{items.map((i) => <Link key={i.to} to={i.to} activeOptions={{ exact: true }} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] text-muted-foreground" activeProps={{ className: "text-primary" }}><i.icon size={19} />{i.label}</Link>)}</nav></>;
}
