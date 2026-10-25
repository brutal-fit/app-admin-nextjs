"use client";

import { endCoachingAction } from "@/features/coaching/actions";
import { CloseWithReasonDialog } from "@/features/subscriptions/components/close-with-reason-dialog";

/**
 * Ends the coaching on behalf of BRUTAL through end_coaching with a required reason, then
 * shows what the server queued for refund. Gated by bookings.cancel and shown only while the
 * coaching is requested or active.
 */
export function EndCoachingDialog({ coachingId }: { coachingId: string }) {
  return (
    <CloseWithReasonDialog
      idPrefix="end-coaching"
      triggerLabel="End coaching"
      title="End this coaching"
      description="Every paid month is refunded in full and unpaid months lapse. The programme locks again unless it was free, and the client and the coach are told your reason. This cannot be undone."
      submitLabel="End coaching"
      pendingLabel="Ending..."
      noun="month"
      successToast="Coaching ended."
      onClose={(reason) => endCoachingAction({ id: coachingId, reason })}
    />
  );
}
