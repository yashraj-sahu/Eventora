/**
 * Database type definitions matching the Supabase schema.
 */
export type UserRole = "customer" | "vendor" | "admin" | "platform_owner";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type BookingStatus =
  | "draft"
  | "pending_vendor_confirmation"
  | "awaiting_payment"
  | "confirmed"
  | "cancelled"
  | "completed";
export type PaymentStatus = "created" | "captured" | "partially_refunded" | "failed" | "refunded";
export type PaymentPurpose = "advance" | "remaining" | "full";
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
        Row: { id: string; email: string; invited_by: string; target_user_id: string | null; expires_at: string; accepted_at: string | null; revoked_at: string | null; created_at: string };
        Insert: { id?: string; email: string; invited_by: string; target_user_id?: string | null; expires_at?: string; accepted_at?: string | null; revoked_at?: string | null; created_at?: string };
        Update: { id?: string; email?: string; invited_by?: string; target_user_id?: string | null; expires_at?: string; accepted_at?: string | null; revoked_at?: string | null };
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
    };
    Views: Record<string, never>;
    Functions: {
      claim_vendor_listing: { Args: { p_vendor_id: string; p_confirm_role_change: boolean }; Returns: string };
      is_evntora_owner: { Args: Record<string, never>; Returns: boolean };
      accept_admin_invitation: { Args: { p_invitation_id: string }; Returns: boolean };
      enable_customer_access: { Args: Record<string, never>; Returns: boolean };
      set_admin_membership: { Args: { p_user_id: string; p_active: boolean }; Returns: boolean };
      consume_ai_request: { Args: Record<string, never>; Returns: boolean };
      consume_ai_guest_request: { Args: { p_fingerprint: string }; Returns: boolean };
      apply_razorpay_capture: { Args: { p_order_id: string; p_payment_id: string; p_amount: number; p_currency: string; p_payment_method: string | null; p_verified_at: string }; Returns: Record<string, unknown> };
      reserve_payment_refund: { Args: { p_payment_id: string; p_requested_amount: number | null; p_reason: string; p_created_by: string; p_idempotency_key: string }; Returns: Record<string, unknown> };
      complete_payment_refund: { Args: { p_refund_id: string; p_razorpay_refund_id: string; p_provider_status: string }; Returns: Record<string, unknown> };
      apply_razorpay_refund_webhook: { Args: { p_razorpay_refund_id: string; p_razorpay_payment_id: string; p_amount: number }; Returns: Record<string, unknown> };
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
