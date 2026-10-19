/*
 * HAND-WRITTEN placeholder types for the RBAC schema (backend task 05, approved 2026-10-19)
 * plus the existing tables this panel reads (trainer applications, documents, availability). Replace this whole file with
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
    };
    Views: { [_ in never]: never };
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
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      session_mode: SessionMode;
      application_status: ApplicationStatus;
      document_kind: DocumentKind;
      document_status: DocumentStatus;
      experience_band: ExperienceBand;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
