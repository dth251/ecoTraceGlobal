import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  Download,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface IntelligenceHeaderProps {
  onTimeframeChange?: (timeframe: string) => void;
}

export function IntelligenceHeader({ onTimeframeChange }: IntelligenceHeaderProps) {
  const [selectedTime, setSelectedTime] = useState("Q3 2026");
  const [searchPrompt, setSearchPrompt] = useState("");

  const timeframes = ["7D", "30D", "Q3 2026", "YTD 2026", "Net-Zero 2030"];

  const handleSelect = (tf: string) => {
    setSelectedTime(tf);
    onTimeframeChange?.(tf);
  };

  return (
    <div className="space-y-3.5">
      {/* Top row: Platform status and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Carbon Intelligence Hub
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Sync Active
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Giám sát phát thải thời gian thực, phân tích cường độ sản phẩm và dự báo lộ trình khử carbon.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Link to="/ai-assistant">
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-sm rounded-xl"
            >
              <Bot className="h-4 w-4 text-emerald-400" />
              <span>Ask AI Copilot</span>
            </Button>
          </Link>
          <Link to="/documents">
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-700 text-white font-semibold flex items-center gap-1.5 shadow-sm rounded-xl"
            >
              <Plus className="h-4 w-4" />
              <span>Tải chứng từ</span>
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl flex items-center gap-1.5 text-xs font-semibold"
            onClick={() => alert("Xuất báo cáo phát thải Q3 2026 (CSV/PDF) thành công.")}
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </Button>
        </div>
      </div>

      {/* Control bar: AI Prompt Input & Time Filter Pills */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-sm">
        {/* Natural Language Prompt Search */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <input
            type="text"
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)}
            placeholder="Hỏi AI (ví dụ: 'Cách giảm 20% Scope 2', 'Kiểm tra tỷ lệ CBAM')..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-14 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand transition-all"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              ⌘K
            </span>
          </div>
        </div>

        {/* Timeframe selector pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {timeframes.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => handleSelect(tf)}
              className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                selectedTime === tf
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
