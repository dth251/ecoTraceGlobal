import { Badge } from "@/components/ui/Badge";
import { BatchExtractPanel } from "./BatchExtractPanel";

/** Cửa vào của AI: chỉ nhận chứng từ và xử lý. Kết quả hiển thị ở các mục Chứng từ, Tổng quan, Báo cáo, Tối ưu. */
export function AiAssistantPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Trợ lý AI · Tải chứng từ</h1>
          <Badge variant="info">FastAPI + Gemini</Badge>
        </div>
        <p className="text-sm text-slate-500">
          Tải chứng từ lên một lần, AI tự đọc và phân loại Scope, rồi đưa kết quả vào các mục tương ứng.
        </p>
      </div>

      <BatchExtractPanel />
    </div>
  );
}

export default AiAssistantPage;
