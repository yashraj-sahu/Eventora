import type { EventCategory, VendorCategory } from "../types";

export interface EventCategoryInfo {
  id: EventCategory;
  name: string;
  tagline: string;
  description: string;
  image: string;
  avgBudgetRange: string;
  typicalGuestRange: string;
  accentColor: string;
}

export const EVENT_CATEGORIES: EventCategoryInfo[] = [
  {
    id: "Weddings",
    name: "Weddings & Royal Celebrations",
    tagline: "Multiday Indian wedding spectacles",
    description: "From Mehendi, Sangeet, and Baraat to the sacred Pheras and Grand Reception, orchestrated to absolute royal perfection.",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    avgBudgetRange: "₹25 Lakhs - ₹5+ Crores",
    typicalGuestRange: "250 - 1,200 Guests",
    accentColor: "from-amber-500/20 to-amber-700/30",
  },
  {
    id: "Engagements",
    name: "Engagements & Ring Ceremonies",
    tagline: "Intimate and sparkling promises",
    description: "Curated ring exchanges with elegant floral arches, bespoke lighting, acoustic entertainment, and culinary feasts.",
    image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80",
    avgBudgetRange: "₹5 Lakhs - ₹25 Lakhs",
    typicalGuestRange: "80 - 250 Guests",
    accentColor: "from-rose-500/20 to-rose-700/30",
  },
  {
    id: "Corporate events",
    name: "Corporate Summits & Galas",
    tagline: "High-impact brand experiences",
    description: "Product launches, annual leadership summits, awards nights, and CXO dinners with state-of-the-art AV and flawless execution.",
    image: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    avgBudgetRange: "₹10 Lakhs - ₹1+ Crore",
    typicalGuestRange: "150 - 1,000 Guests",
    accentColor: "from-blue-500/20 to-blue-700/30",
  },
  {
    id: "Birthdays",
    name: "Luxury Milestone Birthdays",
    tagline: "Unforgettable milestone celebrations",
    description: "Themed 1st birthdays, Sweet 16s, 30th bashes, and 50th golden jubilee galas with bespoke entertainment, mixology, and decor.",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80",
    avgBudgetRange: "₹3 Lakhs - ₹15 Lakhs",
    typicalGuestRange: "50 - 200 Guests",
    accentColor: "from-purple-500/20 to-purple-700/30",
  },
  {
    id: "Anniversaries",
    name: "Silver & Golden Anniversaries",
    tagline: "Celebrating enduring love & legacy",
    description: "Vow renewals, family reunion dinners, and vintage-themed soirees honoring lifetime milestones of companionship.",
    image: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1200&q=80",
    avgBudgetRange: "₹5 Lakhs - ₹30 Lakhs",
    typicalGuestRange: "75 - 300 Guests",
    accentColor: "from-[#B77A36]/20 to-[#681B1D]/30",
  },
  {
    id: "Private parties",
    name: "Sundowners & Cocktail Soirées",
    tagline: "Exclusive private gatherings",
    description: "Rooftop lounge nights, beachfront villa gatherings, yacht parties, and private dinners with live DJ sets and molecular bars.",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    avgBudgetRange: "₹2 Lakhs - ₹10 Lakhs",
    typicalGuestRange: "30 - 120 Guests",
    accentColor: "from-[#EAD2B0]/35 to-[#681B1D]/30",
  },
];

export interface VendorCategoryInfo {
  id: VendorCategory;
  name: string;
  iconName: string;
  description: string;
}

export const VENDOR_CATEGORIES: VendorCategoryInfo[] = [
  { id: "Venues", name: "Venues & Palaces", iconName: "Building2", description: "Royal palaces, 5-star ballrooms, beach resorts & farmhouses" },
  { id: "Photographers", name: "Cinematography & Photos", iconName: "Camera", description: "Editorial wedding photographers & documentary cinematographers" },
  { id: "Caterers", name: "Gourmet Catering & Chefs", iconName: "Utensils", description: "Master culinary teams, royal thalis & global fusion live counters" },
  { id: "Decorators", name: "Haute Decor & Production", iconName: "Palette", description: "Floral arch sculptors, thematic stage designers & lighting engineers" },
  { id: "Makeup artists", name: "Bridal & Glamour Styling", iconName: "Sparkles", description: "Celebrity bridal makeup artists, hair stylists & draping experts" },
  { id: "DJs", name: "DJs & Sound Systems", iconName: "Disc", description: "Chart-topping Bollywood, electronic, and retro celebration DJs" },
  { id: "Event planners", name: "Bespoke Planners", iconName: "CalendarDays", description: "Full-service luxury wedding planners & turnkey event producers" },
  { id: "Florists", name: "Botanical & Floral Artists", iconName: "Flower2", description: "Imported exotic blooms, fragrant Indian marigolds & installations" },
  { id: "Entertainment providers", name: "Live Artists & Bands", iconName: "Music", description: "Sufi ensembles, dhol players, celebrity performers & anchor hosts" },
];

