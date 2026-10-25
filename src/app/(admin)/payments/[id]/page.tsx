import { PageHeader } from "@/components/layout/page-header";
import { StatusPulse } from "@/components/motion/status-pulse";
import { PaymentDetail } from "@/features/payments/components/payment-detail";
import { PaymentStateBadge } from "@/features/payments/components/payment-state-badge";
import { RefundPaymentDialog } from "@/features/payments/components/refund-payment-dialog";
import { loadPaymentDetail } from "@/features/payments/api";
import { formatInr } from "@/features/applications/format";
import { paymentStateTone } from "@/features/payments/format";
import { missingPermissionMessage } from "@/features/users/format";
import { can } from "@/lib/rbac/can";
import { requireRoutePermission } from "@/lib/rbac/require-permission";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BACK = { href: "/payments", label: "Back to payments" };

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await requireRoutePermission("/payments/[id]");
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const result = await loadPaymentDetail(supabase, access, id);

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <PageHeader title="Payment" back={BACK} />
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      </div>
    );
  }

  const { payment } = result;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Payment"
        title={formatInr(payment.amount_inr)}
        back={BACK}
        status={
          // Pulses once when a refund comes back from the server with a new state.
          <StatusPulse value={payment.state} className={paymentStateTone(payment.state)}>
            <PaymentStateBadge state={payment.state} />
          </StatusPulse>
        }
        description={<p className="font-mono text-sm">{payment.order_id}</p>}
      />

      <PaymentDetail
        payment={payment}
        purpose={result.purpose}
        booking={result.booking}
        bookingState={result.bookingState}
        permissions={access.permissions}
      />

      <section aria-labelledby="payment-actions" className="flex flex-col gap-3">
        <h2 id="payment-actions" className="text-lg font-semibold">
          Actions
        </h2>
        {can(access.permissions, "payments.manage") ? (
          <RefundPaymentDialog paymentId={payment.id} state={payment.state} amountInr={payment.amount_inr} />
        ) : (
          <p className="text-sm text-muted-foreground">
            {missingPermissionMessage("payments.manage", "Refunding a payment")}
          </p>
        )}
      </section>
    </div>
  );
}
