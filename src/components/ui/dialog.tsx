"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** Modal built on the native dialog element: focus trapping and Escape come for free. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      className="m-auto w-full max-w-lg rounded-lg border border-border bg-surface p-0 text-text backdrop:bg-overlay"
    >
      {open ? (
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="text-sm text-text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md px-2 py-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
            >
              X
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
