import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  return <button {...props} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary", variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary/90" : variant === "outline" ? "border bg-card hover:bg-muted" : "hover:bg-muted text-muted-foreground", className)} />;
}