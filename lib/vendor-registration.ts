import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type VendorRegistration = {
  businessName: string;
  category: string;
  city: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
};

export async function ensureVendorApplication(
  supabase: SupabaseClient<Database>,
  user: User,
  registration: VendorRegistration,
) {
  if (!user.email || !user.email_confirmed_at) {
    throw new Error("Verify the account email before submitting a vendor application.");
  }

  const businessName = registration.businessName.trim();
  const category = registration.category.trim();
  const city = registration.city.trim();
  const phone = registration.phone?.trim() ?? "";
  if (!businessName || businessName.length > 160) throw new Error("Enter a business name up to 160 characters.");
  if (!category || category.length > 80) throw new Error("Enter a business category up to 80 characters.");
  if (!city || city.length > 120) throw new Error("Enter a city or region up to 120 characters.");
  if (phone.length > 40) throw new Error("Enter a phone number up to 40 characters.");

  const { data: existing, error: lookupError } = await supabase
    .from("vendor_profiles")
    .select("id,approval_status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) throw new Error("We couldn’t check your existing vendor application. Please try again.");
  if (existing) return { vendorProfile: existing, alreadyExists: true };

  const { data: vendorProfile, error: insertError } = await supabase
    .from("vendor_profiles")
    .insert({
      user_id: user.id,
      business_name: businessName,
      business_category: category,
      city,
      business_description: typeof registration.description === "string" ? registration.description.trim().slice(0, 5000) || null : null,
      address: typeof registration.address === "string" ? registration.address.trim().slice(0, 300) || null : null,
      contact_phone: phone || null,
      contact_email: user.email.trim().toLowerCase(),
      approval_status: "pending",
      is_published: false,
      is_featured: false,
      is_verified: false,
    })
    .select("id,approval_status")
    .single();

  if (!insertError && vendorProfile) return { vendorProfile, alreadyExists: false };

  // A repeated callback or near-simultaneous submit can race the unique owner index.
  if (insertError?.code === "23505") {
    const { data: racedProfile, error: raceLookupError } = await supabase
      .from("vendor_profiles")
      .select("id,approval_status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!raceLookupError && racedProfile) return { vendorProfile: racedProfile, alreadyExists: true };
  }

  throw new Error("Your business profile could not be saved. Your account remains available; sign in and retry the vendor application.");
}
