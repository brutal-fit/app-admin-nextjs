import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "@/components/icons";

/**
 * The top of every admin page: optional back link and eyebrow, the title (the page's only
 * h1) with an optional status beside it, a description, and actions on the right. The
 * backdrop's accent glow sits behind this block.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  back,
  status,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  back?: { href: string; label: string };
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {back ? (
        <Link
          href={back.href}
          className="focus-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">{eyebrow}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {status}
          </div>
          {description ? (
            <div className="max-w-3xl text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
