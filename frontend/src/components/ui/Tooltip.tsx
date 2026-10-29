import type { ReactNode } from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={200}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            sideOffset={6}
            className="z-50 max-w-xs rounded bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-md"
          >
            {content}
            <RadixTooltip.Arrow className="fill-slate-900" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
