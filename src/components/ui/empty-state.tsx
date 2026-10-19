import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-strong p-6">
      <p className="text-sm font-semibold text-text">{title}</p>
      {description ? <p className="text-sm text-text-muted">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
