"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondToRescheduleAction } from "@/features/my-gym/actions";
import { showToast } from "@/stores/toast-store";

/**
 * Accept moves the session to the time the client asked for; Keep original leaves it where it
 * was. Both go through respond_to_reschedule, which admits only a manager of this gym and
 * tells the client and the allotted trainer; nothing changes here until the server answers.
 * Gated by gym.self and the gym's manager row.
 */
export function RescheduleAnswer({ bookingId, askedTime }: { bookingId: string; askedTime: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function answer(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToRescheduleAction({ bookingId, accept });
      if (!result.ok) {
        setError(result.error.message);
        showToast("error", result.error.message);
        return;
      }
      showToast("success", accept ? `Moved to ${askedTime}.` : "Kept the original time.");
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => answer(true)} disabled={pending}>
          {pending ? "Saving..." : "Accept new time"}
        </Button>
        <Button variant="outline" onClick={() => answer(false)} disabled={pending}>
          Keep original
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
