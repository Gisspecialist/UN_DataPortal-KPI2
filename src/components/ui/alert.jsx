import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }) {
  return (
    <div
      role="alert"
      className={cn("relative w-full rounded-2xl border border-slate-200 bg-white p-4 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7", className)}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }) {
  return <div className={cn("text-sm text-slate-600", className)} {...props} />;
}
