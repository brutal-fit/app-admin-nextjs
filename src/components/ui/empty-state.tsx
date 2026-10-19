import type { ReactNode } from "react";
import { Inbox, type Icon } from "@/components/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** shadcn has no empty state; this one is a dashed card so it reads as a placeholder. */
export function EmptyState({
  title,
  description,
  action,
  icon: IconComponent = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: Icon;
}) {
  return (
    <Card className="gap-4 border-dashed border-input py-5 shadow-none">
      <CardHeader className="px-5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <IconComponent size={16} aria-hidden="true" className="text-muted-foreground" />
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {action ? <CardContent className="px-5">{action}</CardContent> : null}
    </Card>
  );
}
