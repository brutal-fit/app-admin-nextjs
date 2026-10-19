import { Lock, MapPin } from "@/components/icons";
import type { BookingAddressState } from "@/features/bookings/api";
import type { SessionMode } from "@/types/database";

/**
 * The session address. Rendered with its text only for a session holding bookings.address
 * (the loader does not even fetch it otherwise, and RLS would refuse); without the key the
 * card names the permission and says only whether an address is on record. Never logged.
 */
export function BookingAddressCard({
  address,
  mode,
  hasAddress,
}: {
  address: BookingAddressState;
  mode: SessionMode;
  /** From admin_list_bookings; null when that lookup missed. */
  hasAddress: boolean | null;
}) {
  return (
    <section
      aria-labelledby="booking-address"
      className="flex flex-col gap-2 rounded-xl border bg-card p-5 shadow-tile"
    >
      <h2 id="booking-address" className="flex items-center gap-2 text-base font-semibold">
        <MapPin size={16} aria-hidden="true" />
        Session address
      </h2>
      {address.kind === "ok" ? (
        <p className="text-sm whitespace-pre-line">{address.text}</p>
      ) : address.kind === "none" ? (
        <p className="text-sm text-muted-foreground">
          {mode === "online" ? "Online session: there is no address." : "No address is on record."}
        </p>
      ) : address.kind === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          {address.message}
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          <span>
            {address.reason}
            {hasAddress === null ? "" : hasAddress ? " An address is on record." : " No address is on record."}
          </span>
        </p>
      )}
    </section>
  );
}
