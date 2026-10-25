"use client";

import { cancelSubscriptionAction } from "@/features/subscriptions/actions";
import { CloseWithReasonDialog } from "@/features/subscriptions/components/close-with-reason-dialog";

/**
 * Cancels the subscription on behalf of BRUTAL through cancel_subscription with a required
 * reason, then shows what the server queued for refund. Gated by bookings.cancel and shown
 * only while the subscription is requested or active.
 */
export function CancelSubscriptionDialog({ subscriptionId }: { subscriptionId: string }) {
  return (
    <CloseWithReasonDialog
      idPrefix="cancel-subscription"
      triggerLabel="Cancel subscription"
      title="Cancel this subscription"
      description="Every upcoming session is cancelled. Periods that have not started are refunded in full and the current one for each session still ahead; unpaid periods lapse. The client, and the trainer once they have seen it, are told your reason. This cannot be undone."
      submitLabel="Cancel subscription"
      pendingLabel="Cancelling..."
      noun="period"
      successToast="Subscription cancelled."
      onClose={(reason) => cancelSubscriptionAction({ id: subscriptionId, reason })}
    />
  );
}
