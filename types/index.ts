export type UserRole = "customer" | "vendor" | "admin";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  city?: string;
  avatarUrl?: string;
}

export type EventCategory =
  | "Weddings"
  | "Engagements"
  | "Birthdays"
  | "Anniversaries"
  | "Corporate events"
  | "Private parties"
  | "Baby showers"
  | "Other celebrations";

export type VendorCategory =
  | "Venues"
  | "Photographers"
  | "Caterers"
  | "Decorators"
  | "Makeup artists"
  | "DJs"
  | "Event planners"
  | "Florists"
  | "Entertainment providers";

export interface EventItem {
  id: string;
  title: string;
  category: EventCategory;
  city: string;
  date: string;
  guestCount: number;
  totalBudget: number;
  venuePreference?: string;
  styleTheme?: string;
  status: "planning" | "confirmed" | "completed";
  createdAt: string;
  blueprint?: AIEventBlueprint;
}

export interface BudgetAllocationItem {
  category: string;
  percentage: number;
  allocatedAmount: number;
  actualSpent: number;
  notes?: string;
}

export interface ExpenseItem {
  id: string;
  eventId: string;
  title: string;
  category: string;
  vendorName?: string;
  amount: number;
  status: "paid" | "pending" | "due";
  dueDate?: string;
}

export interface GuestItem {
  id: string;
  eventId: string;
  name: string;
  email?: string;
  phone?: string;
  group: "VIP" | "Bride's Family" | "Groom's Family" | "Friends" | "Corporate" | "General";
  rsvpStatus: "confirmed" | "pending" | "declined";
  dietaryPreference?: "Vegetarian" | "Jain" | "Non-Vegetarian" | "Vegan";
  plusOnes: number;
  tableNumber?: string;
}

export interface ChecklistItem {
  id: string;
  eventId: string;
  task: string;
  category: string;
  timelineStage: "3+ Months Out" | "1 Month Out" | "2 Weeks Out" | "1 Week Out" | "Day Of Event";
  completed: boolean;
  dueDate?: string;
  assignedTo?: string;
}

export interface TimelineMilestone {
  time: string;
  activity: string;
  location: string;
  responsiblePerson: string;
  notes: string;
}

export interface AIEventBlueprint {
  blueprintId: string;
  title: string;
  executiveSummary: string;
  themeAndAtmosphere: {
    themeName: string;
    colorPalette: { name: string; hex: string }[];
    designNotes: string;
  };
  recommendedBudget: {
    total: number;
    breakdown: { category: string; percentage: number; amount: number; description: string }[];
  };
  venueRecommendations: {
    name: string;
    city: string;
    type: string;
    capacity: string;
    estimatedCost: string;
    highlight: string;
  }[];
  culinaryStrategy: {
    cuisineStyle: string;
    recommendedCounters: string[];
    beverageHighlights: string[];
  };
  decorAndFloral: {
    mandapOrStage: string;
    lightingConcept: string;
    floralSelections: string[];
  };
  photographyGuidelines: {
    coverageType: string;
    mustHaveShots: string[];
  };
  entertainmentProgram: {
    welcomeAct: string;
    mainPerformances: string[];
    afterParty: string;
  };
  runOfShowTimeline: TimelineMilestone[];
  planningChecklist: { task: string; timeframe: string }[];
  culturalAndLogisticalReminders: string[];
}

export interface Vendor {
  id: string;
  claimable?: boolean;
  name: string;
  category: VendorCategory;
  city: string;
  rating: number | null;
  reviewCount: number | null;
  priceRange: string | null;
  startingPrice: number | null;
  priceUnit: "per day" | "per plate" | "per event" | "package";
  coverImage: string | null;
  galleryImages: string[];
  isVerified: boolean;
  isFeatured?: boolean;
  shortBio: string;
  description: string;
  services: string[];
  experienceYears: number;
  pastEventsCount: number;
  contactPhone: string;
  contactEmail: string;
  address: string;
  packages: {
    id?: string;
    name: string;
    price: number;
    features: string[];
  }[];
}

export type VendorItem = Vendor;

/**
 * Vendor profile as returned from the real Supabase marketplace API.
 * Maps directly to the `vendor_profiles` table with joined relations.
 */
export interface MarketplaceVendor {
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
  price_range: string;
  experience_years: number;
  past_events_count: number;
  is_verified: boolean;
  is_featured: boolean;
  is_published: boolean;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  created_at: string;
  updated_at: string;
  vendor_services?: MarketplaceVendorService[];
  vendor_packages?: MarketplaceVendorPackage[];
  vendor_portfolio?: MarketplaceVendorPortfolio[];
}

export interface MarketplaceVendorService {
  id: string;
  vendor_profile_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface MarketplaceVendorPackage {
  id: string;
  vendor_profile_id: string;
  name: string;
  description: string | null;
  price: number;
  price_display: string | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export interface MarketplaceVendorPortfolio {
  id: string;
  vendor_profile_id: string;
  storage_path: string;
  public_url: string | null;
  caption: string | null;
  sort_order: number;
}

/**
 * Converts a MarketplaceVendor (from DB) to the legacy Vendor shape
 * used by existing UI components like BookingModal and vendor cards.
 */
export function marketplaceVendorToLegacy(mv: MarketplaceVendor): VendorItem {
  return {
    id: mv.id,
    claimable: mv.user_id === null,
    name: mv.business_name,
    category: mv.business_category as VendorCategory,
    city: mv.city,
    rating: null,
    reviewCount: null,
    priceRange: mv.price_range,
    startingPrice: mv.starting_price > 0 ? mv.starting_price : null,
    priceUnit: (mv.price_unit || "per event") as Vendor["priceUnit"],
    coverImage: mv.cover_image_url || mv.vendor_portfolio?.[0]?.public_url || null,
    galleryImages: mv.vendor_portfolio?.map((p) => p.public_url || "").filter(Boolean) || [],
    isVerified: mv.is_verified,
    isFeatured: mv.is_featured,
    shortBio: mv.short_bio || mv.business_description?.slice(0, 120) || "",
    description: mv.business_description || "",
    services: mv.vendor_services?.map((s) => s.name) || [],
    experienceYears: mv.experience_years,
    pastEventsCount: mv.past_events_count,
    contactPhone: mv.contact_phone || "",
    contactEmail: mv.contact_email || "",
    address: mv.address || mv.city,
    packages:
      mv.vendor_packages?.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price / 100,
        features: Array.isArray(p.features) ? p.features : [],
      })) || [],
  };
}

export interface VendorEnquiry {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorCategory: VendorCategory;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  estimatedBudget: number;
  message: string;
  status: "new" | "replied" | "booked" | "declined";
  createdAt: string;
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  tagline: string;
  image: string;
  venueCount: number;
  featuredVenue: string;
  popularFor: string[];
}

export interface BookingRecord {
  id: string;
  booking_reference: string;
  customer_id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  package_name?: string | null;
  event_date: string;
  event_city: string;
  guest_count?: number | null;
  total_amount: number; // in paise
  advance_amount: number; // in paise
  paid_amount: number; // in paise
  currency: string;
  status: "draft" | "pending_vendor_confirmation" | "awaiting_payment" | "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export interface PaymentItem {
  id: string;
  booking_id: string;
  customer_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  amount: number; // in paise
  currency: string;
  status: "created" | "captured" | "failed" | "refunded";
  purpose: "advance" | "remaining" | "full";
  payment_method?: string | null;
  verified_at?: string | null;
  created_at: string;
}

