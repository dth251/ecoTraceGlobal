import { useState } from "react";
import { aiApi, type ExtractionResponse, type SuggestionItem, type ClassifyResponse } from "@/api/ai";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useCurrentContext } from "@/hooks/useCurrentContext";

export function AiAssistantPage() {
  const { periodId } = useCurrentContext();

  const [activeTab, setActiveTab] = useState<"extract" | "classify" | "optimize">("extract");

  // Tab Extract
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResponse | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Tab Classify
  const [desc, setDesc] = useState("Dầu DO chạy lò hơi phụ trợ");
  const [unit, setUnit] = useState("lít");
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyResponse | null>(null);

  // Tab Optimize
  const [optimizing, setOptimizing] = useState(false);
  const [optSummary, setOptSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  const handleExtract = async () => {
    if (!selectedFile) return;
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await aiApi.extractInvoice(selectedFile);
      setExtractionResult(res);
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "Lỗi gọi AI trích xuất");
    } finally {
      setExtracting(false);
    }
  };

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

      {activeTab === "extract" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-4 space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Tải lên hóa đơn cần AI phân tích</h2>
            <p className="text-xs text-slate-500">
              Hỗ trợ PDF hóa đơn điện tử, ảnh chụp PNG/JPG. AI sẽ tự nhận dạng ngày, số tiền, loại phát thải và chi tiết dòng hàng.
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="ai-invoice-upload"
              />
              <label htmlFor="ai-invoice-upload" className="cursor-pointer space-y-2 block">
                <div className="text-3xl">📥</div>
                <div className="text-sm font-medium text-slate-700">
                  {selectedFile ? selectedFile.name : "Nhấp để chọn tệp hóa đơn"}
                </div>
                <div className="text-xs text-slate-400">PDF, PNG, JPG tối đa 20MB</div>
              </label>
            </div>

            {extractError && (
              <div className="p-3 bg-danger-light text-danger-dark rounded-md text-xs">{extractError}</div>
            )}

            <Button
              onClick={handleExtract}
              loading={extracting}
              disabled={!selectedFile}
              className="w-full"
            >
              {extracting ? "AI Đang xử lý bóc tách..." : "Bắt đầu bóc tách bằng AI"}
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-base font-semibold text-slate-800">Kết quả bóc tách có cấu trúc</h2>
            {!extractionResult ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm border border-slate-100 rounded-md">
                <span>Chưa có dữ liệu bóc tách</span>
                <span className="text-xs mt-1">Chọn file và bấm &quot;Bắt đầu bóc tách&quot;</span>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-md">
                  <div>
                    <div className="text-xs text-slate-500">Nhà cung cấp</div>
                    <div className="font-semibold text-slate-800">{extractionResult.supplier_name || "N/A"}</div>
                  </div>
                  <Badge variant={extractionResult.overall_confidence > 0.8 ? "success" : "warning"}>
                    Độ tin cậy: {(extractionResult.overall_confidence * 100).toFixed(0)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-slate-500">Số hóa đơn:</span>{" "}
                    <span className="font-mono font-medium">{extractionResult.invoice_no || "N/A"}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-slate-500">Ngày lập:</span>{" "}
                    <span className="font-mono font-medium">{extractionResult.invoice_date || "N/A"}</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-slate-500">Tổng tiền:</span>{" "}
                    <span className="font-semibold text-slate-800">
                      {extractionResult.total_amount?.toLocaleString() || 0} {extractionResult.currency}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-slate-500">Loại chứng từ:</span>{" "}
                    <span className="font-medium text-brand">{extractionResult.doc_type}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-1">Các dòng bóc tách:</div>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 border border-slate-100 rounded p-1.5">
                    {extractionResult.lines?.map((line, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs p-1.5 hover:bg-slate-50 rounded border-b border-slate-50">
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-slate-800">{line.description}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Factor: {line.factor_code}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-700">{line.quantity}</span> {line.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

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
              <Card key={idx} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
                  <Badge variant={item.difficulty === "cao" ? "warning" : "success"}>
                    Độ khó: {item.difficulty}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">{item.description}</p>
                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 font-medium">
                  <span className="text-brand font-semibold">
                    Tiềm năng giảm: -{item.reduction_potential_pct}% CO₂e
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">Mục tiêu: {item.target_factor_code}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AiAssistantPage;
