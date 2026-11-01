"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

type Service = Database["public"]["Tables"]["vendor_services"]["Row"];
type Package = Database["public"]["Tables"]["vendor_packages"]["Row"];
type PortfolioImage = Database["public"]["Tables"]["vendor_portfolio"]["Row"];

export function VendorCatalogManager({ vendorId }: { vendorId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [name, setName] = useState(""); const [description, setDescription] = useState("");
  const [price, setPrice] = useState(""); const [features, setFeatures] = useState("");
  const [editing, setEditing] = useState<{ id: string; kind: "service" | "package" } | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const refresh = async () => {
    const [s, p, i] = await Promise.all([
      supabase.from("vendor_services").select("*").eq("vendor_profile_id", vendorId).order("sort_order"),
      supabase.from("vendor_packages").select("*").eq("vendor_profile_id", vendorId).order("sort_order"),
      supabase.from("vendor_portfolio").select("*").eq("vendor_profile_id", vendorId).order("sort_order"),
    ]);
    setServices(s.data ?? []); setPackages(p.data ?? []); setPortfolio(i.data ?? []);
  };
  useEffect(() => { void refresh(); }, [vendorId]);
  const saveItem = async (kind: "service" | "package") => {
    setBusy(true); setMessage("");
    const response = await fetch("/api/vendors/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId, kind, ...(editing?.kind === kind ? { id: editing.id } : {}), name, description, ...(kind === "package" ? { price: Math.round(Number(price) * 100), features: features.split("\n") } : {}) }) });
    const data = await response.json(); setMessage(response.ok ? "Saved" : data.error || "Unable to save");
    if (response.ok) { setName(""); setDescription(""); setPrice(""); setFeatures(""); setEditing(null); await refresh(); }
    setBusy(false);
  };
  const toggleItem = async (kind: "service" | "package", id: string, active: boolean) => {
    const response = await fetch("/api/vendors/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vendorId, kind, id, action: active ? "deactivate" : "activate" }) });
    if (response.ok) await refresh();
  };
  const editService = (item: Service) => { setEditing({ id: item.id, kind: "service" }); setName(item.name); setDescription(item.description || ""); };
  const editPackage = (item: Package) => { setEditing({ id: item.id, kind: "package" }); setName(item.name); setDescription(item.description || ""); setPrice(String(item.price / 100)); setFeatures(Array.isArray(item.features) ? item.features.join("\n") : ""); };
  const upload = async (file: File) => {
    setBusy(true); setMessage(""); const body = new FormData(); body.set("vendorId", vendorId); body.set("file", file);
    const response = await fetch("/api/vendors/portfolio", { method: "POST", body }); const data = await response.json();
    setMessage(response.ok ? "Image uploaded" : data.error || "Unable to upload image"); if (response.ok) await refresh(); setBusy(false);
  };
  const removeImage = async (id: string) => {
    const response = await fetch("/api/vendors/portfolio", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const data = await response.json(); if (!response.ok) setMessage(data.error || "Unable to delete image"); else await refresh();
  };
  const inputClass = "w-full rounded-xl border border-[#E8E2D7] dark:border-[#344139] bg-[#FAF8F3] dark:bg-[#1C2520] px-3 py-2 text-sm";
  return <div className="space-y-6">
    {!vendorId && <p>No vendor profile is linked to this account yet.</p>}
    {vendorId && <>
      <section className="rounded-2xl border border-[#E8E2D7] dark:border-[#344139] p-5 space-y-3"><h3 className="font-semibold">{editing?.kind === "service" ? "Edit service" : "Add service"}</h3><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Service name"/><textarea className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Service description"/><button disabled={busy || !name.trim()} onClick={() => void saveItem("service")} className="rounded-xl bg-[#173F35] px-4 py-2 text-white disabled:opacity-50">Save service</button>
      <ul className="space-y-2">{services.map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm"><span><b>{item.name}</b> {item.description} {!item.is_active && "(inactive)"}</span><span className="flex gap-2"><button onClick={() => editService(item)} className="text-[#173F35]">Edit</button><button onClick={() => void toggleItem("service", item.id, item.is_active)} className="text-rose-600">{item.is_active ? "Deactivate" : "Reactivate"}</button></span></li>)}</ul></section>
      <section className="rounded-2xl border border-[#E8E2D7] dark:border-[#344139] p-5 space-y-3"><h3 className="font-semibold">{editing?.kind === "package" ? "Edit package" : "Add package"}</h3><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Package name"/><textarea className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Package description"/><input className={inputClass} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price in ₹"/><textarea className={inputClass} value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="Included features, one per line"/><button disabled={busy || !name.trim() || !price} onClick={() => void saveItem("package")} className="rounded-xl bg-[#173F35] px-4 py-2 text-white disabled:opacity-50">Save package</button>
      <ul className="space-y-2">{packages.map((item) => <li key={item.id} className="flex justify-between gap-3 text-sm"><span><b>{item.name}</b> · ₹{(item.price / 100).toLocaleString("en-IN")} {item.description} {!item.is_active && "(inactive)"}</span><span className="flex gap-2"><button onClick={() => editPackage(item)} className="text-[#173F35]">Edit</button><button onClick={() => void toggleItem("package", item.id, item.is_active)} className="text-rose-600">{item.is_active ? "Deactivate" : "Reactivate"}</button></span></li>)}</ul></section>
      <section className="rounded-2xl border border-[#E8E2D7] dark:border-[#344139] p-5 space-y-3"><h3 className="font-semibold">Portfolio images</h3><input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.currentTarget.value = ""; }}/><div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{portfolio.map((item) => <div key={item.id} className="space-y-1"><img src={item.public_url || ""} alt={item.caption || "Portfolio"} className="h-24 w-full rounded-xl object-cover"/><button onClick={() => void removeImage(item.id)} className="text-xs text-rose-600">Delete</button></div>)}</div></section>
      {message && <p role="status" className="text-sm">{message}</p>}
    </>}
  </div>;
}
