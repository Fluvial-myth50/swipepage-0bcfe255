import { Link } from "@tanstack/react-router";

const items = [
  { to: "/", label: "Feed" },
  { to: "/author", label: "Author Studio" },
  { to: "/analytics", label: "Analytics" },
] as const;

export function AppNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 py-4">
      <Link to="/" className="text-lg font-bold tracking-tight">
        Swipe<span className="text-primary">Page</span>
      </Link>
      <nav className="flex gap-1 rounded-full border bg-card/70 p-1 backdrop-blur">
        {items.map((i) => (
          <Link key={i.to} to={i.to} activeOptions={{ exact: true }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "bg-primary text-primary-foreground hover:text-primary-foreground" }}>
            {i.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
