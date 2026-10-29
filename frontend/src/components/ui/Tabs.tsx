import type { ReactNode } from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import clsx from "clsx";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultValue?: string;
}

export function Tabs({ items, defaultValue }: TabsProps) {
  const first = defaultValue ?? items[0]?.value ?? "";
  return (
    <RadixTabs.Root defaultValue={first}>
      <RadixTabs.List className="mb-4 flex gap-1 border-b border-slate-200">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className={clsx(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-colors",
              "hover:text-slate-900 data-[state=active]:border-brand data-[state=active]:text-brand",
            )}
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className="focus:outline-none">
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
