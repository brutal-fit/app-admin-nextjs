"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { grantTrainerAccessAction } from "@/features/users/actions";
import type { UserRole } from "@/types/database";
import { showToast } from "@/stores/toast-store";

/** Gives an admin the trainer platform role so they can also use the app. */
export function GrantTrainerAccess({
  userId,
  platformRole,
}: {
  userId: string;
  platformRole: UserRole | null;
}) {
  const [pending, startTransition] = useTransition();

  if (platformRole !== null) {
    return (
      <p className="text-sm text-muted-foreground">
        This person already has the {platformRole} role in the app. The platform role can only be
        set once, while it is empty.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await grantTrainerAccessAction({ userId });
            if (!result.ok) {
              showToast("error", result.error.message);
              return;
            }
            showToast("success", "Trainer app access granted.");
          })
        }
      >
        {pending ? "Granting..." : "Grant trainer app access"}
      </Button>
      <p className="text-sm text-muted-foreground">
        They will still need to apply and be approved in the app.
      </p>
    </div>
  );
}
