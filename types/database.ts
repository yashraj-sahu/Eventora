/**
 * Database type definitions matching the Supabase schema.
 */
export type UserRole = "customer" | "vendor" | "admin" | "platform_owner";
export type AdminRole = "super_admin" | "vendor_moderator" | "support_admin" | "finance_admin";
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type BookingStatus =
  | "draft"
  | "pending_vendor_confirmation"
  | "awaiting_payment"
  | "awaiting_quotation"
  | "quotation_sent"
  | "quotation_revision_requested"
  | "declined"
  | "confirmed"
  | "cancellation_requested"
  | "in_progress"
  | "cancelled"
  | "completed";
export type PaymentStatus = "created" | "captured" | "partially_refunded" | "failed" | "refunded";
export type PaymentPurpose = "advance" | "remaining" | "full" | "partial";
export type RefundStatus = "pending" | "processed" | "failed";

export interface Database {
  public: {
    Tables: {
      user_roles: {
        Row: { user_id: string; role: UserRole; is_active: boolean; granted_by: string | null; created_at: string };
        Insert: { user_id: string; role: UserRole; is_active?: boolean; granted_by?: string | null; created_at?: string };
        Update: { user_id?: string; role?: UserRole; is_active?: boolean; granted_by?: string | null };
        Relationships: [];
      };
      admin_invitations: {
        Row: { id: string; email: string; admin_role: AdminRole; invited_by: string; target_user_id: string | null; requires_password_setup: boolean; expires_at: string; accepted_at: string | null; revoked_at: string | null; expired_at: string | null; created_at: string };
        Insert: { id?: string; email: string; admin_role?: AdminRole; invited_by: string; target_user_id?: string | null; requires_password_setup?: boolean; expires_at?: string; accepted_at?: string | null; revoked_at?: string | null; expired_at?: string | null; created_at?: string };
        Update: { id?: string; email?: string; admin_role?: AdminRole; invited_by?: string; target_user_id?: string | null; requires_password_setup?: boolean; expires_at?: string; accepted_at?: string | null; revoked_at?: string | null; expired_at?: string | null };
        Relationships: [];
      };
      admin_role_assignments: {
        Row: { user_id: string; admin_role: AdminRole; is_active: boolean; granted_by: string | null; created_at: string; updated_at: string };
        Insert: { user_id: string; admin_role: AdminRole; is_active?: boolean; granted_by?: string | null; created_at?: string; updated_at?: string };
        Update: { user_id?: string; admin_role?: AdminRole; is_active?: boolean; granted_by?: string | null; updated_at?: string };
        Relationships: [];
      };
      admin_permissions: {
        Row: { permission: string; label: string; description: string };
        Insert: { permission: string; label: string; description: string };
        Update: { label?: string; description?: string };
        Relationships: [];
      };
      admin_role_permissions: {
        Row: { admin_role: AdminRole; permission: string };
        Insert: { admin_role: AdminRole; permission: string };
        Update: never;
        Relationships: [];
      };
      admin_notifications: {
        Row: { id: number; recipient_id: string; permission: string; event_type: string; title: string; body: string; entity_type: string | null; entity_id: string | null; dedupe_key: string; read_at: string | null; created_at: string };
        Insert: { id?: number; recipient_id: string; permission: string; event_type: string; title: string; body: string; entity_type?: string | null; entity_id?: string | null; dedupe_key: string; read_at?: string | null; created_at?: string };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      user_notifications: {
        Row: { id: number; user_id: string; event_type: string; title: string; body: string; entity_type: string | null; entity_id: string | null; dedupe_key: string; read_at: string | null; created_at: string };
        Insert: { id?: number; user_id: string; event_type: string; title: string; body: string; entity_type?: string | null; entity_id?: string | null; dedupe_key: string; read_at?: string | null; created_at?: string };
        Update: { read_at?: string | null };
        Relationships: [];
      };
      admin_conversations: {
        Row: { id: string; created_by: string; subject: string; created_at: string; updated_at: string };
        Insert: { id?: string; created_by: string; subject: string; created_at?: string; updated_at?: string };
        Update: { subject?: string; updated_at?: string };
        Relationships: [];
      };
      admin_conversation_participants: {
        Row: { conversation_id: string; user_id: string; last_read_at: string | null };
        Insert: { conversation_id: string; user_id: string; last_read_at?: string | null };
        Update: { last_read_at?: string | null };
        Relationships: [];
      };
      admin_messages: {
        Row: { id: number; conversation_id: string; sender_id: string; body: string; created_at: string };
        Insert: { id?: number; conversation_id: string; sender_id: string; body: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      admin_audit_log: {
        Row: { id: number; actor_id: string | null; action: string; target_type: string; target_id: string | null; reason: string | null; before_data: Json | null; after_data: Json | null; request_id: string | null; created_at: string };
        Insert: { id?: number; actor_id?: string | null; action: string; target_type: string; target_id?: string | null; reason?: string | null; before_data?: Json | null; after_data?: Json | null; request_id?: string | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      platform_settings: {
        Row: { key: string; value: Json; updated_by: string | null; updated_at: string };
        Insert: { key: string; value: Json; updated_by?: string | null; updated_at?: string };
        Update: { value?: Json; updated_by?: string | null; updated_at?: string };
        Relationships: [];
      };
      marketplace_categories: {
        Row: { id: string; name: string; slug: string; is_active: boolean; sort_order: number; created_by: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; slug: string; is_active?: boolean; sort_order?: number; created_by?: string | null; created_at?: string; updated_at?: string };
        Update: { name?: string; slug?: string; is_active?: boolean; sort_order?: number; updated_at?: string };
        Relationships: [];
      };
      support_cases: {
        Row: { id: string; reporter_id: string; reporter_role: "customer" | "vendor"; booking_id: string | null; vendor_profile_id: string | null; case_type: string; review_id: string | null; listing_id: string | null; internal_notes: string | null; subject: string; description: string; status: string; assigned_admin_id: string | null; resolution: string | null; resolved_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; reporter_id: string; reporter_role: "customer" | "vendor"; booking_id?: string | null; vendor_profile_id?: string | null; case_type?: string; review_id?: string | null; listing_id?: string | null; internal_notes?: string | null; subject: string; description: string; status?: string; assigned_admin_id?: string | null; resolution?: string | null; resolved_at?: string | null; created_at?: string; updated_at?: string };
        Update: { case_type?: string; review_id?: string | null; listing_id?: string | null; internal_notes?: string | null; status?: string; assigned_admin_id?: string | null; resolution?: string | null; resolved_at?: string | null; updated_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          role?: UserRole;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      vendor_profiles: {
        Row: {
          id: string;
          user_id: string | null;
          business_name: string;
          business_category: string;
          city: string;
          business_description: string | null;
          short_bio: string | null;
          address: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          cover_image_url: string | null;
          starting_price: number;
          price_unit: string;
          price_range: string | null;
          experience_years: number;
          past_events_count: number;
          is_verified: boolean;
          is_featured: boolean;
          is_published: boolean;
          approval_status: ApprovalStatus;
          claimed_by: string | null;
          claim_requested_at: string | null;
          claim_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          business_name: string;
          business_category: string;
          city: string;
          business_description?: string | null;
          short_bio?: string | null;
          address?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cover_image_url?: string | null;
          starting_price?: number;
          price_unit?: string;
          price_range?: string | null;
          experience_years?: number;
          past_events_count?: number;
          is_verified?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          approval_status?: ApprovalStatus;
          claimed_by?: string | null;
          claim_requested_at?: string | null;
          claim_verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          business_category?: string;
          city?: string;
          business_description?: string | null;
          short_bio?: string | null;
          address?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cover_image_url?: string | null;
          starting_price?: number;
          price_unit?: string;
          price_range?: string | null;
          experience_years?: number;
          past_events_count?: number;
          is_verified?: boolean;
          is_featured?: boolean;
          is_published?: boolean;
          approval_status?: ApprovalStatus;
          claimed_by?: string | null;
          user_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      vendor_services: {
        Row: {
          id: string;
          vendor_profile_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_profile_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_services_vendor_profile_id_fkey";
            columns: ["vendor_profile_id"];
            isOneToOne: false;
            referencedRelation: "vendor_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      vendor_packages: {
        Row: {
          id: string;
          vendor_profile_id: string;
          name: string;
          description: string | null;
          price: number;
          price_display: string | null;
          features: string[];
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_profile_id: string;
          name: string;
          description?: string | null;
          price?: number;
          price_display?: string | null;
          features?: string[];
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          price?: number;
          price_display?: string | null;
          features?: string[];
          is_active?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_packages_vendor_profile_id_fkey";
            columns: ["vendor_profile_id"];
            isOneToOne: false;
            referencedRelation: "vendor_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      vendor_portfolio: {
        Row: {
          id: string;
          vendor_profile_id: string;
          storage_path: string;
          public_url: string | null;
          caption: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          vendor_profile_id: string;
          storage_path: string;
          public_url?: string | null;
          caption?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          storage_path?: string;
          public_url?: string | null;
          caption?: string | null;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_portfolio_vendor_profile_id_fkey";
            columns: ["vendor_profile_id"];
            isOneToOne: false;
            referencedRelation: "vendor_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      vendor_listings: {
        Row: { id: string; vendor_profile_id: string; vendor_service_id: string | null; name: string; category: string; subcategory: string | null; description: string; pricing_model: "fixed" | "starting_at" | "custom_quote"; pricing_unit: "per_hour" | "per_day" | "per_event" | "per_guest" | "per_item" | "per_package" | "custom_quote"; starting_price: number | null; minimum_quantity: number | null; pricing_details: Record<string, unknown>; inclusions: string[]; exclusions: string[]; capacity: number | null; duration_minutes: number | null; booking_requirements: string | null; terms: string | null; status: "draft" | "pending_approval" | "published" | "rejected" | "archived"; moderation_note: string | null; submitted_at: string | null; reviewed_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; vendor_profile_id: string; vendor_service_id?: string | null; name: string; category: string; subcategory?: string | null; description?: string; pricing_model?: "fixed" | "starting_at" | "custom_quote"; pricing_unit?: "per_hour" | "per_day" | "per_event" | "per_guest" | "per_item" | "per_package" | "custom_quote"; starting_price?: number | null; minimum_quantity?: number | null; pricing_details?: Record<string, unknown>; inclusions?: string[]; exclusions?: string[]; capacity?: number | null; duration_minutes?: number | null; booking_requirements?: string | null; terms?: string | null; status?: "draft" | "pending_approval"; created_at?: string; updated_at?: string };
        Update: { vendor_service_id?: string | null; name?: string; category?: string; subcategory?: string | null; description?: string; pricing_model?: "fixed" | "starting_at" | "custom_quote"; pricing_unit?: "per_hour" | "per_day" | "per_event" | "per_guest" | "per_item" | "per_package" | "custom_quote"; starting_price?: number | null; minimum_quantity?: number | null; pricing_details?: Record<string, unknown>; inclusions?: string[]; exclusions?: string[]; capacity?: number | null; duration_minutes?: number | null; booking_requirements?: string | null; terms?: string | null; status?: "draft" | "pending_approval" | "rejected"; updated_at?: string };
        Relationships: [];
      };
      vendor_listing_addons: {
        Row: { id: string; listing_id: string; name: string; description: string | null; price: number; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; listing_id: string; name: string; description?: string | null; price: number; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { name?: string; description?: string | null; price?: number; is_active?: boolean; updated_at?: string };
        Relationships: [];
      };
      vendor_service_areas: {
        Row: { id: string; vendor_profile_id: string; city: string; region: string; created_at: string };
        Insert: { id?: string; vendor_profile_id: string; city: string; region?: string; created_at?: string };
        Update: { city?: string; region?: string };
        Relationships: [];
      };
      vendor_verification_documents: {
        Row: { id: string; vendor_profile_id: string; document_type: string; storage_path: string; status: "pending" | "approved" | "rejected"; rejection_reason: string | null; submitted_at: string; reviewed_at: string | null };
        Insert: { id?: string; vendor_profile_id: string; document_type: string; storage_path: string; status?: "pending"; submitted_at?: string };
        Update: { status?: "pending" | "approved" | "rejected"; rejection_reason?: string | null; reviewed_at?: string | null };
        Relationships: [];
      };
      vendor_reviews: {
        Row: { id: string; vendor_profile_id: string; booking_id: string; customer_id: string; rating: number; review_text: string; vendor_response: string | null; responded_at: string | null; moderation_status: "published" | "hidden"; created_at: string };
        Insert: { id?: string; vendor_profile_id: string; booking_id: string; customer_id: string; rating: number; review_text: string; created_at?: string };
        Update: { vendor_response?: string | null; responded_at?: string | null };
        Relationships: [];
      };
      vendor_saves: {
        Row: { user_id: string; vendor_profile_id: string; created_at: string };
        Insert: { user_id: string; vendor_profile_id: string; created_at?: string };
        Update: { user_id?: string; vendor_profile_id?: string };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          category: string;
          city: string;
          date: string;
          guest_count: number;
          total_budget: number;
          venue_preference: string | null;
          style_theme: string | null;
          status: string;
          blueprint: Record<string, unknown> | null;
          planning_requirements: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          category: string;
          city: string;
          date: string;
          guest_count?: number;
          total_budget?: number;
          venue_preference?: string | null;
          style_theme?: string | null;
          status?: string;
          blueprint?: Record<string, unknown> | null;
          planning_requirements?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          category?: string;
          city?: string;
          date?: string;
          guest_count?: number;
          total_budget?: number;
          venue_preference?: string | null;
          style_theme?: string | null;
          status?: string;
          blueprint?: Record<string, unknown> | null;
          planning_requirements?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_conversations: {
        Row: { id: string; user_id: string; event_id: string | null; title: string; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; event_id?: string | null; title?: string; created_at?: string; updated_at?: string };
        Update: { event_id?: string | null; title?: string; updated_at?: string };
        Relationships: [];
      };
      ai_messages: {
        Row: { id: string; conversation_id: string; role: "user" | "assistant"; content: string; created_at: string };
        Insert: { id?: string; conversation_id: string; role: "user" | "assistant"; content: string; created_at?: string };
        Update: { content?: string };
        Relationships: [];
      };
      ai_memories: {
        Row: { id: string; user_id: string; event_id: string | null; memory_type: "personal" | "event"; content: string; is_enabled: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; event_id?: string | null; memory_type: "personal" | "event"; content: string; is_enabled?: boolean; created_at?: string; updated_at?: string };
        Update: { content?: string; is_enabled?: boolean; updated_at?: string };
        Relationships: [];
      };
      ai_usage_events: {
        Row: { id: string; user_id: string; created_at: string };
        Insert: { id?: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          booking_reference: string;
          customer_id: string;
          event_id: string | null;
          vendor_id: string;
          vendor_profile_id: string | null;
          vendor_package_id: string | null;
          vendor_service_id: string | null;
          vendor_name: string;
          vendor_category: string;
          package_name: string | null;
          service_details: Record<string, unknown> | null;
          event_date: string;
          event_city: string;
          guest_count: number | null;
          requirements: string | null;
          total_amount: number; // in paise
          advance_amount: number; // in paise
          paid_amount: number; // in paise
          currency: string;
          status: BookingStatus;
          request_idempotency_key: string | null;
          requested_advance_percentage: number;
          allow_partial_payments: boolean;
          accepted_quotation_id: string | null;
          rejection_reason: string | null;
          cancellation_reason: string | null;
          accepted_at: string | null;
          confirmed_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          completion_acknowledged_at: string | null;
          cancellation_requested_at: string | null;
          cancelled_at: string | null;
          cancellation_terms: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_reference: string;
          customer_id: string;
          event_id?: string | null;
          vendor_id: string;
          vendor_profile_id?: string | null;
          vendor_package_id?: string | null;
          vendor_service_id?: string | null;
          vendor_name: string;
          vendor_category: string;
          package_name?: string | null;
          service_details?: Record<string, unknown> | null;
          event_date: string;
          event_city: string;
          guest_count?: number | null;
          requirements?: string | null;
          total_amount: number;
          advance_amount: number;
          paid_amount?: number;
          currency?: string;
          status?: BookingStatus;
          cancellation_terms?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_id?: string | null;
          vendor_profile_id?: string | null;
          vendor_package_id?: string | null;
          vendor_service_id?: string | null;
          vendor_name?: string;
          vendor_category?: string;
          package_name?: string | null;
          service_details?: Record<string, unknown> | null;
          event_date?: string;
          event_city?: string;
          guest_count?: number | null;
          requirements?: string | null;
          total_amount?: number;
          advance_amount?: number;
          paid_amount?: number;
          currency?: string;
          status?: BookingStatus;
          cancellation_terms?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bookings_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          }
        ];
      };
      payments: {
        Row: {
          id: string;
          booking_id: string;
          customer_id: string;
          razorpay_order_id: string;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          amount: number; // in paise
          currency: string;
          status: PaymentStatus;
          purpose: PaymentPurpose;
          payment_method: string | null;
          error_code: string | null;
          error_description: string | null;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          customer_id: string;
          razorpay_order_id: string;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount: number;
          currency?: string;
          status?: PaymentStatus;
          purpose?: PaymentPurpose;
          payment_method?: string | null;
          error_code?: string | null;
          error_description?: string | null;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount?: number;
          currency?: string;
          status?: PaymentStatus;
          purpose?: PaymentPurpose;
          payment_method?: string | null;
          error_code?: string | null;
          error_description?: string | null;
          verified_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey";
            columns: ["booking_id"];
            isOneToOne: false;
            referencedRelation: "bookings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      payment_events: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          payload: Record<string, unknown>;
          status?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          id: string;
          payment_id: string;
          booking_id: string;
          razorpay_refund_id: string | null;
          amount: number;
          reason: string | null;
          status: RefundStatus;
          created_by: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          booking_id: string;
          razorpay_refund_id?: string | null;
          amount: number;
          reason?: string | null;
          status?: RefundStatus;
          created_by?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          razorpay_refund_id?: string | null;
          status?: RefundStatus;
          reason?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          }
        ];
      };
      vendor_availability: {
        Row: { id: string; vendor_profile_id: string; available_date: string; status: "available" | "unavailable" | "blocked"; note: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; vendor_profile_id: string; available_date: string; status: "available" | "unavailable" | "blocked"; note?: string | null; created_at?: string; updated_at?: string };
        Update: { status?: "available" | "unavailable" | "blocked"; note?: string | null; updated_at?: string };
        Relationships: [];
      };
      booking_quotations: {
        Row: { id: string; quotation_reference: string; booking_id: string; customer_id: string; vendor_profile_id: string; event_id: string | null; version: number; status: string; subtotal: number; discount_amount: number; additional_charges: number; total_amount: number; advance_percentage: number; advance_amount: number; allow_partial_payments: boolean; payment_terms: string; remaining_balance: number; valid_until: string; description: string | null; conditions: string | null; created_at: string; updated_at: string; sent_at: string; responded_at: string | null; accepted_at: string | null };
        Insert: { quotation_reference: string; booking_id: string; customer_id: string; vendor_profile_id: string; event_id?: string | null; version: number; status: string; subtotal: number; discount_amount?: number; additional_charges?: number; total_amount: number; advance_percentage: number; advance_amount: number; allow_partial_payments?: boolean; payment_terms: string; remaining_balance: number; valid_until: string; description?: string | null; conditions?: string | null; created_at?: string; updated_at?: string; sent_at?: string; responded_at?: string | null; accepted_at?: string | null };
        Update: { status?: string; updated_at?: string; responded_at?: string | null; accepted_at?: string | null };
        Relationships: [];
      };
      booking_quotation_items: {
        Row: { id: string; quotation_id: string; description: string; details: string | null; quantity: number; unit_price: number; line_total: number; sort_order: number };
        Insert: { id?: string; quotation_id: string; description: string; details?: string | null; quantity: number; unit_price: number; line_total: number; sort_order?: number };
        Update: never;
        Relationships: [];
      };
      booking_messages: {
        Row: { id: string; booking_id: string; sender_id: string; body: string; client_message_key: string | null; created_at: string; customer_read_at: string | null; vendor_read_at: string | null };
        Insert: { id?: string; booking_id: string; sender_id: string; body: string; client_message_key?: string | null; created_at?: string; customer_read_at?: string | null; vendor_read_at?: string | null };
        Update: { customer_read_at?: string | null; vendor_read_at?: string | null };
        Relationships: [];
      };
      booking_status_history: {
        Row: { id: string; booking_id: string; actor_id: string | null; actor_role: string; from_status: BookingStatus | null; to_status: BookingStatus; reason: string | null; created_at: string };
        Insert: { id?: string; booking_id: string; actor_id?: string | null; actor_role: string; from_status?: BookingStatus | null; to_status: BookingStatus; reason?: string | null; created_at?: string };
        Update: never;
        Relationships: [];
      };
      booking_notifications: {
        Row: { id: string; recipient_id: string; booking_id: string; event_type: string; title: string; message: string; dedupe_key: string; created_at: string; read_at: string | null };
        Insert: { id?: string; recipient_id: string; booking_id: string; event_type: string; title: string; message: string; dedupe_key: string; created_at?: string; read_at?: string | null };
        Update: { read_at?: string | null };
        Relationships: [];
      };
    };
    Views: {
      vendor_reviews_participant: {
        Row: { id: string; vendor_profile_id: string; booking_id: string; customer_id: string; rating: number; review_text: string; vendor_response: string | null; responded_at: string | null; created_at: string };
        Relationships: [];
      };
    };
    Functions: {
      has_admin_permission: { Args: { p_permission: string }; Returns: boolean };
      current_admin_permissions: { Args: Record<string, never>; Returns: string[] };
      create_admin_conversation: { Args: { p_recipient_id: string; p_subject: string; p_body: string }; Returns: string };
      send_admin_message: { Args: { p_conversation_id: string; p_body: string }; Returns: number };
      admin_unread_message_count: { Args: Record<string, never>; Returns: number };
      set_admin_assignment: { Args: { p_user_id: string; p_admin_role: string; p_active: boolean }; Returns: boolean };
      admin_platform_metrics: { Args: { p_from?: string | null; p_to?: string | null }; Returns: Json };
      admin_platform_trends: { Args: { p_days?: number }; Returns: Json };
      admin_platform_breakdowns: { Args: Record<string, never>; Returns: Json };
      admin_user_directory: { Args: { p_search?: string | null; p_role?: string | null; p_limit?: number; p_offset?: number; p_sort?: string; p_direction?: string }; Returns: Json };
      admin_set_user_role_active: { Args: { p_user_id: string; p_role: string; p_active: boolean; p_reason?: string | null }; Returns: boolean };
      claim_vendor_listing: { Args: { p_vendor_id: string; p_confirm_role_change: boolean }; Returns: string };
      is_evntora_owner: { Args: Record<string, never>; Returns: boolean };
      accept_admin_invitation: { Args: { p_invitation_id: string }; Returns: boolean };
      enable_customer_access: { Args: Record<string, never>; Returns: boolean };
      set_admin_membership: { Args: { p_user_id: string; p_active: boolean }; Returns: boolean };
      consume_ai_request: { Args: Record<string, never>; Returns: boolean };
      consume_ai_guest_request: { Args: { p_fingerprint: string }; Returns: boolean };
      apply_razorpay_capture: { Args: { p_order_id: string; p_payment_id: string; p_amount: number; p_currency: string; p_payment_method: string | null; p_verified_at: string }; Returns: Record<string, unknown> };
      reserve_payment_order: { Args: { p_booking_id: string; p_customer_id: string; p_purpose: string; p_partial_amount: number | null }; Returns: Record<string, unknown> };
      finalize_payment_order_intent: { Args: { p_intent_id: string; p_razorpay_order_id: string; p_receipt: string; p_amount: number; p_currency: string; p_provider_status: string; p_provider_intent_id: string; p_provider_booking_id: string }; Returns: Record<string, unknown> };
      mark_payment_order_intent: { Args: { p_intent_id: string; p_outcome: string }; Returns: undefined };
      reserve_payment_refund: { Args: { p_payment_id: string; p_requested_amount: number | null; p_reason: string; p_created_by: string; p_idempotency_key: string }; Returns: Record<string, unknown> };
      complete_payment_refund: { Args: { p_refund_id: string; p_razorpay_refund_id: string; p_provider_status: string }; Returns: Record<string, unknown> };
      apply_razorpay_refund_webhook: { Args: { p_razorpay_refund_id: string; p_razorpay_payment_id: string; p_amount: number }; Returns: Record<string, unknown> };
      create_booking_request: { Args: { p_customer_id: string; p_vendor_profile_id: string; p_event_id: string | null; p_package_id: string | null; p_service_id: string | null; p_event_date: string; p_event_city: string; p_guest_count: number; p_advance_percentage: number; p_requirements: string; p_idempotency_key: string }; Returns: Record<string, unknown> };
      set_vendor_availability: { Args: { p_vendor_id: string; p_date: string; p_status: string; p_note: string | null }; Returns: Record<string, unknown> };
      clear_vendor_availability: { Args: { p_vendor_id: string; p_date: string }; Returns: boolean };
      transition_booking: { Args: { p_booking_id: string; p_actor_id: string; p_actor_role: string; p_action: string; p_reason: string | null; p_expected_updated_at: string | null }; Returns: Record<string, unknown> };
      create_booking_quotation: { Args: { p_booking_id: string; p_vendor_id: string; p_items: Record<string, unknown>[]; p_discount: number; p_additional_charges: number; p_advance_percentage: number; p_allow_partial: boolean; p_payment_terms: string; p_valid_until: string; p_description: string | null; p_conditions: string | null }; Returns: Record<string, unknown> };
      respond_to_booking_quotation: { Args: { p_booking_id: string; p_quotation_id: string; p_customer_id: string; p_action: string; p_reason: string | null }; Returns: Record<string, unknown> };
      withdraw_booking_quotation: { Args: { p_booking_id: string; p_quotation_id: string; p_vendor_id: string }; Returns: Record<string, unknown> };
      notify_booking_participant: { Args: { p_booking_id: string; p_recipient_id: string; p_event_type: string; p_title: string; p_message: string; p_dedupe_key: string }; Returns: undefined };
      moderate_vendor_listing: { Args: { p_listing_id: string; p_action: string; p_reason?: string | null }; Returns: Database["public"]["Tables"]["vendor_listings"]["Row"] };
      moderate_vendor_review: { Args: { p_review_id: string; p_action: string; p_reason: string }; Returns: Json };
      moderate_vendor_profile: { Args: { p_vendor_profile_id: string; p_action: string; p_reason?: string | null }; Returns: Json };
      review_vendor_document: { Args: { p_document_id: string; p_action: string; p_reason?: string | null }; Returns: Json };
    };
    Enums: {
      user_role: UserRole;
      approval_status: ApprovalStatus;
      booking_status: BookingStatus;
      payment_status: PaymentStatus;
      payment_purpose: PaymentPurpose;
      refund_status: RefundStatus;
    };
  };
}
