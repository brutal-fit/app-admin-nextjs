import { FileText } from "@/components/icons";
import { AUDIT_EXPORT_MAX, auditExportFileName, auditExportHref, type AuditFilters } from "@/features/audit/schemas";

/**
 * Downloads the filtered log as CSV through /api/audit/export. Rendered only with
 * audit.export; the route checks the key again and the function checks it a third time.
 * A plain link, so the browser streams the file to disk instead of the page holding it.
 */
export function AuditExportLink({
  filters,
  total,
  today,
}: {
  filters: AuditFilters;
  total: number;
  /** Today in India, "YYYY-MM-DD", for the file name. */
  today: string;
}) {
  const capped = total > AUDIT_EXPORT_MAX;
  return (
    <div className="flex flex-col items-end gap-1">
      <a
        href={auditExportHref(filters)}
        download={auditExportFileName(filters, today)}
        className="focus-ring inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
      >
        <FileText size={16} aria-hidden="true" />
        Export CSV
      </a>
      {capped ? (
        <p className="text-xs text-muted-foreground">
          The file holds the newest {AUDIT_EXPORT_MAX.toLocaleString("en-IN")} of{" "}
          {total.toLocaleString("en-IN")} entries.
        </p>
      ) : null}
    </div>
  );
}
