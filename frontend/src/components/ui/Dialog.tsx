import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-5 shadow-float focus:outline-none">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <RadixDialog.Title className="text-base font-semibold text-slate-900">
                {title}
              </RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1 text-xs text-slate-500">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Close"
              className="rounded-xl px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-surface hover:text-ink"
            >
              Đóng
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
