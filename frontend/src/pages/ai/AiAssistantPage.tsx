import { useState } from "react";
import { aiApi, type SuggestionItem, type ClassifyResponse } from "@/api/ai";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { BatchExtractPanel } from "./BatchExtractPanel";
import { SuggestionCard } from "./SuggestionCard";

export function AiAssistantPage() {
  const { periodId } = useCurrentContext();

  const [activeTab, setActiveTab] = useState<"extract" | "classify" | "optimize">("extract");

  // Tab Classify
  const [desc, setDesc] = useState("Dầu DO chạy lò hơi phụ trợ");
  const [unit, setUnit] = useState("lít");
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyResponse | null>(null);

  // Tab Optimize
  const [optimizing, setOptimizing] = useState(false);
  const [optSummary, setOptSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  const handleClassify = async () => {
    if (!desc) return;
    setClassifying(true);
    try {
      const res = await aiApi.classifyActivity({ description: desc, unit });
      setClassifyResult(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setClassifying(false);
    }
  };

  const handleOptimize = async () => {
    if (!periodId) return;
    setOptimizing(true);
    try {
      const res = await aiApi.optimize(periodId);
      setOptSummary(res.summary);
      setSuggestions(res.suggestions);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Trợ lý AI & Tự động hóa (AI Service)</h1>
          <Badge variant="info">FastAPI + Gemini</Badge>
        </div>
        <p className="text-sm text-slate-500">
          Kết nối trực tiếp AI Service bóc tách chứng từ OCR, định danh Scope 1/2/3 và sinh kịch bản tối ưu.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("extract")}
          className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "extract"
              ? "border-brand text-brand font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          📄 AI Bóc tách Hóa đơn (OCR)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("classify")}
          className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "classify"
              ? "border-brand text-brand font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          🏷️ Phân loại Scope & Hệ số
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("optimize")}
          className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "optimize"
              ? "border-brand text-brand font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          💡 AI Agent Tối ưu Phát thải
        </button>
      </div>

      {activeTab === "extract" && <BatchExtractPanel />}

      {activeTab === "classify" && (
        <Card className="p-5 max-w-xl space-y-4">
          <h2 className="text-base font-semibold text-slate-800">Nhận diện Scope & Gán mã Hệ số phát thải</h2>
          <p className="text-xs text-slate-500">
            Mô hình AI sẽ phân tích mô tả hoạt động thực tế để xác định Scope 1, 2 hay 3 và map vào cơ sở dữ liệu hệ số emission_factor.
          </p>

          <div className="space-y-3">
            <Input
              label="Mô tả nguyên vật liệu / hoạt động tiêu thụ"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ví dụ: Tiêu thụ điện lưới trung thế, Thép cuộn cán nóng..."
            />
            <Input
              label="Đơn vị tính"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kWh, lít, tấn, tkm..."
            />
            <Button onClick={handleClassify} loading={classifying} className="w-full">
              Phân loại bằng AI
            </Button>
          </div>

          {classifyResult && (
            <div className="p-4 bg-brand-50 border border-brand-100 rounded-lg space-y-2 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-900 uppercase">Kết quả AI Classify</span>
                <Badge variant="success">Scope {classifyResult.scope}</Badge>
              </div>
              <div className="text-sm">
                <span className="text-slate-600">Mã hệ số (Factor Code):</span>{" "}
                <span className="font-mono font-bold text-slate-900">{classifyResult.factor_code}</span>
              </div>
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-brand-100">
                <span className="font-semibold text-slate-700">Lý giải của AI:</span> {classifyResult.reasoning}
              </div>
              <div className="text-[11px] text-slate-400 text-right">
                Độ tin cậy: {(classifyResult.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === "optimize" && (
        <div className="space-y-4">
          <Card className="p-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Đề xuất lộ trình giảm phát thải (AI Optimizer)</h2>
              <p className="text-xs text-slate-500">
                Agent phân tích toàn bộ dữ liệu phát thải kỳ hiện tại và tính toán các phương án thay thế tối ưu.
              </p>
            </div>
            <Button onClick={handleOptimize} loading={optimizing} disabled={!periodId}>
              {optimizing ? "AI đang tính toán..." : "🚀 Kích hoạt AI Optimizer"}
            </Button>
          </Card>

          {optSummary && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
              <span className="font-bold text-slate-800">Tóm tắt từ Agent:</span> {optSummary}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((item, idx) => (
              <SuggestionCard key={idx} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AiAssistantPage;
