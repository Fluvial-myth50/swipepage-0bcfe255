import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary", { variants: { variant: { primary: "bg-primary text-primary-foreground hover:bg-primary/90", default: "bg-primary text-primary-foreground hover:bg-primary/90", destructive: "bg-destructive text-destructive-foreground", outline: "border bg-card hover:bg-muted", secondary: "bg-secondary text-secondary-foreground", ghost: "hover:bg-muted text-muted-foreground", link: "text-primary underline-offset-4 hover:underline" }, size: { default: "px-4 py-2.5", sm: "px-3 py-2", lg: "px-6 py-3", icon: "size-9", "icon-sm": "size-8", "icon-lg": "size-10" } }, defaultVariants: { variant: "primary", size: "default" } });
export type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };
export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component {...props} className={cn(buttonVariants({ variant, size }), className)} />;
}