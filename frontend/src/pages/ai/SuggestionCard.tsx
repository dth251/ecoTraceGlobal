import type { SuggestionItem } from "@/api/ai";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export interface SuggestionCardProps {
  item: SuggestionItem & { steps?: string[]; estimated_reduction_kg?: number };
}

export function SuggestionCard({ item }: SuggestionCardProps) {
  const pct = item.reduction_potential_pct;
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 text-sm">{item.title}</h3>
        <Badge variant={item.difficulty === "cao" ? "warning" : "success"}>Độ khó: {item.difficulty}</Badge>
      </div>
      <p className="text-xs text-slate-600">{item.description}</p>
      {item.steps && item.steps.length > 0 && (
        <ol className="list-decimal pl-4 text-xs text-slate-500 space-y-0.5">
          {item.steps.slice(0, 4).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}
      <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 font-medium">
        <span className="text-brand font-semibold">
          Tiềm năng giảm: -{pct > 0 && pct < 0.1 ? "<0,1" : pct}% CO₂e
          {item.estimated_reduction_kg ? ` (~${Math.round(item.estimated_reduction_kg).toLocaleString("vi-VN")} kg)` : ""}
        </span>
        <span className="font-mono text-slate-400 text-[11px]">Mục tiêu: {item.target_factor_code}</span>
      </div>
    </Card>
  );
}
