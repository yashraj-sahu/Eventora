"use client";

import { useEffect, useState } from "react";
import {
  EventItem,
  ExpenseItem,
  GuestItem,
  ChecklistItem,
  VendorEnquiry,
  UserProfile,
} from "@/types";
import { generateAIBlueprint } from "@/data/sampleBlueprints";
import { SAMPLE_VENDORS } from "@/data/vendors";

const DEMO_STORAGE_KEY = "evntora_demo_store_v1";

export interface DemoStoreState {
  currentUser: UserProfile;
  events: EventItem[];
  activeEventId: string;
  expenses: ExpenseItem[];
  guests: GuestItem[];
  checklist: ChecklistItem[];
  enquiries: VendorEnquiry[];
  savedVendorIds: string[];
}

const DEFAULT_EVENT_1: EventItem = {
  id: "evt-01",
  title: "Aarav & Ananya Royal Destination Wedding",
  category: "Weddings",
  city: "Udaipur",
  date: "2026-11-20",
  guestCount: 350,
  totalBudget: 4500000,
  venuePreference: "The Oberoi Udaivilas",
  styleTheme: "Royal Mewari Heritage",
  status: "planning",
  createdAt: "2026-10-15T10:00:00Z",
  blueprint: generateAIBlueprint({
    category: "Weddings",
    city: "Udaipur",
    date: "2026-11-20",
    guestCount: 350,
    totalBudget: 4500000,
    venuePreference: "The Oberoi Udaivilas",
    styleTheme: "Royal Mewari Heritage",
  }),
};

const DEFAULT_EVENT_2: EventItem = {
  id: "evt-02",
  title: "NextGen AI & Cloud Summit 2026",
  category: "Corporate events",
  city: "Bengaluru",
  date: "2026-12-05",
  guestCount: 500,
  totalBudget: 3000000,
  venuePreference: "The Leela Palace Bengaluru",
  styleTheme: "Minimalist High-Impact Tech Gala",
  status: "confirmed",
  createdAt: "2026-10-20T14:30:00Z",
  blueprint: generateAIBlueprint({
    category: "Corporate events",
    city: "Bengaluru",
    date: "2026-12-05",
    guestCount: 500,
    totalBudget: 3000000,
    venuePreference: "The Leela Palace Bengaluru",
    styleTheme: "Minimalist High-Impact Tech Gala",
  }),
};

const INITIAL_EXPENSES: ExpenseItem[] = [
  { id: "exp-01", eventId: "evt-01", title: "Venue Advance Deposit", category: "Venue", vendorName: "The Oberoi Udaivilas", amount: 1500000, status: "paid" },
  { id: "exp-02", eventId: "evt-01", title: "Catering Booking Token", category: "Catering", vendorName: "Maharaja Rasoi", amount: 400000, status: "paid" },
  { id: "exp-03", eventId: "evt-01", title: "Cinematography Advance", category: "Photography", vendorName: "ShutterBespoke Studios", amount: 200000, status: "paid" },
  { id: "exp-04", eventId: "evt-01", title: "Floral Mandap Fabrication", category: "Decor", vendorName: "Bloom & Grandeur", amount: 350000, status: "pending", dueDate: "2026-11-05" },
  { id: "exp-05", eventId: "evt-01", title: "Sangeet DJ & Sound System", category: "Entertainment", vendorName: "DJ Rohit", amount: 180000, status: "due", dueDate: "2026-11-10" },
];

const INITIAL_GUESTS: GuestItem[] = [
  { id: "gst-01", eventId: "evt-01", name: "Vikramaditya Singhania", email: "vikram@singhania.demo", phone: "+91 98200 11223", group: "VIP", rsvpStatus: "confirmed", dietaryPreference: "Vegetarian", plusOnes: 1, tableNumber: "T-01" },
  { id: "gst-02", eventId: "evt-01", name: "Meera & Rajesh Kapoor", email: "meera.kapoor@demo.com", phone: "+91 98110 33445", group: "Bride's Family", rsvpStatus: "confirmed", dietaryPreference: "Vegetarian", plusOnes: 2, tableNumber: "T-02" },
  { id: "gst-03", eventId: "evt-01", name: "Col. Sanjeev Varma", email: "sanjeev.v@demo.com", phone: "+91 98711 55667", group: "Groom's Family", rsvpStatus: "confirmed", dietaryPreference: "Non-Vegetarian", plusOnes: 1, tableNumber: "T-03" },
  { id: "gst-04", eventId: "evt-01", name: "Rohan & Tara Oberoi", email: "rohan@oberoigroup.demo", phone: "+91 99201 77889", group: "Friends", rsvpStatus: "pending", dietaryPreference: "Vegetarian", plusOnes: 1 },
  { id: "gst-05", eventId: "evt-01", name: "Pooja Hegde & Family", email: "pooja.h@demo.com", phone: "+91 98330 99001", group: "Bride's Family", rsvpStatus: "declined", dietaryPreference: "Vegetarian", plusOnes: 0 },
];

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: "chk-01", eventId: "evt-01", task: "Confirm lake-view palace reservation and sign agreement", category: "Venue", timelineStage: "3+ Months Out", completed: true, dueDate: "2026-08-15" },
  { id: "chk-02", eventId: "evt-01", task: "Finalize Royal Mewari theme moodboard and floral stage design", category: "Decor", timelineStage: "3+ Months Out", completed: true, dueDate: "2026-09-01" },
  { id: "chk-03", eventId: "evt-01", task: "Book 4K cinematographers and schedule pre-wedding shoot", category: "Photography", timelineStage: "3+ Months Out", completed: true, dueDate: "2026-09-15" },
  { id: "chk-04", eventId: "evt-01", task: "Send digital invitations with QR RSVP codes", category: "Guests", timelineStage: "1 Month Out", completed: true, dueDate: "2026-10-20" },
  { id: "chk-05", eventId: "evt-01", task: "Conduct food and cocktail menu tasting with master chefs", category: "Catering", timelineStage: "1 Month Out", completed: false, dueDate: "2026-11-02" },
  { id: "chk-06", eventId: "evt-01", task: "Verify song list and music clearances with DJ Rohit", category: "Entertainment", timelineStage: "2 Weeks Out", completed: false, dueDate: "2026-11-08" },
  { id: "chk-07", eventId: "evt-01", task: "Assign hotel room allocations and airport transfer schedule", category: "Logistics", timelineStage: "1 Week Out", completed: false, dueDate: "2026-11-14" },
  { id: "chk-08", eventId: "evt-01", task: "Final walkthrough of mandap lighting and sound check", category: "Production", timelineStage: "Day Of Event", completed: false, dueDate: "2026-11-20" },
];

const INITIAL_ENQUIRIES: VendorEnquiry[] = [
  {
    id: "enq-01",
    vendorId: "v-01",
    vendorName: "The Oberoi Udaivilas",
    vendorCategory: "Venues",
    clientName: "Ananya & Aarav",
    clientEmail: "ananya.sharma@demo.com",
    clientPhone: "+91 98200 44556",
    eventType: "Royal Wedding",
    eventDate: "2026-11-20",
    guestCount: 350,
    estimatedBudget: 4500000,
    message: "Inquiring about 3-day wedding residency package with exclusive use of lakeside lawns.",
    status: "booked",
    createdAt: "2026-10-16T12:00:00Z",
  },
  {
    id: "enq-02",
    vendorId: "v-04",
    vendorName: "Bloom & Grandeur Haute Decor",
    vendorCategory: "Decorators",
    clientName: "Ananya & Aarav",
    clientEmail: "ananya.sharma@demo.com",
    clientPhone: "+91 98200 44556",
    eventType: "Wedding & Sangeet",
    eventDate: "2026-11-20",
    guestCount: 350,
    estimatedBudget: 850000,
    message: "Requesting custom 3D floral mandap and glasshouse sangeet lighting proposal.",
    status: "replied",
    createdAt: "2026-10-18T16:20:00Z",
  },
];

const INITIAL_STATE: DemoStoreState = {
  currentUser: {
    id: "usr-demo-01",
    name: "Ananya Sharma",
    email: "ananya.sharma@demo.evntora.com",
    role: "customer",
    phone: "+91 98200 44556",
    city: "Mumbai / Udaipur",
  },
  events: [DEFAULT_EVENT_1, DEFAULT_EVENT_2],
  activeEventId: "evt-01",
  expenses: INITIAL_EXPENSES,
  guests: INITIAL_GUESTS,
  checklist: INITIAL_CHECKLIST,
  enquiries: INITIAL_ENQUIRIES,
  savedVendorIds: ["v-01", "v-02", "v-04"],
};

export function getInitialStoreState(): DemoStoreState {
  if (typeof window === "undefined") {
    return INITIAL_STATE;
  }
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not read demo storage, using default state", e);
  }
  return INITIAL_STATE;
}

export function saveStoreState(state: DemoStoreState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Could not save demo state", e);
  }
}

export function resetDemoState(): DemoStoreState {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_STORAGE_KEY);
  }
  return INITIAL_STATE;
}

/**
 * Custom React hook for unified demo state with reactive updates
 */
export function useEvntoraStore() {
  const [state, setState] = useState<DemoStoreState>(getInitialStoreState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loaded = getInitialStoreState();
    setState(loaded);
  }, []);

  const updateStore = (updater: (prev: DemoStoreState) => DemoStoreState) => {
    setState((prev) => {
      const next = updater(prev);
      saveStoreState(next);
      return next;
    });
  };

  const activeEvent = state.events.find((e) => e.id === state.activeEventId) || state.events[0];
  const activeExpenses = state.expenses.filter((exp) => exp.eventId === state.activeEventId);
  const activeGuests = state.guests.filter((gst) => gst.eventId === state.activeEventId);
  const activeChecklist = state.checklist.filter((chk) => chk.eventId === state.activeEventId);

  // Helper actions
  const addEvent = (eventData: Omit<EventItem, "id" | "createdAt">) => {
    const newId = `evt-${Date.now().toString().slice(-4)}`;
    const newEvent: EventItem = {
      ...eventData,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    updateStore((prev) => ({
      ...prev,
      events: [newEvent, ...prev.events],
      activeEventId: newId,
    }));
    return newEvent;
  };

  const setActiveEventId = (id: string) => {
    updateStore((prev) => ({ ...prev, activeEventId: id }));
  };

  const addExpense = (expense: Omit<ExpenseItem, "id">) => {
    const newExpense: ExpenseItem = {
      ...expense,
      id: `exp-${Date.now().toString().slice(-4)}`,
    };
    updateStore((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
  };

  const deleteExpense = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  const addGuest = (guest: Omit<GuestItem, "id">) => {
    const newGuest: GuestItem = {
      ...guest,
      id: `gst-${Date.now().toString().slice(-4)}`,
    };
    updateStore((prev) => ({
      ...prev,
      guests: [newGuest, ...prev.guests],
    }));
  };

  const updateGuest = (id: string, updates: Partial<GuestItem>) => {
    updateStore((prev) => ({
      ...prev,
      guests: prev.guests.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  };

  const deleteGuest = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      guests: prev.guests.filter((g) => g.id !== id),
    }));
  };

  const toggleChecklist = (id: string) => {
    updateStore((prev) => ({
      ...prev,
      checklist: prev.checklist.map((c) =>
        c.id === id ? { ...c, completed: !c.completed } : c
      ),
    }));
  };

  const addChecklistTask = (task: Omit<ChecklistItem, "id">) => {
    const newTask: ChecklistItem = {
      ...task,
      id: `chk-${Date.now().toString().slice(-4)}`,
    };
    updateStore((prev) => ({
      ...prev,
      checklist: [...prev.checklist, newTask],
    }));
  };

  const toggleSaveVendor = (vendorId: string) => {
    updateStore((prev) => {
      const exists = prev.savedVendorIds.includes(vendorId);
      return {
        ...prev,
        savedVendorIds: exists
          ? prev.savedVendorIds.filter((id) => id !== vendorId)
          : [...prev.savedVendorIds, vendorId],
      };
    });
  };

  const addEnquiry = (enquiry: Omit<VendorEnquiry, "id" | "createdAt" | "status">) => {
    const newEnquiry: VendorEnquiry = {
      ...enquiry,
      id: `enq-${Date.now().toString().slice(-4)}`,
      status: "new",
      createdAt: new Date().toISOString(),
    };
    updateStore((prev) => ({
      ...prev,
      enquiries: [newEnquiry, ...prev.enquiries],
    }));
    return newEnquiry;
  };

  const switchRole = (role: "customer" | "vendor" | "admin") => {
    updateStore((prev) => ({
      ...prev,
      currentUser: {
        ...prev.currentUser,
        role,
        name:
          role === "vendor"
            ? "The Oberoi Udaivilas (Partner)"
            : role === "admin"
            ? "Evntora Platform Admin"
            : "Ananya Sharma",
        email:
          role === "vendor"
            ? "partner@oberoigroup.demo"
            : role === "admin"
            ? "admin@evntora.com"
            : "ananya.sharma@demo.evntora.com",
      },
    }));
  };

  return {
    state,
    mounted,
    activeEvent,
    activeExpenses,
    activeGuests,
    activeChecklist,
    savedVendors: SAMPLE_VENDORS.filter((v) => state.savedVendorIds.includes(v.id)),
    addEvent,
    setActiveEventId,
    addExpense,
    deleteExpense,
    addGuest,
    updateGuest,
    deleteGuest,
    toggleChecklist,
    addChecklistTask,
    toggleSaveVendor,
    addEnquiry,
    switchRole,
    resetToDefault: () => {
      const fresh = resetDemoState();
      setState(fresh);
    },
  };
}

