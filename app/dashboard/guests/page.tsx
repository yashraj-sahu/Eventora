"use client";

import { useState } from "react";
import { useEvntoraStore } from "@/lib/store";
import { GuestItem } from "@/types";
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Utensils,
  Search,
} from "lucide-react";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export default function GuestManagementPage() {
  const { activeEvent, activeGuests, addGuest, updateGuest, deleteGuest } = useEvntoraStore();

  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");
  const [filterRsvp, setFilterRsvp] = useState("All");

  // New guest modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [group, setGroup] = useState<GuestItem["group"]>("VIP");
  const [rsvpStatus, setRsvpStatus] = useState<GuestItem["rsvpStatus"]>("pending");
  const [dietaryPreference, setDietaryPreference] = useState<GuestItem["dietaryPreference"]>("Vegetarian");
  const [plusOnes, setPlusOnes] = useState(0);
  const [tableNumber, setTableNumber] = useState("T-01");

  const totalHeadcount = activeGuests.reduce((sum, g) => sum + 1 + g.plusOnes, 0);
  const confirmedCount = activeGuests
    .filter((g) => g.rsvpStatus === "confirmed")
    .reduce((sum, g) => sum + 1 + g.plusOnes, 0);
  const pendingCount = activeGuests
    .filter((g) => g.rsvpStatus === "pending")
    .reduce((sum, g) => sum + 1 + g.plusOnes, 0);
  const declinedCount = activeGuests
    .filter((g) => g.rsvpStatus === "declined")
    .reduce((sum, g) => sum + 1 + g.plusOnes, 0);

  const filteredGuests = activeGuests.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.email && g.email.toLowerCase().includes(search.toLowerCase()));
    const matchesGroup = filterGroup === "All" || g.group === filterGroup;
    const matchesRsvp = filterRsvp === "All" || g.rsvpStatus === filterRsvp;
    return matchesSearch && matchesGroup && matchesRsvp;
  });

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    addGuest({
      eventId: activeEvent?.id || "evt-01",
      name,
      email,
      phone,
      group,
      rsvpStatus,
      dietaryPreference,
      plusOnes,
      tableNumber,
    });

    setName("");
    setEmail("");
    setPhone("+91 ");
    setPlusOnes(0);
    setShowModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
            <Users className="w-3.5 h-3.5" />
            <span>Guest Protocol & RSVP Management</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
            Guest List & Seating Protocol
          </h1>
          <p className="text-xs text-slate-400">
            Manage invitations, dietary nuances, plus-ones, and table arrangements
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Guest</span>
        </button>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Total Headcount
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-white">
            {totalHeadcount}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">
              ({activeGuests.length} invites)
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Confirmed Attendees
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-emerald-400">
            {confirmedCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Awaiting Response
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-amber-400">
            {pendingCount}
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-white/10 space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
            Regrets / Declined
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-rose-400">
            {declinedCount}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guest name or email..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <SearchableSelect label="Guest group filter" value={filterGroup} options={[{ value: "All", label: "All Guest Groups" }, ...(["VIP", "Bride's Family", "Groom's Family", "Friends", "Corporate", "General"].map((value) => ({ value, label: value })))]} onChange={setFilterGroup} />
          </div>

          <div>
            <SearchableSelect label="RSVP status filter" value={filterRsvp} options={[{ value: "All", label: "All RSVP Statuses" }, ...(["confirmed", "pending", "declined"].map((value) => ({ value, label: value })))]} onChange={setFilterRsvp} />
          </div>
        </div>
      </div>

      {/* Guest Table */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 overflow-hidden space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Guest Name</th>
                <th className="py-3 px-4">Group</th>
                <th className="py-3 px-4">RSVP Status</th>
                <th className="py-3 px-4">Dietary Nuance</th>
                <th className="py-3 px-4">Plus-Ones</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">
                    {guest.name}
                    {guest.phone && (
                      <span className="block text-[11px] text-slate-500 font-normal">
                        {guest.phone}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-300">
                      {guest.group}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        guest.rsvpStatus === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : guest.rsvpStatus === "declined"
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {guest.rsvpStatus}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Utensils className="w-3 h-3 text-amber-400" />
                      <span>{guest.dietaryPreference || "Standard"}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">+{guest.plusOnes}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {guest.tableNumber || "TBD"}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => deleteGuest(guest.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove guest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Guest Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-8 rounded-3xl glass-dropdown border border-amber-500/40 shadow-2xl space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-serif font-bold text-white">Add Guest to Protocol</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGuest} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Guest Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. K. N. Singhal"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableSelect label="Group affiliation" value={group} options={["VIP", "Bride's Family", "Groom's Family", "Friends", "Corporate", "General"].map((value) => ({ value, label: value }))} onChange={(value) => setGroup(value as GuestItem["group"])} allowCustom customLabel="Use group" />
                </div>

                <div>
                  <SearchableSelect label="RSVP Status" value={rsvpStatus} options={["confirmed", "pending", "declined"].map((value) => ({ value, label: value }))} onChange={(value) => setRsvpStatus(value as GuestItem["rsvpStatus"])} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <SearchableSelect label="Dietary Preference" value={dietaryPreference ?? ""} options={[{ value: "Vegetarian", label: "Strict Vegetarian" }, { value: "Jain", label: "Jain (No Root Veg)" }, { value: "Non-Vegetarian", label: "Non-Vegetarian" }, { value: "Vegan", label: "Vegan" }]} onChange={(value) => setDietaryPreference(value as GuestItem["dietaryPreference"])} allowCustom customLabel="Use preference" />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Plus-Ones</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={plusOnes}
                    onChange={(e) => setPlusOnes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Table</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="e.g. Table 04 / Royal Courtyard"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold"
                >
                  Add Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

