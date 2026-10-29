import { Co2eValue } from "@/components/emissions/Co2eValue";
import { Drawer } from "@/components/ui/Drawer";
import { formatPercent } from "@/lib/format";
import type { ProductFootprint } from "@/types/domain";

export interface FootprintDetailDrawerProps {
  footprint: ProductFootprint | null;
  onClose: () => void;
}

export function FootprintDetailDrawer({ footprint, onClose }: FootprintDetailDrawerProps) {
  return (
    <Drawer
      open={!!footprint}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={footprint?.productName ?? ""}
      description="Chi tiết phát thải nhúng CBAM trên mỗi đơn vị sản phẩm"
    >
      {footprint && (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-600">Trực tiếp (Scope 1)</span>
            <Co2eValue kg={footprint.directPerUnit} />
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-600">Gián tiếp (Điện)</span>
            <Co2eValue kg={footprint.indirectPerUnit} />
          </div>
          <div className="flex justify-between border-b border-slate-100 py-1.5">
            <span className="text-slate-600">Tiền chất (Nguyên liệu)</span>
            <Co2eValue kg={footprint.precursorPerUnit} />
          </div>
          <div className="flex justify-between font-bold">
            <span>Tổng cộng</span>
            <Co2eValue kg={footprint.totalPerUnit} />
          </div>
          <div className="pt-2 text-xs text-slate-500">
            Tỷ lệ dữ liệu thực tế: {formatPercent(footprint.actualDataShare)} · Phân bổ:{" "}
            {footprint.allocationMethod}
          </div>
        </div>
      )}
    </Drawer>
  );
}
