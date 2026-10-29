import type { ValidationIssue } from "@/types/domain";

export interface ValidationMessagesProps {
  issues: ValidationIssue[];
}

export function ValidationMessages({ issues }: ValidationMessagesProps) {
  if (issues.length === 0) return null;

  return (
    <ul role="alert" className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
      {issues.map((issue, idx) => (
        <li
          key={`${issue.field}-${idx}`}
          className={issue.severity === "ERROR" ? "text-danger-dark" : "text-warning-dark"}
        >
          {issue.severity === "ERROR" ? "⛔ " : "⚠ "}
          <span className="font-medium">{issue.field}:</span> {issue.message}
        </li>
      ))}
    </ul>
  );
}
