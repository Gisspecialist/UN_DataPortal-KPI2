import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-900", className)} {...props} />
  );
}
