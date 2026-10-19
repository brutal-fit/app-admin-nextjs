"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteCatalogueItemAction, setCatalogueItemActiveAction } from "@/features/catalogue/actions";
import { CATALOGUE_KIND_LABELS } from "@/features/catalogue/schemas";
import { showToast } from "@/stores/toast-store";
import type { CatalogueItemRow } from "@/types/database";

/**
 * Deletes an item through admin_delete_catalogue_item. The server refuses while a profile,
 * application or preference still uses it (BRVAL, shown as the server words it); the dialog
 * then offers to deactivate the item instead. Gated by catalogue.manage.
 */
export function DeleteCatalogueItemDialog({ item }: { item: CatalogueItemRow }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inUse, setInUse] = useState(false);
  const [pending, startTransition] = useTransition();
  const singular = CATALOGUE_KIND_LABELS[item.kind].singular;

  function remove() {
    startTransition(async () => {
      const result = await deleteCatalogueItemAction({ id: item.id });
      if (!result.ok) {
        setError(result.error.message);
        setInUse(result.error.code === "BRVAL");
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `Deleted ${item.label}.`);
      setOpen(false);
    });
  }

  function deactivate() {
    startTransition(async () => {
      const result = await setCatalogueItemActiveAction({ id: item.id, active: false });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", `Deactivated ${item.label}.`);
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) {
          setError(null);
          setInUse(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Delete ${item.label}`}>
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {item.label}?</DialogTitle>
          <DialogDescription>
            The {singular} leaves the catalogue for good. The server refuses while anything still
            uses it; deactivating keeps it for those records and stops the app offering it.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          {inUse && item.active ? (
            <Button type="button" variant="outline" onClick={deactivate} disabled={pending}>
              {pending ? "Saving..." : "Deactivate instead"}
            </Button>
          ) : null}
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            {pending ? "Deleting..." : `Delete ${singular}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
