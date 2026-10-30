import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { emissionsApi, type CalculationResult } from "@/api/emissions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrentContext } from "@/hooks/useCurrentContext";
import { usePermission } from "@/hooks/usePermission";
import { useTogglePeriodLock } from "@/queries/usePeriods";

/**
 * Các bước của kỳ sau khi đã xác nhận chứng từ: tính phát thải (backend, hệ số trong database) rồi khóa kỳ.
 * Kỳ phải khóa mới cấp được hộ chiếu xanh; khóa rồi thì không sửa được số liệu.
 */
export function PeriodActions() {
  const queryClient = useQueryClient();
  const { periodId, period, isLocked } = useCurrentContext();
  const { canEdit } = usePermission();
  const toggleLock = useTogglePeriodLock();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!periodId || !canEdit) return null;

  const handleCalculate = async () => {
    setRunning(true);
    setError(null);
    try {
      setResult(await emissionsApi.calculate(periodId));
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không tính được");
    } finally {
      setRunning(false);
    }
  };

  const handleLock = async () => {
    setError(null);
    try {
      await toggleLock.mutateAsync({ id: periodId, lock: !isLocked });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không đổi được trạng thái kỳ");
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Kỳ {period?.name ?? ""}</h2>
            <Badge variant={isLocked ? "warning" : "success"}>{isLocked ? "Đã khóa" : "Đang mở"}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Xác nhận hết chứng từ → tính phát thải → nhập sản lượng ở mục Sản phẩm → khóa kỳ → cấp hộ chiếu xanh.
          </p>
        </div>
        <div className="flex gap-2">
          {!isLocked && (
            <Button size="sm" onClick={handleCalculate} loading={running}>
              Tính phát thải kỳ này
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={handleLock} loading={toggleLock.isPending}>
            {isLocked ? "Mở khóa kỳ" : "Khóa kỳ"}
          </Button>
        </div>
      </div>

      {error && <div className="mt-3 rounded-md bg-danger-light p-2 text-xs text-danger-dark">{error}</div>}
      {result && (
        <div className="mt-3 space-y-1 text-xs">
          <div className={(result.failures ?? []).length ? "text-warning-dark" : "text-success-dark"}>
            Đã tính {result.recordsCalculated}/{result.activities} hoạt động.
            {(result.failures ?? []).length > 0 && " Các hoạt động dưới đây chưa tính được nên kỳ chưa đủ điều kiện cấp hộ chiếu:"}
          </div>
          {(result.failures ?? []).map((f) => (
            <div key={f.activityId} className="rounded bg-warning-light p-1.5 text-warning-dark">
              {f.category}
              {f.subCategory ? ` · ${f.subCategory}` : ""}: {f.message}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
