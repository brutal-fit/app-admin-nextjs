"use client";

import { useTransition } from "react";
import { LogOut } from "@/components/icons";
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
      <LogOut size={16} aria-hidden="true" />
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
