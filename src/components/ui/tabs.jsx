import * as React from "react";
import { cn } from "@/lib/utils";

const TabsContext = React.createContext(null);

export function Tabs({ defaultValue, value: controlled, onValueChange, className, ...props }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = controlled ?? uncontrolled;

  const setValue = (v) => {
    if (controlled == null) setUncontrolled(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn("w-full", className)} {...props} />
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }) {
  return <div className={cn("inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 p-1", className)} {...props} />;
}

export function TabsTrigger({ value, className, children, ...props }) {
  const ctx = React.useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx?.setValue(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, ...props }) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.value !== value) return null;
  return <div className={cn("mt-4", className)} {...props} />;
}
