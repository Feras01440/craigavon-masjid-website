export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AdminRole =
  "super_admin" | "website_editor" | "prayer_editor" | "enquiries_manager" | "reviewer";

export type AccountStatus = "invited" | "active" | "disabled";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type ContentKind =
  | "page"
  | "announcement"
  | "emergency_notice"
  | "event"
  | "recurring_programme"
  | "education"
  | "service"
  | "faq"
  | "policy"
  | "navigation"
  | "social_link"
  | "donation_appeal";
export type MediaStatus = "draft" | "published" | "archived";
export type EnquiryStatus = "new" | "in_progress" | "awaiting_response" | "closed" | "deleted";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AdminProfileRow = {
  id: string;
  display_name: string;
  role: AdminRole;
  status: AccountStatus;
  mfa_required: boolean;
  invited_by: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminInviteRow = {
  id: string;
  email: string;
  role: AdminRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type SiteSettingRow = {
  key: string;
  value: Json;
  status: ContentStatus;
  demo_local_only: boolean;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentItemRow = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  summary: string | null;
  seo_title: string | null;
  seo_description: string | null;
  body: Json;
  category: string | null;
  status: ContentStatus;
  demo_local_only: boolean;
  featured: boolean;
  publish_at: string | null;
  expires_at: string | null;
  version: number;
  created_by: string | null;
  updated_by: string | null;
  published_by: string | null;
  published_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentRevisionRow = {
  id: number;
  content_item_id: string;
  version: number;
  snapshot: Json;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type MediaAssetRow = {
  id: string;
  bucket: string;
  object_path: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  decorative: boolean;
  caption: string | null;
  credit: string | null;
  status: MediaStatus;
  uploaded_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EnquiryRow = {
  id: string;
  kind: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  privacy_notice_version: string;
  status: EnquiryStatus;
  assigned_to: string | null;
  source_fingerprint: string | null;
  retention_until: string;
  closed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PrayerSettingsRow = {
  id: string;
  name: string;
  status: ContentStatus;
  demo_local_only: boolean;
  effective_from: string;
  effective_to: string | null;
  timezone: string;
  latitude: number;
  longitude: number;
  calculation_method: string;
  madhab: string;
  high_latitude_rule: string;
  adjustments: Json;
  congregation_rules: Json;
  hijri_adjustment: number;
  source_name: string;
  source_reference: string | null;
  calculation_library: string;
  calculation_library_version: string;
  version: number;
  approval_note: string | null;
  approved_by: string | null;
  published_at: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type PrayerSettingsRevisionRow = {
  id: number;
  prayer_settings_id: string;
  version: number;
  snapshot: Json;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type JumuahSessionRow = {
  id: string;
  prayer_settings_id: string;
  label: string;
  khutbah_time: string;
  prayer_time: string | null;
  display_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PrayerOverrideRow = {
  id: string;
  prayer_settings_id: string;
  prayer_date: string;
  prayer: "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
  begins_at: string | null;
  congregation_at: string | null;
  unavailable: boolean;
  reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SeasonalArrangementRow = {
  id: string;
  prayer_settings_id: string;
  kind: "ramadan" | "eid_al_fitr" | "eid_al_adha" | "closure" | "other";
  title: string;
  starts_on: string;
  ends_on: string;
  details: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: Json | null;
  after_state: Json | null;
  request_id: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      admin_profiles: Table<
        AdminProfileRow,
        {
          id: string;
          display_name: string;
          role?: AdminRole;
          status?: AccountStatus;
          mfa_required?: boolean;
          invited_by?: string | null;
          disabled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<AdminProfileRow, "id" | "created_at">>
      >;
      admin_invites: Table<
        AdminInviteRow,
        {
          id?: string;
          email: string;
          role: AdminRole;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        },
        Partial<Omit<AdminInviteRow, "id" | "created_at">>
      >;
      site_settings: Table<
        SiteSettingRow,
        {
          key: string;
          value?: Json;
          status?: ContentStatus;
          demo_local_only?: boolean;
          version?: number;
          created_by?: string | null;
          updated_by?: string | null;
          published_by?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<SiteSettingRow, "key" | "created_at">>
      >;
      content_items: Table<
        ContentItemRow,
        {
          id?: string;
          kind: ContentKind;
          slug: string;
          title: string;
          summary?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          body?: Json;
          category?: string | null;
          status?: ContentStatus;
          demo_local_only?: boolean;
          featured?: boolean;
          publish_at?: string | null;
          expires_at?: string | null;
          version?: number;
          created_by?: string | null;
          updated_by?: string | null;
          published_by?: string | null;
          published_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<ContentItemRow, "id" | "created_at">>
      >;
      content_revisions: Table<
        ContentRevisionRow,
        {
          id?: never;
          content_item_id: string;
          version: number;
          snapshot: Json;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        },
        never
      >;
      media_assets: Table<
        MediaAssetRow,
        {
          id?: string;
          bucket?: string;
          object_path: string;
          original_name: string;
          mime_type: string;
          byte_size: number;
          width?: number | null;
          height?: number | null;
          alt_text?: string | null;
          decorative?: boolean;
          caption?: string | null;
          credit?: string | null;
          status?: MediaStatus;
          uploaded_by: string;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<MediaAssetRow, "id" | "created_at" | "uploaded_by">>
      >;
      enquiries: Table<
        EnquiryRow,
        {
          id?: string;
          kind: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          message: string;
          privacy_notice_version: string;
          status?: EnquiryStatus;
          assigned_to?: string | null;
          source_fingerprint?: string | null;
          retention_until: string;
          closed_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<EnquiryRow, "id" | "created_at">>
      >;
      prayer_settings: Table<
        PrayerSettingsRow,
        Omit<
          PrayerSettingsRow,
          "id" | "created_at" | "updated_at" | "version" | "demo_local_only"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
          demo_local_only?: boolean;
        },
        Partial<Omit<PrayerSettingsRow, "id" | "created_at">>
      >;
      prayer_settings_revisions: Table<
        PrayerSettingsRevisionRow,
        {
          id?: never;
          prayer_settings_id: string;
          version: number;
          snapshot: Json;
          reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        },
        never
      >;
      jumuah_sessions: Table<
        JumuahSessionRow,
        {
          id?: string;
          prayer_settings_id: string;
          label: string;
          khutbah_time: string;
          prayer_time?: string | null;
          display_order?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<JumuahSessionRow, "id" | "prayer_settings_id" | "created_at">>
      >;
      prayer_overrides: Table<
        PrayerOverrideRow,
        {
          id?: string;
          prayer_settings_id: string;
          prayer_date: string;
          prayer: PrayerOverrideRow["prayer"];
          begins_at?: string | null;
          congregation_at?: string | null;
          unavailable?: boolean;
          reason: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<PrayerOverrideRow, "id" | "prayer_settings_id" | "created_by" | "created_at">>
      >;
      seasonal_arrangements: Table<
        SeasonalArrangementRow,
        {
          id?: string;
          prayer_settings_id: string;
          kind: SeasonalArrangementRow["kind"];
          title: string;
          starts_on: string;
          ends_on: string;
          details?: Json;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<
          Omit<SeasonalArrangementRow, "id" | "prayer_settings_id" | "created_by" | "created_at">
        >
      >;
      audit_log: Table<AuditLogRow, never, never>;
    };
    Views: Record<string, never>;
    Functions: {
      current_admin_role: { Args: Record<PropertyKey, never>; Returns: AdminRole | null };
      has_aal2: { Args: Record<PropertyKey, never>; Returns: boolean };
      has_permission: { Args: { permission: string }; Returns: boolean };
      save_site_setting: {
        Args: {
          p_actor_id: string;
          p_key: string;
          p_expected_version: number | null;
          p_status: ContentStatus;
          p_value: Json;
        };
        Returns: { setting_key: string; setting_version: number }[];
      };
      consume_rate_limit: {
        Args: {
          p_key_hash: string;
          p_action: string;
          p_limit: number;
          p_window_seconds: number;
          p_block_seconds: number;
        };
        Returns: { allowed: boolean; remaining: number; retry_after_seconds: number }[];
      };
      purge_expired_operational_data: {
        Args: Record<PropertyKey, never>;
        Returns: { enquiries_purged: number; rate_limits_purged: number }[];
      };
      register_media_asset: {
        Args: {
          p_object_path: string;
          p_original_name: string;
          p_mime_type: string;
          p_byte_size: number;
          p_width: number;
          p_height: number;
          p_alt_text: string;
          p_decorative: boolean;
          p_caption: string;
          p_credit: string;
          p_status: MediaStatus;
        };
        Returns: string;
      };
      update_media_asset_status: {
        Args: {
          p_id: string;
          p_expected_updated_at: string;
          p_status: MediaStatus;
        };
        Returns: string;
      };
      save_prayer_draft: {
        Args: {
          p_id: string | null;
          p_expected_version: number | null;
          p_payload: Json;
          p_jumuah: Json;
        };
        Returns: { settings_id: string; settings_version: number }[];
      };
      publish_prayer_settings: {
        Args: {
          p_actor_id: string;
          p_id: string;
          p_expected_version: number;
          p_approval_note: string;
        };
        Returns: { settings_id: string; settings_version: number }[];
      };
      withdraw_prayer_settings: {
        Args: {
          p_actor_id: string;
          p_id: string;
          p_expected_version: number;
          p_reason: string;
          p_replacement_id?: string | null;
          p_replacement_expected_version?: number | null;
          p_replacement_approval_note?: string | null;
        };
        Returns: {
          withdrawn_settings_id: string;
          withdrawn_settings_version: number;
          replacement_settings_id: string | null;
          replacement_settings_version: number | null;
        }[];
      };
      clone_prayer_settings_draft: {
        Args: { p_source_id: string; p_revision_id?: number | null };
        Returns: string;
      };
      save_prayer_override: {
        Args: { p_settings_id: string; p_expected_version: number; p_payload: Json };
        Returns: { override_id: string; settings_version: number }[];
      };
      delete_prayer_override: {
        Args: { p_settings_id: string; p_expected_version: number; p_override_id: string };
        Returns: number;
      };
      save_seasonal_arrangement: {
        Args: { p_settings_id: string; p_expected_version: number; p_payload: Json };
        Returns: { arrangement_id: string; settings_version: number }[];
      };
      delete_seasonal_arrangement: {
        Args: { p_settings_id: string; p_expected_version: number; p_arrangement_id: string };
        Returns: number;
      };
      seed_local_demo_data: {
        Args: { p_actor_id: string; p_marker: string };
        Returns: Json;
      };
    };
    Enums: {
      admin_role: AdminRole;
      account_status: AccountStatus;
      content_status: ContentStatus;
      content_kind: ContentKind;
      media_status: MediaStatus;
      enquiry_status: EnquiryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
