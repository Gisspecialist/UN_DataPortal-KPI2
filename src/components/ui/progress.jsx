import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({ value = 0, className }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className="h-full bg-slate-900 transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}
