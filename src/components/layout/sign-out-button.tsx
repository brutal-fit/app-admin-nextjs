"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";
import { useSessionStore } from "@/stores/session-store-provider";

export function SignOutButton() {
  const clear = useSessionStore((state) => state.clear);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          clear();
          await signOutAction();
        })
      }
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
