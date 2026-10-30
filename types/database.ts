/**
 * Database type definitions matching the Supabase schema.
 */
export type UserRole = "customer" | "vendor" | "admin";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
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
          user_id: string;
          business_name: string;
          business_category: string;
          city: string;
          business_description: string | null;
          approval_status: ApprovalStatus;
          contact_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_name: string;
          business_category: string;
          city: string;
          business_description?: string | null;
          approval_status?: ApprovalStatus;
          contact_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          business_name?: string;
          business_category?: string;
          city?: string;
          business_description?: string | null;
          approval_status?: ApprovalStatus;
          contact_phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      approval_status: ApprovalStatus;
    };
  };
}
