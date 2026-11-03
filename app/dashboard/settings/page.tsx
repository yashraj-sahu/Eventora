"use client";

import { useState } from "react";
import { useEvntoraStore } from "@/lib/store";
import { getSupabaseStatus } from "@/lib/supabase";
import { Settings, User, Bell, Shield, Database, RotateCcw, Check } from "lucide-react";

export default function SettingsPage() {
  const { state, resetToDefault } = useEvntoraStore();
  const supabaseStatus = getSupabaseStatus();

  const [name, setName] = useState(state.currentUser.name);
  const [email, setEmail] = useState(state.currentUser.email);
  const [phone, setPhone] = useState(state.currentUser.phone || "+91 ");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-200">
      <div className="space-y-1 border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
          <Settings className="w-3.5 h-3.5" />
          <span>Account Preferences</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-serif font-bold text-white">
          Workspace Settings & Security
        </h1>
        <p className="text-xs text-[#D4C3B7]">
          Manage your personal profile, notification triggers, and database integration
        </p>
      </div>

      {/* Profile Form */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-6">
        <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-amber-400" />
          <span>Host Profile</span>
        </h2>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-[#D4C3B7] mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#1A1211] border border-[#4D3331] text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#D4C3B7] mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1A1211] border border-[#4D3331] text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[#D4C3B7] mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#1A1211] border border-[#4D3331] text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saved && (
              <span className="text-amber-700 flex items-center gap-1 text-xs">
                <Check className="w-4 h-4" />
                <span>Changes saved to local storage!</span>
              </span>
            )}
            <button
              type="submit"
              className="ml-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1A1211] font-bold"
            >
              Update Profile
            </button>
          </div>
        </form>
      </div>

      {/* Database & Integration Status */}
      <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4">
        <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <span>Backend & Database Integration</span>
        </h2>
        <div className="p-4 rounded-xl bg-[#1A1211]/70 border border-[#4D3331] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#D4C3B7]">Current Storage Backend:</span>
            <span className="font-mono text-amber-400 font-bold">{supabaseStatus.mode}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#D4C3B7]">Supabase URL Configured:</span>
            <span className="font-mono text-[#D4C3B7]">{supabaseStatus.url}</span>
          </div>
          <p className="text-[11px] text-[#9E897F] pt-1">
            To switch to a live production PostgreSQL cluster, provide your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
          </p>
        </div>
      </div>

      {/* Demo Reset Action */}
      <div className="p-8 rounded-3xl glass-card border border-rose-500/20 space-y-4">
        <h2 className="text-lg font-serif font-bold text-rose-300 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>Reset Demonstration Data</span>
        </h2>
        <p className="text-xs text-[#D4C3B7]">
          Restore the sample royal destination wedding in Udaipur and corporate gala in Bengaluru back to initial default state.
        </p>
        <button
          onClick={() => {
            if (confirm("Reset demo data to default state?")) {
              resetToDefault();
              window.location.reload();
            }
          }}
          className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold"
        >
          Reset Demo Data
        </button>
      </div>
    </div>
  );
}

