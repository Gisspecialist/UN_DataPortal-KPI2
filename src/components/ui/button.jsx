import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", size = "md", ...props }) {
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
    ghost: "bg-transparent hover:bg-slate-100 text-slate-900",
  };
  const sizes = {
    sm: "h-9 px-3 text-sm rounded-xl",
    md: "h-10 px-4 py-2 text-sm rounded-xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  );
}
