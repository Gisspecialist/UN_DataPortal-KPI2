import * as React from "react";
import { cn } from "@/lib/utils";

const SelectContext = React.createContext(null);

export function Select({ value, defaultValue, onValueChange, children }) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
  const current = value ?? uncontrolled;

  const set = (v) => {
    if (value == null) setUncontrolled(v);
    onValueChange?.(v);
  };

  return <SelectContext.Provider value={{ value: current, set }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ className, children, ...props }) {
  return (
    <div className={cn("relative w-full", className)} {...props}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder }) {
  const ctx = React.useContext(SelectContext);
  return <span className="text-sm text-slate-900">{ctx?.value ? ctx.value : placeholder}</span>;
}

export function SelectContent({ className, children }) {
  const ctx = React.useContext(SelectContext);
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <select
      className={cn("h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200", className)}
      value={ctx?.value ?? ""}
      onChange={(e) => ctx?.set(e.target.value)}
    >
      {items.map((child, idx) => React.cloneElement(child, { key: child.key ?? idx }))}
    </select>
  );
}

export function SelectItem({ value, children, ...props }) {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  );
}
