import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Co2eValue } from "@/components/emissions/Co2eValue";

export interface TraceabilityPopoverProps {
  co2eKg: number | null | undefined;
  formula?: string;
  factorSource?: string;
  children?: ReactNode;
}

/** Bấm hoặc di chuột vào số để xem nguồn gốc công thức và hệ số phát thải */
export function TraceabilityPopover({ co2eKg, formula, factorSource, children }: TraceabilityPopoverProps) {
  const content = (
    <div className="space-y-1">
      {formula && <div className="font-mono text-[11px]">{formula}</div>}
      {factorSource && <div className="text-slate-300">{factorSource}</div>}
    </div>
  );

  return (
    <Tooltip content={formula || factorSource ? content : "Tra cứu nguồn gốc số liệu"}>
      <button type="button" className="underline decoration-dotted underline-offset-2 hover:text-brand">
        {children ?? <Co2eValue kg={co2eKg} />}
      </button>
    </Tooltip>
  );
}
