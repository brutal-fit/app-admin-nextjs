/*
 * HAND-WRITTEN placeholder types for the RBAC schema (backend task 05, approved 2026-10-19)
 * plus the existing tables this panel reads (trainer applications, documents, availability,
 * trainer profiles, services, bookings, booking locations, support cases, catalogue, platform
 * settings, announcements) and the admin functions up to 20261019000700. Replace this whole
 * file with
 * the generated version once the migration is applied:
 *
 *   npx supabase gen types typescript --project-id apmoxeqbqgjmrrojwgjw --schema public > src/types/database.ts
 *
 * Only tables and functions the admin panel uses are listed.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "client" | "trainer";
export type AccountStatus = "active" | "suspended";
export type SessionMode = "home" | "online";
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "needs_information"
  | "approved"
  | "rejected"
  | "suspended";
export type DocumentKind = "government_id" | "certificate" | "other";
export type DocumentStatus = "uploaded" | "accepted" | "rejected";
export type ExperienceBand = "just_starting" | "1_3" | "3_5" | "5_10" | "10_plus";
export type SupportCaseStatus =
  | "open"
  | "triaged"
  | "waiting_for_user"
  | "investigating"
  | "resolved"
  | "closed"
  | "escalated";
export type ReportCategory = "person" | "booking" | "message" | "review" | "safety" | "other";
export type PrivacyRequestKind = "data_export" | "account_deletion";
/** What admin_process_privacy_request accepts (20261019000400). */
export type PrivacyOutcome = "completed" | "rejected";
/** support_cases.priority (20261019000400); safety-category cases get "safety" on insert. */
export type SupportPriority = "normal" | "high" | "safety";
export type BookingStatus =
  | "requested"
  | "pending_confirmation"
  | "confirmed"
  | "reschedule_requested"
  | "cancelled"
  | "completed"
  | "no_show"
  | "disputed";

export type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  /** Holding a role with this flag admits the user to the admin panel. */
  is_admin: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
};

export type PermissionRow = {
  key: string;
  group_key: string;
  name: string;
  description: string;
  sort_order: number;
};

export type RolePermissionRow = {
  role_id: string;
  permission_key: string;
};

export type UserRoleRow = {
  user_id: string;
  role_id: string;
  granted_by: string | null;
  granted_at: string;
};

export type AdminUserRow = {
  id: string;
  full_name: string;
  email: string | null;
  platform_role: UserRole | null;
  account_status: AccountStatus;
  roles: string[];
  created_at: string;
  /** Returned by admin_list_users and admin_get_user; optional so older fixtures still fit. */
  username?: string | null;
};

/** public.trainer_applications (20261013000300_trainers.sql, city from 20261014000100). */
export type TrainerApplicationRow = {
  trainer_id: string;
  status: ApplicationStatus;
  full_name: string;
  phone: string;
  summary: string;
  area: string;
  city: string;
  travel_radius_km: number | null;
  languages: string[];
  modes: SessionMode[];
  specialties: string[];
  experience: ExperienceBand | null;
  qualifications: string;
  session_notes: string;
  expected_home_rate_inr: number | null;
  expected_online_rate_inr: number | null;
  accuracy_confirmed: boolean;
  reviewer_note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

/** public.trainer_documents; files live in the private `trainer-documents` bucket. */
export type TrainerDocumentRow = {
  id: string;
  trainer_id: string;
  kind: DocumentKind;
  storage_path: string;
  file_name: string;
  size_bytes: number;
  status: DocumentStatus;
  note: string | null;
  created_at: string;
};

/** public.availability_windows; weekday is ISO (1 Monday .. 7 Sunday), minutes from midnight. */
export type AvailabilityWindowRow = {
  id: string;
  trainer_id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
};

/**
 * public.support_cases (20261013000500_social.sql; priority and assignee_id from
 * 20261019000400): the columns the dashboard counts and the reviews page links by target.
 * Rows are readable with support.read (20261019000300_rbac_round2.sql); the support pages
 * read through the admin functions below.
 */
export type SupportCaseRow = {
  id: string;
  status: SupportCaseStatus;
  category: ReportCategory;
  priority: SupportPriority;
  assignee_id: string | null;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  updated_at: string;
};

/** One row of admin_list_support_cases (20261019000400), needs support.read. */
export type SupportCaseListRow = {
  id: string;
  reporter_id: string;
  reporter_name: string | null;
  reporter_role: UserRole | null;
  category: ReportCategory;
  subject: string;
  status: SupportCaseStatus;
  priority: SupportPriority;
  assignee_id: string | null;
  assignee_name: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  event_count: number;
  created_at: string;
  updated_at: string;
};

export type PaymentStatus =
  | "not_required"
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "refund_pending"
  | "partially_refunded"
  | "refunded"
  | "disputed";

/** bookings.cancelled_by (20261019000500); null on bookings cancelled before it existed. */
export type CancelledBy = "client" | "trainer" | "admin";

/**
 * public.bookings (20261013000400_bookings.sql; cancelled_by and the dispute columns from
 * 20261019000500). Admins read every row with bookings.read (bookings_select_admin).
 */
export type BookingRow = {
  id: string;
  client_id: string;
  trainer_id: string;
  service_id: string | null;
  service_title: string;
  mode: SessionMode;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  price_snapshot_inr: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  cancellation_policy: string;
  cancellation_reason: string | null;
  requested_start_at: string | null;
  trainer_note: string | null;
  cancelled_by: CancelledBy | null;
  dispute_note: string | null;
  dispute_resolved_at: string | null;
  dispute_resolved_by: string | null;
  created_at: string;
  updated_at: string;
};

/** public.booking_locations: the session address; admins read it only with bookings.address. */
export type BookingLocationRow = {
  booking_id: string;
  address_text: string;
  updated_at: string;
};

/** The dispute jsonb of admin_list_bookings: null when there is no dispute on record. */
export type BookingDisputeJson = {
  state: "open" | "resolved";
  case_id: string | null;
  case_status: SupportCaseStatus | null;
  note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
};

/** One row of admin_list_bookings (20261019000500), needs bookings.read. */
export type AdminBookingListRow = {
  id: string;
  client_id: string;
  client_name: string | null;
  trainer_id: string;
  trainer_name: string | null;
  mode: SessionMode;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  price_snapshot_inr: number;
  has_address: boolean;
  dispute: BookingDisputeJson | null;
  created_at: string;
};

/** One row of admin_list_reviews (20261019000500), needs reviews.moderate. */
export type AdminReviewListRow = {
  id: string;
  booking_id: string;
  trainer_id: string;
  trainer_name: string | null;
  client_id: string;
  client_name: string | null;
  author_display_name: string;
  rating: number;
  body: string;
  hidden: boolean;
  hidden_reason: string | null;
  hidden_at: string | null;
  hidden_by: string | null;
  hidden_by_name: string | null;
  /** bigint on the wire; PostgREST may send it as a number or a string. */
  open_reports: number | string;
  created_at: string;
};

/**
 * public.trainer_profiles (20261013000300_trainers.sql): readable by any admin
 * (private.is_admin() in tp_select); changed only through admin_update_trainer_profile and
 * admin_set_services. search_text is left out of every select.
 */
export type TrainerProfileRow = {
  trainer_id: string;
  display_name: string;
  headline: string;
  bio: string;
  specialties: string[];
  modes: SessionMode[];
  service_area: string;
  languages: string[];
  years_experience: number;
  verified_checks: string[];
  availability_tags: string[];
  certifications: string[];
  approved_home_rate_inr: number | null;
  approved_online_rate_inr: number | null;
  pricing_acknowledged_at: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

/** public.services: one per trainer and mode; never deleted, only deactivated. */
export type ServiceRow = {
  id: string;
  trainer_id: string;
  title: string;
  mode: SessionMode;
  duration_minutes: number;
  price_inr: number;
  active: boolean;
  created_at: string;
};

/** public.trainer_rating_summaries (view): hidden reviews are left out of the average. */
export type TrainerRatingSummaryRow = {
  trainer_id: string;
  review_count: number;
  average_rating: number | null;
};

/** One element of the p_services array admin_set_services takes. */
export type ServiceInputJson = {
  id: string | null;
  title: string;
  mode: SessionMode;
  duration_minutes: number;
  price_inr: number;
  active: boolean;
};

/** One row of admin_list_audit (20261019000300_rbac_round2.sql), needs audit.read. */
export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_id: string | null;
  details: Json;
  created_at: string;
};

/**
 * One row of admin_list_audit as 20261019000700 returns it: the filtered rows plus the count
 * of every row the filters match (the same on each row). audit.read; over 1000 rows a call
 * also needs audit.export, and one call returns at most 10000.
 */
export type AdminAuditListRow = AuditLogRow & { total_count: number };

/** The lists the app offers (20261019000600_adminops_catalogue_announcements.sql). */
export type CatalogueKind = "specialty" | "category" | "goal" | "city" | "area" | "language";

/**
 * public.catalogue_items: active rows for everyone, every row with catalogue.manage; written
 * only through admin_upsert_catalogue_item and admin_delete_catalogue_item.
 */
export type CatalogueItemRow = {
  id: string;
  kind: CatalogueKind;
  key: string;
  label: string;
  /** The city key of an area; null for every other kind. */
  parent_key: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

/** public.platform_settings: readable by everyone; written only through admin_set_setting. */
export type PlatformSettingRow = {
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
};

/** The segment jsonb admin_send_notification takes and announcements stores. */
export type AnnouncementSegmentJson = {
  audience: "all" | "clients" | "trainers" | "user";
  user_id?: string;
  city?: string;
};

/** public.announcements: readable with announcements.send only. */
export type AnnouncementRow = {
  id: string;
  segment: Json;
  title: string;
  body: string;
  route: string | null;
  sent_by: string;
  sent_at: string | null;
  recipient_count: number | null;
  created_at: string;
};

/**
 * The jsonb `my_access()` returns. Typed for reference only: the data layer still validates
 * it with Zod, because jsonb carries no shape guarantee.
 */
export type MyAccessJson = {
  user_id: string;
  full_name: string | null;
  platform_role: UserRole | null;
  account_status: AccountStatus;
  admin_access: boolean;
  roles: { id: string; key: string; name: string; is_admin: boolean }[];
  permissions: string[];
};

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: RoleRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      permissions: {
        Row: PermissionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      role_permissions: {
        Row: RolePermissionRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_permissions_permission_key_fkey";
            columns: ["permission_key"];
            isOneToOne: false;
            referencedRelation: "permissions";
            referencedColumns: ["key"];
          },
        ];
      };
      user_roles: {
        Row: UserRoleRow;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      trainer_applications: {
        Row: TrainerApplicationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      trainer_documents: {
        Row: TrainerDocumentRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      availability_windows: {
        Row: AvailabilityWindowRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      support_cases: {
        Row: SupportCaseRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      bookings: {
        Row: BookingRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      booking_locations: {
        Row: BookingLocationRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      trainer_profiles: {
        Row: TrainerProfileRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      catalogue_items: {
        Row: CatalogueItemRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      platform_settings: {
        Row: PlatformSettingRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      announcements: {
        Row: AnnouncementRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      trainer_rating_summaries: {
        Row: TrainerRatingSummaryRow;
        Relationships: [];
      };
    };
    Functions: {
      my_access: {
        Args: Record<string, never>;
        Returns: MyAccessJson;
      };
      admin_create_role: {
        Args: { p_key: string; p_name: string; p_description?: string; p_is_admin?: boolean };
        Returns: RoleRow;
      };
      admin_update_role: {
        Args: { p_id: string; p_name: string; p_description: string; p_is_admin: boolean };
        Returns: RoleRow;
      };
      admin_delete_role: {
        Args: { p_id: string };
        Returns: undefined;
      };
      admin_set_role_permissions: {
        Args: { p_role_id: string; p_permission_keys: string[] };
        Returns: undefined;
      };
      admin_assign_role: {
        Args: { p_user_id: string; p_role_id: string };
        Returns: undefined;
      };
      admin_revoke_role: {
        Args: { p_user_id: string; p_role_id: string };
        Returns: undefined;
      };
      admin_set_platform_role: {
        Args: { p_user_id: string; p_role: UserRole };
        Returns: undefined;
      };
      admin_list_users: {
        Args: { p_query: string; p_limit: number | null; p_offset: number };
        Returns: AdminUserRow[];
      };
      admin_get_user: {
        Args: { p_user_id: string };
        Returns: AdminUserRow[];
      };
      review_application: {
        Args: {
          p_trainer: string;
          p_status: ApplicationStatus;
          p_note?: string | null;
          p_home_rate_inr?: number | null;
          p_online_rate_inr?: number | null;
          p_verified_checks?: string[] | null;
          p_availability_tags?: string[] | null;
        };
        Returns: undefined;
      };
      review_document: {
        Args: { p_document: string; p_status: DocumentStatus; p_note?: string | null };
        Returns: undefined;
      };
      admin_list_support_cases: {
        Args: {
          p_status?: SupportCaseStatus | null;
          p_category?: ReportCategory | null;
          p_assignee?: string | null;
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: SupportCaseListRow[];
      };
      /** jsonb: validated with Zod in src/lib/db/support.ts. */
      admin_get_support_case: {
        Args: { p_id: string };
        Returns: Json;
      };
      /** jsonb, the same shape as admin_get_support_case. */
      admin_update_support_case: {
        Args: {
          p_id: string;
          p_status?: SupportCaseStatus | null;
          p_assignee?: string | null;
          p_note?: string | null;
          p_reply?: string | null;
          p_unassign?: boolean;
        };
        Returns: Json;
      };
      /** jsonb user 360 (20261019000400): validated with Zod in src/lib/db/users.ts. */
      admin_get_user_detail: {
        Args: { p_id: string };
        Returns: Json;
      };
      /** jsonb { id, account_status, previous_status }; needs users.suspend. */
      admin_set_account_status: {
        Args: { p_user: string; p_status: AccountStatus; p_reason: string };
        Returns: Json;
      };
      /** jsonb, the updated privacy_requests row; needs privacy.process. */
      admin_process_privacy_request: {
        Args: { p_id: string; p_outcome: PrivacyOutcome; p_note: string | null };
        Returns: Json;
      };
      admin_list_audit: {
        Args: {
          p_actor?: string | null;
          p_action?: string | null;
          p_target?: string | null;
          p_from?: string | null;
          p_to?: string | null;
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: AdminAuditListRow[];
      };
      /** jsonb platform numbers for India dates [p_from, p_to]; validated with Zod in src/lib/db/metrics.ts. */
      admin_metrics: {
        Args: { p_from: string; p_to: string };
        Returns: Json;
      };
      /** jsonb, the updated trainer_profiles row; needs trainers.edit. */
      admin_update_trainer_profile: {
        Args: { p_trainer: string; p_fields: Json };
        Returns: Json;
      };
      /** jsonb { trainer_id, approved_home_rate_inr, approved_online_rate_inr, services }. */
      admin_set_services: {
        Args: { p_trainer: string; p_services: Json };
        Returns: Json;
      };
      /** jsonb { trainer_id, status, reviewer_note, documents }; needs documents.review. */
      admin_request_documents: {
        Args: { p_trainer: string; p_message: string; p_kinds: DocumentKind[] };
        Returns: Json;
      };
      admin_list_bookings: {
        Args: {
          p_status?: BookingStatus | null;
          p_mode?: SessionMode | null;
          p_from?: string | null;
          p_to?: string | null;
          p_trainer?: string | null;
          p_client?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: AdminBookingListRow[];
      };
      /** jsonb, the updated bookings row; needs bookings.cancel. */
      admin_cancel_booking: {
        Args: { p_id: string; p_reason: string };
        Returns: Json;
      };
      /** jsonb, the updated bookings row; needs bookings.cancel. */
      admin_resolve_dispute: {
        Args: { p_id: string; p_outcome: "completed" | "no_show" | "cancelled"; p_note: string };
        Returns: Json;
      };
      /** jsonb, the updated reviews row; needs reviews.moderate. */
      admin_moderate_review: {
        Args: { p_id: string; p_hidden: boolean; p_reason: string | null };
        Returns: Json;
      };
      admin_list_reviews: {
        Args: {
          p_hidden?: boolean | null;
          p_trainer?: string | null;
          p_reported?: boolean | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: AdminReviewListRow[];
      };
      /** Active rows of one kind, ordered; invoker rights, so RLS applies. */
      catalogue: {
        Args: { p_kind: CatalogueKind };
        Returns: CatalogueItemRow[];
      };
      /** jsonb, the stored catalogue_items row; needs catalogue.manage. */
      admin_upsert_catalogue_item: {
        Args: {
          p_kind: CatalogueKind;
          p_key: string;
          p_label: string;
          p_parent_key?: string | null;
          p_sort_order?: number;
          p_active?: boolean;
        };
        Returns: Json;
      };
      /** jsonb, the deleted row; BRVAL while the item is in use. Needs catalogue.manage. */
      admin_delete_catalogue_item: {
        Args: { p_id: string };
        Returns: Json;
      };
      /** jsonb, the stored platform_settings row; needs catalogue.manage. */
      admin_set_setting: {
        Args: { p_key: string; p_value: Json };
        Returns: Json;
      };
      /** jsonb, the announcements row with recipient_count; needs announcements.send. */
      admin_send_notification: {
        Args: { p_segment: Json; p_title: string; p_body: string; p_route?: string | null };
        Returns: Json;
      };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      session_mode: SessionMode;
      application_status: ApplicationStatus;
      document_kind: DocumentKind;
      document_status: DocumentStatus;
      experience_band: ExperienceBand;
      support_case_status: SupportCaseStatus;
      report_category: ReportCategory;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      privacy_request_kind: PrivacyRequestKind;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
