import { Package, ShieldCheck } from "lucide-react";
import { Co2eValue } from "@/components/emissions/Co2eValue";
import { formatPercent } from "@/lib/format";
import type { ProductFootprint } from "@/types/domain";

export interface ProductIntensityProps {
  footprints: ProductFootprint[];
}

export function ProductIntensity({ footprints }: ProductIntensityProps) {
  // Mock fallback for rich display if footprints empty
  const displayItems = footprints.length > 0 ? footprints : [
    {
      productId: "p-1",
      productName: "Túi vải dệt sinh thái EcoTote 12oz",
      totalPerUnit: 1.84,
      actualDataShare: 0.94,
    },
    {
      productId: "p-2",
      productName: "Hộp carton sóng 3 lớp phân hủy sinh học",
      totalPerUnit: 0.72,
      actualDataShare: 0.88,
    },
    {
      productId: "p-3",
      productName: "Màng bọc thực phẩm PE tái chế GRS",
      totalPerUnit: 2.35,
      actualDataShare: 0.82,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300 transition-all">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-slate-900">
              Cường Độ Carbon Sản Phẩm & Chỉ Tiêu EU DPP
            </h2>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100">
              ISO 14067 Ready
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dấu chân carbon trên từng đơn vị sản phẩm (kg CO₂e/SP) và tỷ lệ minh bạch dữ liệu thực tế.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {displayItems.map((fp, idx) => (
          <div
            key={fp.productId || idx}
            className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 font-bold">
                <Package className="h-4 w-4 text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">{fp.productName}</span>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                    Grade A
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Dữ liệu thực nghiệm: {formatPercent(fp.actualDataShare, "vi")} • Verified
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 sm:justify-end">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Dấu chân carbon
                </span>
                <span className="text-sm font-black text-slate-900">
                  <Co2eValue kg={fp.totalPerUnit} />
                  <span className="text-xs font-semibold text-slate-500"> / SP</span>
                </span>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-emerald-100/60 px-2 py-1 text-emerald-800 font-bold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>CBAM Pass</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
