"use client";

import { useState, useTransition } from "react";
import { Send } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { submitGymAction } from "@/features/my-gym/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Sends a draft gym to BRUTAL for review through gym_submit_for_review. The server checks the
 * map pin, an offered service and opening hours, and says which is missing. Gated by gym.self
 * and the gym's manager row.
 */
export function SubmitGymButton({ gymId }: { gymId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitGymAction({ gymId });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", "Sent to BRUTAL for review.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button onClick={submit} disabled={pending}>
          <Send size={16} aria-hidden="true" />
          {pending ? "Sending..." : "Send for review"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
